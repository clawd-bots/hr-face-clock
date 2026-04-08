import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { computePayrollItem } from "@/lib/payroll-computation";
import type { DTRRecord, AllowanceInput, LoanInput } from "@/lib/payroll-computation";

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

// GET — payroll run detail with items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  const { id } = await params;
  const supabase = getSupabaseService();

  const { data: run, error: runErr } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId ?? "")
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
  }

  const { data: items, error: itemsErr } = await supabase
    .from("payroll_items")
    .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
    .eq("payroll_run_id", id)
    .order("created_at");

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({ ...run, items: items ?? [] });
}

// PATCH — approve payroll run
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = getSupabaseService();

  // Verify run exists and is in correct state
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "approve") {
    if (run.status !== "computed") {
      return NextResponse.json(
        { error: "Can only approve computed payroll runs" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .update({
        status: "approved",
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "approve",
      entityType: "payroll_run",
      entityId: id,
      changes: { status: { old: "computed", new: "approved" } },
    });

    return NextResponse.json(data);
  }

  if (body.action === "mark_paid") {
    if (run.status !== "approved") {
      return NextResponse.json(
        { error: "Can only mark approved payroll runs as paid" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .update({ status: "paid" })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "update",
      entityType: "payroll_run",
      entityId: id,
      changes: { status: { old: "approved", new: "paid" } },
    });

    return NextResponse.json(data);
  }

  if (body.action === "recompute") {
    if (run.status !== "draft" && run.status !== "computed") {
      return NextResponse.json(
        { error: "Can only recompute draft or computed payroll runs" },
        { status: 400 }
      );
    }

    // Get the full run to know period/cycle
    const { data: fullRun } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", id)
      .single();

    if (!fullRun) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    // Delete existing items (CASCADE would handle this but be explicit)
    await supabase
      .from("payroll_items")
      .delete()
      .eq("payroll_run_id", id);

    // Re-run computation (same logic as POST /api/payroll)
    const { data: employees } = await supabase
      .from("employees")
      .select("id, employee_number, first_name, last_name, name, position_title, pay_frequency")
      .eq("company_id", ctx.companyId)
      .eq("active", true);

    const payrollItems: Record<string, unknown>[] = [];
    const warnings: string[] = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const emp of employees ?? []) {
      const { data: salaryRecords } = await supabase
        .from("salary_records")
        .select("*")
        .eq("employee_id", emp.id)
        .eq("company_id", ctx.companyId)
        .lte("effective_from", fullRun.period_end)
        .or(`effective_to.is.null,effective_to.gte.${fullRun.period_start}`)
        .order("effective_from", { ascending: false })
        .limit(1);

      const salary = salaryRecords?.[0];
      if (!salary) {
        const empName = emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name;
        warnings.push(`No salary record for ${empName} (${emp.employee_number})`);
        continue;
      }

      const { data: dtrData } = await supabase
        .from("daily_time_records")
        .select("date, regular_hours, night_diff_hours, late_minutes, undertime_minutes, is_rest_day, is_holiday, holiday_type")
        .eq("employee_id", emp.id)
        .eq("company_id", ctx.companyId)
        .gte("date", fullRun.period_start)
        .lte("date", fullRun.period_end);

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

      const { data: allowanceData } = await supabase
        .from("employee_allowances")
        .select("amount, frequency, allowance_type:allowance_types(is_taxable, is_de_minimis, de_minimis_limit)")
        .eq("employee_id", emp.id)
        .eq("company_id", ctx.companyId)
        .eq("active", true);

      const allowances: AllowanceInput[] = (allowanceData ?? []).map((a) => {
        const at = a.allowance_type as unknown as { is_taxable: boolean; is_de_minimis: boolean; de_minimis_limit: number | null } | null;
        return {
          amount: a.amount,
          frequency: a.frequency as "per_cutoff" | "monthly",
          is_taxable: at?.is_taxable ?? false,
          is_de_minimis: at?.is_de_minimis ?? false,
          de_minimis_limit: at?.de_minimis_limit ?? null,
        };
      });

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

      const computed = computePayrollItem({
        basicSalary: salary.basic_salary,
        dailyRate: salary.daily_rate,
        hourlyRate: salary.hourly_rate,
        dtrRecords,
        allowances,
        loans,
        otherDeductions: 0,
        cycle: fullRun.cycle as "semi_monthly_1" | "semi_monthly_2" | "monthly",
        payBasis: salary.pay_basis as "monthly" | "daily",
        daysPerMonth: salary.days_per_month,
      });

      payrollItems.push({
        company_id: ctx.companyId,
        payroll_run_id: id,
        employee_id: emp.id,
        ...computed,
      });

      totalGross += computed.gross_pay;
      totalDeductions += computed.total_deductions;
      totalNet += computed.net_pay;
    }

    if (payrollItems.length > 0) {
      const { error: itemsErr } = await supabase
        .from("payroll_items")
        .insert(payrollItems);
      if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const { data: updatedRun, error: updateErr } = await supabase
      .from("payroll_runs")
      .update({
        status: "computed",
        total_gross: round2(totalGross),
        total_deductions: round2(totalDeductions),
        total_net: round2(totalNet),
        employee_count: payrollItems.length,
        computed_by: ctx.userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "update",
      entityType: "payroll_run",
      entityId: id,
      changes: { status: { old: run.status, new: "computed" }, action: { old: null, new: "recompute" } },
    });

    return NextResponse.json({ run: updatedRun, warnings });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// DELETE — delete a draft/computed payroll run
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseService();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (run.status === "approved" || run.status === "paid") {
    return NextResponse.json(
      { error: "Cannot delete approved or paid payroll runs" },
      { status: 400 }
    );
  }

  // Items cascade-delete via FK, but be explicit
  await supabase.from("payroll_items").delete().eq("payroll_run_id", id);
  const { error } = await supabase.from("payroll_runs").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "delete",
    entityType: "payroll_run",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
