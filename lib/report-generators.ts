/**
 * Report Generator Library
 *
 * Pure functions that format query results into report data structures.
 * No database calls — all data is passed in as arguments.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ReportData = {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: Record<string, string | number>;
};

type PayrollItemRow = {
  employee_id: string;
  basic_pay: number;
  gross_pay: number;
  net_pay: number;
  sss_employee: number;
  sss_employer: number;
  philhealth_employee: number;
  philhealth_employer: number;
  pagibig_employee: number;
  pagibig_employer: number;
  withholding_tax: number;
  total_allowances: number;
  total_deductions: number;
  loan_deductions: number;
  employee?: EmployeeRow;
};

type EmployeeRow = {
  id: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  position_title?: string;
  gender?: string;
  employment_status?: string;
  hire_date?: string;
  separation_date?: string;
  sss_number?: string;
  tin_number?: string;
  philhealth_number?: string;
  pagibig_number?: string;
  department?: { name: string } | null;
  department_id?: string;
};

type DTRRow = {
  employee_id: string;
  date: string;
  total_hours_worked: number | null;
  regular_hours: number | null;
  late_minutes: number;
  undertime_minutes: number;
  is_rest_day: boolean;
  is_holiday: boolean;
  employee?: EmployeeRow;
};

type LeaveBalanceRow = {
  employee_id: string;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  adjusted_days: number;
  leave_type?: { name: string; code: string };
  employee?: EmployeeRow;
};

type PayrollRunRow = {
  id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  cycle: string;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function empName(e?: EmployeeRow | null): string {
  if (!e) return "—";
  if (e.first_name) return `${e.first_name} ${e.last_name ?? ""}`.trim();
  return e.name ?? "—";
}

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────────
// Government Reports
// ──────────────────────────────────────────────

export function generateSSSReport(items: PayrollItemRow[], period: string): ReportData {
  const rows = items.map((i) => [
    i.employee?.employee_number ?? "—",
    empName(i.employee),
    i.employee?.sss_number ?? "—",
    fmt(i.basic_pay * 2), // monthly salary credit (semi-monthly × 2)
    fmt(i.sss_employee),
    fmt(i.sss_employer),
    fmt(i.sss_employee + i.sss_employer),
  ]);

  const totalEE = round2(items.reduce((s, i) => s + i.sss_employee, 0));
  const totalER = round2(items.reduce((s, i) => s + i.sss_employer, 0));

  return {
    title: "SSS Monthly Contribution Report (R3/R5)",
    subtitle: period,
    headers: ["Emp No.", "Name", "SSS No.", "Monthly Salary Credit", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: items.length,
    },
  };
}

export function generatePhilHealthReport(items: PayrollItemRow[], period: string): ReportData {
  const rows = items.map((i) => [
    i.employee?.employee_number ?? "—",
    empName(i.employee),
    i.employee?.philhealth_number ?? "—",
    fmt(i.basic_pay * 2),
    fmt(i.philhealth_employee),
    fmt(i.philhealth_employer),
    fmt(i.philhealth_employee + i.philhealth_employer),
  ]);

  const totalEE = round2(items.reduce((s, i) => s + i.philhealth_employee, 0));
  const totalER = round2(items.reduce((s, i) => s + i.philhealth_employer, 0));

  return {
    title: "PhilHealth Monthly Remittance Report (RF-1)",
    subtitle: period,
    headers: ["Emp No.", "Name", "PhilHealth No.", "Monthly Basic", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: items.length,
    },
  };
}

export function generatePagibigReport(items: PayrollItemRow[], period: string): ReportData {
  const rows = items.map((i) => [
    i.employee?.employee_number ?? "—",
    empName(i.employee),
    i.employee?.pagibig_number ?? "—",
    fmt(i.basic_pay * 2),
    fmt(i.pagibig_employee),
    fmt(i.pagibig_employer),
    fmt(i.pagibig_employee + i.pagibig_employer),
  ]);

  const totalEE = round2(items.reduce((s, i) => s + i.pagibig_employee, 0));
  const totalER = round2(items.reduce((s, i) => s + i.pagibig_employer, 0));

  return {
    title: "Pag-IBIG Monthly Contribution Schedule",
    subtitle: period,
    headers: ["Emp No.", "Name", "Pag-IBIG No.", "Monthly Basic", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: items.length,
    },
  };
}

export function generateBIR1601C(items: PayrollItemRow[], period: string): ReportData {
  const totalTax = round2(items.reduce((s, i) => s + i.withholding_tax, 0));
  const totalGross = round2(items.reduce((s, i) => s + i.gross_pay, 0));

  const rows = items.map((i) => [
    i.employee?.employee_number ?? "—",
    empName(i.employee),
    i.employee?.tin_number ?? "—",
    fmt(i.gross_pay),
    fmt(i.withholding_tax),
  ]);

  return {
    title: "BIR Form 1601-C — Monthly Withholding Tax Remittance",
    subtitle: period,
    headers: ["Emp No.", "Name", "TIN", "Gross Pay", "Tax Withheld"],
    rows,
    summary: {
      "Total Gross": fmt(totalGross),
      "Total Tax Withheld": fmt(totalTax),
      Employees: items.length,
    },
  };
}

export function generateBIR2316(
  items: PayrollItemRow[],
  employee: EmployeeRow,
  year: number
): ReportData {
  const totalGross = round2(items.reduce((s, i) => s + i.gross_pay, 0));
  const totalSSS = round2(items.reduce((s, i) => s + i.sss_employee, 0));
  const totalPhil = round2(items.reduce((s, i) => s + i.philhealth_employee, 0));
  const totalPag = round2(items.reduce((s, i) => s + i.pagibig_employee, 0));
  const totalTax = round2(items.reduce((s, i) => s + i.withholding_tax, 0));
  const totalNet = round2(items.reduce((s, i) => s + i.net_pay, 0));

  return {
    title: `BIR Form 2316 — Certificate of Compensation Payment/Tax Withheld`,
    subtitle: `${empName(employee)} — Year ${year}`,
    headers: ["Description", "Amount"],
    rows: [
      ["Total Gross Compensation", fmt(totalGross)],
      ["SSS Contributions", fmt(totalSSS)],
      ["PhilHealth Contributions", fmt(totalPhil)],
      ["Pag-IBIG Contributions", fmt(totalPag)],
      ["Total Mandatory Deductions", fmt(round2(totalSSS + totalPhil + totalPag))],
      ["Taxable Compensation", fmt(round2(totalGross - totalSSS - totalPhil - totalPag))],
      ["Tax Withheld", fmt(totalTax)],
      ["Net Compensation", fmt(totalNet)],
    ],
    summary: {
      Employee: empName(employee),
      "Employee No.": employee.employee_number ?? "—",
      TIN: employee.tin_number ?? "—",
      Year: year,
    },
  };
}

export function generate13thMonthReport(
  items: PayrollItemRow[],
  year: number
): ReportData {
  // Group by employee, sum basic_pay across all periods
  const empMap = new Map<string, { employee: EmployeeRow | undefined; totalBasic: number; periods: number }>();

  for (const item of items) {
    const existing = empMap.get(item.employee_id);
    if (existing) {
      existing.totalBasic += item.basic_pay;
      existing.periods += 1;
    } else {
      empMap.set(item.employee_id, {
        employee: item.employee,
        totalBasic: item.basic_pay,
        periods: 1,
      });
    }
  }

  const rows: (string | number)[][] = [];
  let grandTotal = 0;

  for (const [, data] of empMap) {
    const thirteenthMonth = round2(data.totalBasic / 12);
    grandTotal += thirteenthMonth;
    rows.push([
      data.employee?.employee_number ?? "—",
      empName(data.employee),
      fmt(data.totalBasic),
      data.periods,
      fmt(thirteenthMonth),
    ]);
  }

  return {
    title: "13th Month Pay Computation",
    subtitle: `Year ${year}`,
    headers: ["Emp No.", "Name", "Total Basic Pay", "Pay Periods", "13th Month Pay"],
    rows,
    summary: {
      "Grand Total": fmt(round2(grandTotal)),
      Employees: empMap.size,
    },
  };
}

// ──────────────────────────────────────────────
// Internal HR Reports
// ──────────────────────────────────────────────

export function generateHeadcountReport(employees: EmployeeRow[]): ReportData {
  const byDept = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byGender = new Map<string, number>();

  for (const e of employees) {
    const dept = e.department?.name ?? "Unassigned";
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1);

    const status = e.employment_status ?? "unknown";
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);

    const gender = e.gender ?? "unspecified";
    byGender.set(gender, (byGender.get(gender) ?? 0) + 1);
  }

  const rows: (string | number)[][] = [];

  rows.push(["— By Department —", "", ""]);
  for (const [dept, count] of [...byDept.entries()].sort((a, b) => b[1] - a[1])) {
    rows.push(["", dept, count]);
  }

  rows.push(["— By Employment Status —", "", ""]);
  for (const [status, count] of byStatus) {
    rows.push(["", status, count]);
  }

  rows.push(["— By Gender —", "", ""]);
  for (const [gender, count] of byGender) {
    rows.push(["", gender, count]);
  }

  return {
    title: "Headcount Report",
    headers: ["Category", "Group", "Count"],
    rows,
    summary: { "Total Active Employees": employees.length },
  };
}

export function generateAttendanceSummary(records: DTRRow[], period: string): ReportData {
  const empMap = new Map<string, {
    employee: EmployeeRow | undefined;
    days: number;
    totalHours: number;
    totalLate: number;
    totalUndertime: number;
  }>();

  for (const r of records) {
    const existing = empMap.get(r.employee_id);
    const hours = r.total_hours_worked ?? 0;
    if (existing) {
      if (hours > 0) existing.days++;
      existing.totalHours += hours;
      existing.totalLate += r.late_minutes ?? 0;
      existing.totalUndertime += r.undertime_minutes ?? 0;
    } else {
      empMap.set(r.employee_id, {
        employee: r.employee,
        days: hours > 0 ? 1 : 0,
        totalHours: hours,
        totalLate: r.late_minutes ?? 0,
        totalUndertime: r.undertime_minutes ?? 0,
      });
    }
  }

  const rows = [...empMap.values()].map((d) => [
    d.employee?.employee_number ?? "—",
    empName(d.employee),
    d.days,
    d.totalHours.toFixed(1),
    d.totalLate,
    d.totalUndertime,
  ]);

  return {
    title: "Attendance Summary",
    subtitle: period,
    headers: ["Emp No.", "Name", "Days Worked", "Total Hours", "Late (mins)", "Undertime (mins)"],
    rows,
    summary: {
      Employees: empMap.size,
      "Total Days": [...empMap.values()].reduce((s, d) => s + d.days, 0),
    },
  };
}

export function generateLeaveUtilization(balances: LeaveBalanceRow[]): ReportData {
  const rows = balances.map((b) => {
    const available = round2(
      (b.entitled_days ?? 0) + (b.carried_over ?? 0) + (b.adjusted_days ?? 0) -
      (b.used_days ?? 0) - (b.pending_days ?? 0)
    );
    return [
      b.employee?.employee_number ?? "—",
      empName(b.employee),
      b.leave_type?.name ?? "—",
      b.entitled_days,
      b.used_days,
      b.pending_days,
      available,
    ];
  });

  return {
    title: "Leave Utilization Report",
    headers: ["Emp No.", "Name", "Leave Type", "Entitled", "Used", "Pending", "Available"],
    rows,
    summary: {
      "Total Entries": balances.length,
    },
  };
}

export function generatePayrollSummary(runs: PayrollRunRow[]): ReportData {
  const rows = runs.map((r) => [
    `${r.period_start} – ${r.period_end}`,
    r.cycle === "semi_monthly_1" ? "1st–15th" : r.cycle === "semi_monthly_2" ? "16th–EOM" : "Monthly",
    r.status,
    r.employee_count,
    fmt(r.total_gross),
    fmt(r.total_deductions),
    fmt(r.total_net),
  ]);

  return {
    title: "Payroll Summary",
    headers: ["Period", "Cycle", "Status", "Employees", "Gross", "Deductions", "Net"],
    rows,
    summary: {
      "Total Gross": fmt(round2(runs.reduce((s, r) => s + r.total_gross, 0))),
      "Total Net": fmt(round2(runs.reduce((s, r) => s + r.total_net, 0))),
      "Pay Periods": runs.length,
    },
  };
}

export function generateEmployeeDirectory(employees: EmployeeRow[]): ReportData {
  const rows = employees.map((e) => [
    e.employee_number ?? "—",
    empName(e),
    e.position_title ?? "—",
    e.department?.name ?? "—",
    e.employment_status ?? "—",
    e.hire_date ?? "—",
    e.gender ?? "—",
  ]);

  return {
    title: "Employee Directory",
    headers: ["Emp No.", "Name", "Position", "Department", "Status", "Hire Date", "Gender"],
    rows,
    summary: { "Total Employees": employees.length },
  };
}
