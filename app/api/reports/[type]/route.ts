import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import {
  generateSSSReport,
  generatePhilHealthReport,
  generatePagibigReport,
  generateBIR1601C,
  generateBIR2316,
  generate13thMonthReport,
  generateBIR1604CF,
  generateSSSR5,
  generatePhilHealthER2,
  generatePagibigMCRF,
  generatePagibigLoan,
  generateHeadcountReport,
  generateAttendanceSummary,
  generateLeaveUtilization,
  generatePayrollSummary,
  generateEmployeeDirectory,
} from "@/lib/report-generators";
import { exportToCSV, exportToHTML } from "@/lib/report-export";

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
  { params }: { params: Promise<{ type: string }> }
) {
  const ctx = await getContext();
  if (!ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = await params;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
  const format = searchParams.get("format") || "json"; // json | csv | html
  const employeeId = searchParams.get("employee_id");

  const supabase = getSupabaseService();

  try {
    // Helper: fetch payroll items for a month (both cutoffs)
    async function getPayrollItemsForMonth(m: number, y: number) {
      const monthStr = `${y}-${String(m).padStart(2, "0")}`;
      const firstDay = `${monthStr}-01`;
      const lastDay = `${monthStr}-${new Date(y, m, 0).getDate()}`;

      const { data } = await supabase
        .from("payroll_items")
        .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title, sss_number, tin_number, philhealth_number, pagibig_number, department:departments(name))")
        .eq("company_id", ctx.companyId!)
        .gte("created_at", firstDay)
        .lte("created_at", lastDay + "T23:59:59");

      // Better approach: join through payroll_runs
      const { data: runs } = await supabase
        .from("payroll_runs")
        .select("id")
        .eq("company_id", ctx.companyId!)
        .gte("period_start", firstDay)
        .lte("period_end", lastDay);

      if (!runs || runs.length === 0) return [];

      const runIds = runs.map((r) => r.id);
      const { data: items } = await supabase
        .from("payroll_items")
        .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title, sss_number, tin_number, philhealth_number, pagibig_number, gender, employment_status, hire_date, department_id, department:departments(name))")
        .eq("company_id", ctx.companyId!)
        .in("payroll_run_id", runIds);

      return items ?? [];
    }

    // Helper: fetch payroll items for a year
    async function getPayrollItemsForYear(y: number) {
      const { data: runs } = await supabase
        .from("payroll_runs")
        .select("id")
        .eq("company_id", ctx.companyId!)
        .gte("period_start", `${y}-01-01`)
        .lte("period_end", `${y}-12-31`);

      if (!runs || runs.length === 0) return [];

      const { data: items } = await supabase
        .from("payroll_items")
        .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title, sss_number, tin_number, philhealth_number, pagibig_number, gender, employment_status, hire_date, department_id, department:departments(name))")
        .eq("company_id", ctx.companyId!)
        .in("payroll_run_id", runs.map((r) => r.id));

      return items ?? [];
    }

    // Helper: fetch active loans for a period
    async function getActiveLoansForPeriod(companyId: string, m: number, y: number) {
      const { data } = await supabase
        .from("employee_loans")
        .select("*, loan_type:loan_types(name, code), employee:employees(id, employee_number, first_name, last_name, name, sss_number, pagibig_number)")
        .eq("company_id", companyId)
        .eq("active", true)
        .gt("remaining_balance", 0);
      return data ?? [];
    }

    let report;
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const periodLabel = `${new Date(year, m - 1).toLocaleDateString("en-PH", { month: "long" })} ${year}`;

    switch (type) {
      case "sss": {
        const items = await getPayrollItemsForMonth(m, year);
        report = generateSSSReport(items, periodLabel);
        break;
      }
      case "philhealth": {
        const items = await getPayrollItemsForMonth(m, year);
        report = generatePhilHealthReport(items, periodLabel);
        break;
      }
      case "pagibig": {
        const items = await getPayrollItemsForMonth(m, year);
        report = generatePagibigReport(items, periodLabel);
        break;
      }
      case "bir-1601c": {
        const items = await getPayrollItemsForMonth(m, year);
        report = generateBIR1601C(items, periodLabel);
        break;
      }
      case "bir-2316": {
        if (!employeeId) {
          return NextResponse.json({ error: "employee_id required for BIR 2316" }, { status: 400 });
        }
        const items = await getPayrollItemsForYear(year);
        const empItems = items.filter((i) => i.employee_id === employeeId);

        const { data: emp } = await supabase
          .from("employees")
          .select("*, department:departments(name)")
          .eq("id", employeeId)
          .single();

        if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        report = generateBIR2316(empItems, emp, year);
        break;
      }
      case "13th-month": {
        const items = await getPayrollItemsForYear(year);
        report = generate13thMonthReport(items, year);
        break;
      }
      case "headcount": {
        const { data: employees } = await supabase
          .from("employees")
          .select("*, department:departments(name)")
          .eq("company_id", ctx.companyId!)
          .eq("active", true);
        report = generateHeadcountReport(employees ?? []);
        break;
      }
      case "attendance-summary": {
        const monthStr = `${year}-${String(m).padStart(2, "0")}`;
        const firstDay = `${monthStr}-01`;
        const lastDay = `${monthStr}-${new Date(year, m, 0).getDate()}`;

        const { data: dtr } = await supabase
          .from("daily_time_records")
          .select("*, employee:employees(id, employee_number, first_name, last_name, name)")
          .eq("company_id", ctx.companyId!)
          .gte("date", firstDay)
          .lte("date", lastDay);

        report = generateAttendanceSummary(dtr ?? [], periodLabel);
        break;
      }
      case "leave-utilization": {
        const { data: balances } = await supabase
          .from("leave_balances")
          .select("*, leave_type:leave_types(name, code), employee:employees(id, employee_number, first_name, last_name, name)")
          .eq("company_id", ctx.companyId!)
          .eq("year", year);
        report = generateLeaveUtilization(balances ?? []);
        break;
      }
      case "payroll-summary": {
        const { data: runs } = await supabase
          .from("payroll_runs")
          .select("*")
          .eq("company_id", ctx.companyId!)
          .gte("period_start", `${year}-01-01`)
          .lte("period_end", `${year}-12-31`)
          .order("period_start");
        report = generatePayrollSummary(runs ?? []);
        break;
      }
      case "employee-directory": {
        const { data: employees } = await supabase
          .from("employees")
          .select("*, department:departments(name)")
          .eq("company_id", ctx.companyId!)
          .eq("active", true)
          .order("last_name");
        report = generateEmployeeDirectory(employees ?? []);
        break;
      }
      case "bir-1604cf": {
        const items = await getPayrollItemsForYear(year);
        report = generateBIR1604CF(items, year);
        break;
      }
      case "sss-r5": {
        const loans = await getActiveLoansForPeriod(ctx.companyId!, m, year);
        const filteredLoans = loans.filter(
          (l: any) =>
            l.loan_type?.code?.toUpperCase().startsWith("SSS") ||
            l.loan_type?.name?.toLowerCase().includes("sss")
        );
        report = generateSSSR5(filteredLoans, periodLabel);
        break;
      }
      case "philhealth-er2": {
        const { data: employees } = await supabase
          .from("employees")
          .select("id, employee_number, first_name, last_name, name, philhealth_number, date_of_birth, gender, civil_status, employment_status, hire_date")
          .eq("company_id", ctx.companyId!)
          .eq("active", true);
        report = generatePhilHealthER2(employees ?? [], year);
        break;
      }
      case "pagibig-mcrf": {
        const items = await getPayrollItemsForMonth(m, year);
        report = generatePagibigMCRF(items, periodLabel);
        break;
      }
      case "pagibig-loan": {
        const loans = await getActiveLoansForPeriod(ctx.companyId!, m, year);
        const filteredLoans = loans.filter(
          (l: any) =>
            l.loan_type?.code?.toUpperCase().startsWith("PAGIBIG") ||
            l.loan_type?.code?.toUpperCase().startsWith("HDMF") ||
            l.loan_type?.name?.toLowerCase().includes("pag-ibig")
        );
        report = generatePagibigLoan(filteredLoans, periodLabel);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
    }

    // Return based on format
    if (format === "csv") {
      const csv = exportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}-${year}${month ? `-${month}` : ""}.csv"`,
        },
      });
    }

    if (format === "html") {
      const html = exportToHTML(report);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Report generation failed" },
      { status: 500 }
    );
  }
}
