import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { computePayrollItem } from "@/lib/payroll-computation";
import type { DTRRecord, AllowanceInput, LoanInput, OvertimeInput } from "@/lib/payroll-computation";

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      return { userId: user.id, companyId: profile?.company_id ?? null };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null };
}

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  const supabase = getSupabaseService();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("payroll_runs")
    .select("*")
    .order("period_start", { ascending: false });

  if (ctx.companyId) query = query.eq("company_id", ctx.companyId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { period_start, period_end, pay_date, cycle } = body;

  if (!period_start || !period_end || !pay_date || !cycle) {
    return NextResponse.json(
      { error: "Missing period_start, period_end, pay_date, or cycle" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // 1. Create the payroll run
  const { data: run, error: runErr } = await supabase
    .from("payroll_runs")
    .insert({
      company_id: ctx.companyId,
      period_start,
      period_end,
      pay_date,
      cycle,
      status: "draft",
      computed_by: ctx.userId,
    })
    .select()
    .single();

  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });

  // 2. Get all active employees
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, name, position_title, pay_frequency")
    .eq("company_id", ctx.companyId)
    .eq("active", true);

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

  const warnings: string[] = [];
  const payrollItems: Record<string, unknown>[] = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  for (const emp of employees ?? []) {
    // 3a. Get current salary record
    const { data: salaryRecords } = await supabase
      .from("salary_records")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("company_id", ctx.companyId)
      .lte("effective_from", period_end)
      .or(`effective_to.is.null,effective_to.gte.${period_start}`)
      .order("effective_from", { ascending: false })
      .limit(1);

    const salary = salaryRecords?.[0];
    if (!salary) {
      const empName = emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name;
      warnings.push(`No salary record for ${empName} (${emp.employee_number})`);
      continue;
    }

    // 3b. Get DTR records for the period
    const { data: dtrData } = await supabase
      .from("daily_time_records")
      .select("date, regular_hours, night_diff_hours, late_minutes, undertime_minutes, is_rest_day, is_holiday, holiday_type")
      .eq("employee_id", emp.id)
      .eq("company_id", ctx.companyId)
      .gte("date", period_start)
      .lte("date", period_end);

    const dtrRecords: DTRRecord[] = (dtrData ?? []).map((d) => ({
      date: d.date,
      regular_hours: d.regular_hours,
      night_diff_hours: d.night_diff_hours,
      late_minutes: d.late_minutes ?? 0,
      undertime_minutes: d.undertime_minutes ?? 0,
      is_rest_day: d.is_rest_day ?? false,
      is_holiday: d.is_holiday ?? false,
      holiday_type: d.holiday_type,
    }));

    // 3b2. Get approved overtime requests for the period
    const { data: otData } = await supabase
      .from("overtime_requests")
      .select("date, ot_hours")
      .eq("employee_id", emp.id)
      .eq("company_id", ctx.companyId)
      .eq("status", "approved")
      .gte("date", period_start)
      .lte("date", period_end);

    // Cross-reference OT dates with DTR for day classification
    const overtimeRecords: OvertimeInput[] = (otData ?? []).map((ot) => {
      const matchingDtr = dtrRecords.find(d => d.date === ot.date);
      return {
        date: ot.date,
        ot_hours: Number(ot.ot_hours),
        is_rest_day: matchingDtr?.is_rest_day ?? false,
        is_holiday: matchingDtr?.is_holiday ?? false,
        holiday_type: matchingDtr?.holiday_type ?? null,
      };
    });

    // 3c. Get active allowances
    const { data: allowanceData } = await supabase
      .from("employee_allowances")
      .select("amount, frequency, allowance_type:allowance_types(is_taxable, is_de_minimis, de_minimis_limit)")
      .eq("employee_id", emp.id)
      .eq("company_id", ctx.companyId)
      .eq("active", true);

    const allowances: AllowanceInput[] = (allowanceData ?? []).map((a) => {
      // Supabase join returns object for 1:1, but TS infers array — cast via unknown
      const at = a.allowance_type as unknown as { is_taxable: boolean; is_de_minimis: boolean; de_minimis_limit: number | null } | null;
      return {
        amount: a.amount,
        frequency: a.frequency as "per_cutoff" | "monthly",
        is_taxable: at?.is_taxable ?? false,
        is_de_minimis: at?.is_de_minimis ?? false,
        de_minimis_limit: at?.de_minimis_limit ?? null,
      };
    });

    // 3d. Get active loans
    const { data: loanData } = await supabase
      .from("employee_loans")
      .select("monthly_deduction, remaining_balance")
      .eq("employee_id", emp.id)
      .eq("company_id", ctx.companyId)
      .eq("active", true)
      .gt("remaining_balance", 0);

    const loans: LoanInput[] = (loanData ?? []).map((l) => ({
      monthly_deduction: l.monthly_deduction,
    }));

    // 3e. Compute payroll
    const computed = computePayrollItem({
      basicSalary: salary.basic_salary,
      dailyRate: salary.daily_rate,
      hourlyRate: salary.hourly_rate,
      dtrRecords,
      overtimeRecords,
      allowances,
      loans,
      otherDeductions: 0,
      cycle: cycle as "semi_monthly_1" | "semi_monthly_2" | "monthly",
      payBasis: salary.pay_basis as "monthly" | "daily",
      daysPerMonth: salary.days_per_month,
    });

    payrollItems.push({
      company_id: ctx.companyId,
      payroll_run_id: run.id,
      employee_id: emp.id,
      ...computed,
    });

    totalGross += computed.gross_pay;
    totalDeductions += computed.total_deductions;
    totalNet += computed.net_pay;
  }

  // 4. Insert all payroll items
  if (payrollItems.length > 0) {
    const { error: itemsErr } = await supabase
      .from("payroll_items")
      .insert(payrollItems);

    if (itemsErr) {
      // Clean up the run if items failed
      await supabase.from("payroll_runs").delete().eq("id", run.id);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }
  }

  // 5. Update run totals
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const { data: updatedRun, error: updateErr } = await supabase
    .from("payroll_runs")
    .update({
      status: "computed",
      total_gross: round2(totalGross),
      total_deductions: round2(totalDeductions),
      total_net: round2(totalNet),
      employee_count: payrollItems.length,
    })
    .eq("id", run.id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "payroll_run",
    entityId: run.id,
    changes: { employee_count: { old: null, new: payrollItems.length } },
  });

  return NextResponse.json({ run: updatedRun, warnings });
}
