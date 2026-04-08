import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { generatePayslipHTML } from "@/lib/payslip-html";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: runId } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");
  const employeeId = searchParams.get("employee_id");

  const supabase = getSupabaseService();

  // Get the payroll run
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .eq("company_id", ctx.companyId)
    .single();

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  // Get the company name
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", ctx.companyId)
    .single();

  // Get payroll item(s)
  let itemQuery = supabase
    .from("payroll_items")
    .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
    .eq("payroll_run_id", runId)
    .eq("company_id", ctx.companyId);

  if (itemId) itemQuery = itemQuery.eq("id", itemId);
  if (employeeId) itemQuery = itemQuery.eq("employee_id", employeeId);

  const { data: items, error } = await itemQuery;

  if (error || !items || items.length === 0) {
    return NextResponse.json({ error: "No payslip items found" }, { status: 404 });
  }

  // Generate HTML for all requested payslips
  const html = generatePayslipHTML({
    companyName: company?.name ?? "Company",
    periodStart: run.period_start,
    periodEnd: run.period_end,
    payableDate: run.pay_date,
    items: items.map((item) => {
      const emp = item.employee as Record<string, string> | null;
      const empName = emp?.first_name
        ? `${emp.first_name} ${emp.last_name ?? ""}`.trim()
        : emp?.name ?? "—";

      return {
        employeeNumber: emp?.employee_number ?? "—",
        employeeName: empName,
        position: emp?.position_title ?? "—",
        basicSalary: item.basic_pay,
        deMinimisAllowance: item.total_allowances,
        lateAbsences: item.late_undertime_deductions,
        adjustments: item.other_deductions,
        sss: item.sss_employee,
        philHealth: item.philhealth_employee,
        pagibig: item.pagibig_employee,
        withholdingTax: item.withholding_tax,
        grossEarnings: item.gross_pay,
        totalGovtDeductions:
          item.sss_employee + item.philhealth_employee + item.pagibig_employee + item.withholding_tax,
        netEarnings: item.net_pay,
        totalOthers: item.loan_deductions + item.other_deductions,
      };
    }),
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
