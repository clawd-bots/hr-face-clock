import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";

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
  const employeeId = searchParams.get("employee_id");
  const year = searchParams.get("year");

  let query = supabase
    .from("leave_balances")
    .select("*, leave_type:leave_types(id, name, code), employee:employees(id, name, first_name, last_name)");

  if (ctx.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }
  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }
  if (year) {
    query = query.eq("year", parseInt(year, 10));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * Initialize leave balances for a single employee for a given year.
 * Creates a balance row for each applicable active leave type,
 * with pro-rating and eligibility checks.
 */
export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employee_id, year } = body;

  if (!employee_id || !year) {
    return NextResponse.json(
      { error: "Missing employee_id or year" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Fetch employee details
  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("id, hire_date, gender")
    .eq("id", employee_id)
    .eq("company_id", ctx.companyId)
    .single();

  if (empErr || !employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Fetch active leave types for the company
  const { data: leaveTypes, error: ltErr } = await supabase
    .from("leave_types")
    .select("*")
    .eq("company_id", ctx.companyId)
    .eq("active", true);

  if (ltErr) return NextResponse.json({ error: ltErr.message }, { status: 500 });

  const balanceRows = [];
  const yearStart = new Date(`${year}-01-01`);
  const hireDate = employee.hire_date ? new Date(employee.hire_date) : null;

  for (const lt of leaveTypes ?? []) {
    // Gender-specific leave check
    if (lt.gender && employee.gender && lt.gender !== employee.gender) {
      continue;
    }

    // Minimum service months check
    if (lt.min_service_months && hireDate) {
      const monthsOfService =
        (yearStart.getFullYear() - hireDate.getFullYear()) * 12 +
        (yearStart.getMonth() - hireDate.getMonth());
      if (monthsOfService < lt.min_service_months) {
        continue;
      }
    }

    let entitledDays = lt.days_per_year ?? 0;

    // Pro-rate if employee was hired during the year
    if (lt.prorate_on_hire && hireDate && hireDate.getFullYear() === year) {
      const monthsRemaining = 12 - hireDate.getMonth();
      entitledDays = Math.round((entitledDays * monthsRemaining) / 12 * 100) / 100;
    }

    balanceRows.push({
      company_id: ctx.companyId,
      employee_id,
      leave_type_id: lt.id,
      year,
      entitled_days: entitledDays,
      carried_over: 0,
      adjusted: 0,
      used_days: 0,
      pending_days: 0,
    });
  }

  if (balanceRows.length === 0) {
    return NextResponse.json({ message: "No applicable leave types", count: 0 });
  }

  const { data, error } = await supabase
    .from("leave_balances")
    .upsert(balanceRows, { onConflict: "employee_id,leave_type_id,year", ignoreDuplicates: true })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data?.length ?? 0, data });
}
