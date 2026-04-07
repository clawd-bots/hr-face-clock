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

/**
 * Bulk initialize leave balances for ALL active employees in the company
 * for a given year. Calls the single-employee initialization logic internally.
 */
export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { year } = body;

  if (!year) {
    return NextResponse.json({ error: "Missing year" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  // Fetch all active employees for the company
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, hire_date, gender")
    .eq("company_id", ctx.companyId)
    .eq("active", true);

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

  if (!employees || employees.length === 0) {
    return NextResponse.json({ message: "No active employees", count: 0 });
  }

  // Fetch active leave types for the company
  const { data: leaveTypes, error: ltErr } = await supabase
    .from("leave_types")
    .select("*")
    .eq("company_id", ctx.companyId)
    .eq("active", true);

  if (ltErr) return NextResponse.json({ error: ltErr.message }, { status: 500 });

  if (!leaveTypes || leaveTypes.length === 0) {
    return NextResponse.json({ message: "No active leave types", count: 0 });
  }

  const yearStart = new Date(`${year}-01-01`);
  const allBalanceRows = [];

  for (const emp of employees) {
    const hireDate = emp.hire_date ? new Date(emp.hire_date) : null;

    for (const lt of leaveTypes) {
      // Gender-specific leave check
      if (lt.gender && emp.gender && lt.gender !== emp.gender) {
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

      allBalanceRows.push({
        company_id: ctx.companyId,
        employee_id: emp.id,
        leave_type_id: lt.id,
        year,
        entitled_days: entitledDays,
        carried_over: 0,
        adjusted: 0,
        used_days: 0,
        pending_days: 0,
      });
    }
  }

  if (allBalanceRows.length === 0) {
    return NextResponse.json({ message: "No balances to create", count: 0 });
  }

  // Insert in batches of 500 to avoid payload limits
  let totalInserted = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < allBalanceRows.length; i += BATCH_SIZE) {
    const batch = allBalanceRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("leave_balances")
      .upsert(batch, { onConflict: "employee_id,leave_type_id,year", ignoreDuplicates: true })
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    totalInserted += data?.length ?? 0;
  }

  return NextResponse.json({
    count: totalInserted,
    employees: employees.length,
    leave_types: leaveTypes.length,
  });
}
