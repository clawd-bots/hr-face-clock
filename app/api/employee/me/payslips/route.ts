import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";

export async function GET() {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("payroll_items")
    .select("*, payroll_run:payroll_runs(id, period_start, period_end, pay_date, cycle, status)")
    .eq("employee_id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
