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
  date_of_birth?: string;
  civil_status?: string;
  department?: { name: string } | null;
  department_id?: string;
};

type LoanRow = {
  employee_id: string;
  monthly_deduction: number;
  remaining_balance: number;
  loan_type?: { name: string; code: string } | null;
  employee?: EmployeeRow | null;
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

/**
 * Aggregate payroll items by employee for the given period.
 * Sums basic_pay, gross_pay, and all contribution fields so the report
 * shows one row per employee per month — not one row per cutoff.
 */
type AggregatedPayroll = {
  employee: EmployeeRow | undefined;
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
};

function aggregateByEmployee(
  items: PayrollItemRow[]
): Map<string, AggregatedPayroll> {
  const agg = new Map<string, AggregatedPayroll>();
  for (const i of items) {
    const cur = agg.get(i.employee_id);
    if (cur) {
      cur.basic_pay += i.basic_pay ?? 0;
      cur.gross_pay += i.gross_pay ?? 0;
      cur.net_pay += i.net_pay ?? 0;
      cur.sss_employee += i.sss_employee ?? 0;
      cur.sss_employer += i.sss_employer ?? 0;
      cur.philhealth_employee += i.philhealth_employee ?? 0;
      cur.philhealth_employer += i.philhealth_employer ?? 0;
      cur.pagibig_employee += i.pagibig_employee ?? 0;
      cur.pagibig_employer += i.pagibig_employer ?? 0;
      cur.withholding_tax += i.withholding_tax ?? 0;
    } else {
      agg.set(i.employee_id, {
        employee: i.employee,
        basic_pay: i.basic_pay ?? 0,
        gross_pay: i.gross_pay ?? 0,
        net_pay: i.net_pay ?? 0,
        sss_employee: i.sss_employee ?? 0,
        sss_employer: i.sss_employer ?? 0,
        philhealth_employee: i.philhealth_employee ?? 0,
        philhealth_employer: i.philhealth_employer ?? 0,
        pagibig_employee: i.pagibig_employee ?? 0,
        pagibig_employer: i.pagibig_employer ?? 0,
        withholding_tax: i.withholding_tax ?? 0,
      });
    }
  }
  return agg;
}

export function generateSSSReport(items: PayrollItemRow[], period: string): ReportData {
  const agg = aggregateByEmployee(items);
  const rows: (string | number)[][] = [];

  for (const [, a] of agg) {
    rows.push([
      a.employee?.employee_number ?? "—",
      empName(a.employee),
      a.employee?.sss_number ?? "—",
      fmt(round2(a.basic_pay)),
      fmt(round2(a.sss_employee)),
      fmt(round2(a.sss_employer)),
      fmt(round2(a.sss_employee + a.sss_employer)),
    ]);
  }

  const totalEE = round2([...agg.values()].reduce((s, a) => s + a.sss_employee, 0));
  const totalER = round2([...agg.values()].reduce((s, a) => s + a.sss_employer, 0));

  return {
    title: "SSS Monthly Contribution Report (R3/R5)",
    subtitle: period,
    headers: ["Emp No.", "Name", "SSS No.", "Monthly Salary Credit", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: agg.size,
    },
  };
}

export function generatePhilHealthReport(items: PayrollItemRow[], period: string): ReportData {
  const agg = aggregateByEmployee(items);
  const rows: (string | number)[][] = [];

  for (const [, a] of agg) {
    rows.push([
      a.employee?.employee_number ?? "—",
      empName(a.employee),
      a.employee?.philhealth_number ?? "—",
      fmt(round2(a.basic_pay)),
      fmt(round2(a.philhealth_employee)),
      fmt(round2(a.philhealth_employer)),
      fmt(round2(a.philhealth_employee + a.philhealth_employer)),
    ]);
  }

  const totalEE = round2([...agg.values()].reduce((s, a) => s + a.philhealth_employee, 0));
  const totalER = round2([...agg.values()].reduce((s, a) => s + a.philhealth_employer, 0));

  return {
    title: "PhilHealth Monthly Remittance Report (RF-1)",
    subtitle: period,
    headers: ["Emp No.", "Name", "PhilHealth No.", "Monthly Basic", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: agg.size,
    },
  };
}

export function generatePagibigReport(items: PayrollItemRow[], period: string): ReportData {
  const agg = aggregateByEmployee(items);
  const rows: (string | number)[][] = [];

  for (const [, a] of agg) {
    rows.push([
      a.employee?.employee_number ?? "—",
      empName(a.employee),
      a.employee?.pagibig_number ?? "—",
      fmt(round2(a.basic_pay)),
      fmt(round2(a.pagibig_employee)),
      fmt(round2(a.pagibig_employer)),
      fmt(round2(a.pagibig_employee + a.pagibig_employer)),
    ]);
  }

  const totalEE = round2([...agg.values()].reduce((s, a) => s + a.pagibig_employee, 0));
  const totalER = round2([...agg.values()].reduce((s, a) => s + a.pagibig_employer, 0));

  return {
    title: "Pag-IBIG Monthly Contribution Schedule",
    subtitle: period,
    headers: ["Emp No.", "Name", "Pag-IBIG No.", "Monthly Basic", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: agg.size,
    },
  };
}

export function generateBIR1601C(items: PayrollItemRow[], period: string): ReportData {
  const agg = aggregateByEmployee(items);
  const rows: (string | number)[][] = [];

  for (const [, a] of agg) {
    rows.push([
      a.employee?.employee_number ?? "—",
      empName(a.employee),
      a.employee?.tin_number ?? "—",
      fmt(round2(a.gross_pay)),
      fmt(round2(a.withholding_tax)),
    ]);
  }

  const totalGross = round2([...agg.values()].reduce((s, a) => s + a.gross_pay, 0));
  const totalTax = round2([...agg.values()].reduce((s, a) => s + a.withholding_tax, 0));

  return {
    title: "BIR Form 1601-C — Monthly Withholding Tax Remittance",
    subtitle: period,
    headers: ["Emp No.", "Name", "TIN", "Gross Pay", "Tax Withheld"],
    rows,
    summary: {
      "Total Gross": fmt(totalGross),
      "Total Tax Withheld": fmt(totalTax),
      Employees: agg.size,
    },
  };
}

export function generateBIR2316(
  items: PayrollItemRow[],
  employee: EmployeeRow,
  year: number
): ReportData {
  if (items.length === 0) {
    return {
      title: "BIR Form 2316 — Certificate of Compensation Payment/Tax Withheld",
      subtitle: `${empName(employee)} — Year ${year}`,
      headers: ["Notice"],
      rows: [
        [
          `No payroll records found for ${empName(employee)} in ${year}. ` +
            `Either no payroll has been run for this employee, or the runs fall outside the selected year.`,
        ],
      ],
      summary: {
        Employee: empName(employee),
        "Employee No.": employee.employee_number ?? "—",
        TIN: employee.tin_number ?? "—",
        Year: year,
        "Pay Periods": 0,
      },
    };
  }

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
      "Pay Periods": items.length,
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

export function generateBIR1604CF(items: PayrollItemRow[], year: number): ReportData {
  // Group items by employee_id and sum across all periods
  const empMap = new Map<
    string,
    {
      employee: EmployeeRow | undefined;
      gross: number;
      sss: number;
      philhealth: number;
      pagibig: number;
      tax: number;
    }
  >();

  for (const item of items) {
    const existing = empMap.get(item.employee_id);
    if (existing) {
      existing.gross += item.gross_pay;
      existing.sss += item.sss_employee;
      existing.philhealth += item.philhealth_employee;
      existing.pagibig += item.pagibig_employee;
      existing.tax += item.withholding_tax;
    } else {
      empMap.set(item.employee_id, {
        employee: item.employee,
        gross: item.gross_pay,
        sss: item.sss_employee,
        philhealth: item.philhealth_employee,
        pagibig: item.pagibig_employee,
        tax: item.withholding_tax,
      });
    }
  }

  const rows: (string | number)[][] = [];
  let totalGross = 0;
  let totalNonTaxable = 0;
  let totalTaxable = 0;
  let totalTax = 0;

  for (const [, data] of empMap) {
    const gross = round2(data.gross);
    const nonTaxable = round2(data.sss + data.philhealth + data.pagibig);
    const taxable = round2(gross - nonTaxable);
    const tax = round2(data.tax);

    totalGross += gross;
    totalNonTaxable += nonTaxable;
    totalTaxable += taxable;
    totalTax += tax;

    rows.push([
      data.employee?.employee_number ?? "—",
      empName(data.employee),
      data.employee?.tin_number ?? "—",
      fmt(gross),
      fmt(nonTaxable),
      fmt(taxable),
      fmt(tax),
    ]);
  }

  return {
    title: "BIR Form 1604-CF — Annual Information Return",
    subtitle: `Year ${year}`,
    headers: ["Emp No.", "Name", "TIN", "Gross Compensation", "Non-Taxable (SSS+Phil+Pag)", "Taxable Compensation", "Tax Withheld"],
    rows,
    summary: {
      "Total Gross": fmt(round2(totalGross)),
      "Total Non-Taxable": fmt(round2(totalNonTaxable)),
      "Total Taxable": fmt(round2(totalTaxable)),
      "Total Tax": fmt(round2(totalTax)),
      Employees: empMap.size,
    },
  };
}

export function generateSSSR5(loans: LoanRow[], period: string): ReportData {
  const rows = loans.map((l) => [
    l.employee?.employee_number ?? "—",
    empName(l.employee),
    l.employee?.sss_number ?? "—",
    l.loan_type?.name ?? "—",
    fmt(l.monthly_deduction),
    fmt(l.remaining_balance),
  ]);

  const totalDeducted = round2(loans.reduce((s, l) => s + l.monthly_deduction, 0));
  const totalRemaining = round2(loans.reduce((s, l) => s + l.remaining_balance, 0));

  return {
    title: "SSS R5 — Loan Payment Collection List",
    subtitle: period,
    headers: ["Emp No.", "Name", "SSS No.", "Loan Type", "Amount Deducted", "Remaining Balance"],
    rows,
    summary: {
      "Total Deducted": fmt(totalDeducted),
      "Total Remaining": fmt(totalRemaining),
      Loans: loans.length,
    },
  };
}

// Format an ISO date (YYYY-MM-DD) to MM/DD/YYYY for PhilHealth/BIR forms.
function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${m}/${day}/${y}`;
}

export function generatePhilHealthER2(employees: EmployeeRow[], year: number): ReportData {
  const rows = employees.map((e) => [
    e.employee_number ?? "—",
    empName(e),
    e.philhealth_number ?? "—",
    fmtDate(e.date_of_birth),
    e.gender ?? "—",
    e.civil_status ?? "—",
    e.employment_status ?? "—",
    fmtDate(e.hire_date),
  ]);

  return {
    title: "PhilHealth ER2 — Report of Employee-Members",
    subtitle: `Year ${year}`,
    headers: ["Emp No.", "Name", "PhilHealth No.", "Date of Birth", "Gender", "Civil Status", "Employment Status", "Hire Date"],
    rows,
    summary: {
      "Total Employees": employees.length,
    },
  };
}

export function generatePagibigMCRF(items: PayrollItemRow[], period: string): ReportData {
  const agg = aggregateByEmployee(items);
  const rows: (string | number)[][] = [];

  for (const [, a] of agg) {
    rows.push([
      a.employee?.pagibig_number ?? "—",
      a.employee?.employee_number ?? "—",
      empName(a.employee),
      fmt(round2(a.basic_pay)),
      fmt(round2(a.pagibig_employee)),
      fmt(round2(a.pagibig_employer)),
      fmt(round2(a.pagibig_employee + a.pagibig_employer)),
    ]);
  }

  const totalEE = round2([...agg.values()].reduce((s, a) => s + a.pagibig_employee, 0));
  const totalER = round2([...agg.values()].reduce((s, a) => s + a.pagibig_employer, 0));

  return {
    title: "Pag-IBIG MCRF — Monthly Contribution Remittance Form",
    subtitle: period,
    headers: ["Pag-IBIG MID No.", "Emp No.", "Name", "Monthly Compensation", "EE Share", "ER Share", "Total"],
    rows,
    summary: {
      "Total EE": fmt(totalEE),
      "Total ER": fmt(totalER),
      "Grand Total": fmt(round2(totalEE + totalER)),
      Employees: agg.size,
    },
  };
}

export function generatePagibigLoan(loans: LoanRow[], period: string): ReportData {
  const rows = loans.map((l) => [
    l.employee?.pagibig_number ?? "—",
    l.employee?.employee_number ?? "—",
    empName(l.employee),
    l.loan_type?.name ?? "—",
    fmt(l.monthly_deduction),
    fmt(l.remaining_balance),
  ]);

  const totalDeducted = round2(loans.reduce((s, l) => s + l.monthly_deduction, 0));
  const totalRemaining = round2(loans.reduce((s, l) => s + l.remaining_balance, 0));

  return {
    title: "Pag-IBIG — Loan Amortization Report",
    subtitle: period,
    headers: ["Pag-IBIG MID No.", "Emp No.", "Name", "Loan Type", "Amount Deducted", "Remaining Balance"],
    rows,
    summary: {
      "Total Deducted": fmt(totalDeducted),
      "Total Remaining": fmt(totalRemaining),
      Loans: loans.length,
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
