/**
 * Payroll Computation Library
 *
 * Pure functions for computing Philippine payroll — SSS, PhilHealth, Pag-IBIG,
 * withholding tax, and per-employee payslip breakdown.
 * No database calls — all data is passed in as arguments.
 */

import { getPayMultiplier } from "@/lib/dtr-computation";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type DTRRecord = {
  date: string;
  regular_hours: number | null;
  night_diff_hours: number | null;
  late_minutes: number;
  undertime_minutes: number;
  is_rest_day: boolean;
  is_holiday: boolean;
  holiday_type: string | null;
};

export type AllowanceInput = {
  amount: number;
  frequency: "per_cutoff" | "monthly";
  is_taxable: boolean;
  is_de_minimis: boolean;
  de_minimis_limit: number | null;
};

export type LoanInput = {
  monthly_deduction: number;
};

export type OvertimeInput = {
  date: string;
  ot_hours: number;
  is_rest_day: boolean;
  is_holiday: boolean;
  holiday_type: string | null;
};

export type ComputePayrollItemParams = {
  basicSalary: number; // monthly
  dailyRate: number;
  hourlyRate: number;
  dtrRecords: DTRRecord[];
  allowances: AllowanceInput[];
  loans: LoanInput[];
  overtimeRecords?: OvertimeInput[];
  otherDeductions: number;
  cycle: "semi_monthly_1" | "semi_monthly_2" | "monthly";
  payBasis: "monthly" | "daily";
  daysPerMonth: number;
};

export type ComputedPayrollItem = {
  basic_pay: number;
  days_worked: number;
  hours_worked: number;
  regular_pay: number;
  holiday_pay: number;
  rest_day_pay: number;
  night_diff_pay: number;
  overtime_pay: number;
  gross_pay: number;
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
  other_deductions: number;
  late_undertime_deductions: number;
  net_pay: number;
  breakdown: Record<string, unknown>;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────────
// SSS 2025 Contribution Table
// Based on Republic Act No. 11199 (Social Security Act of 2018)
// Monthly salary credit brackets with employee and employer shares
// ──────────────────────────────────────────────

type SSSBracket = {
  minSalary: number;
  maxSalary: number;
  monthlySalaryCredit: number;
  employeeShare: number;
  employerShare: number;
};

const SSS_TABLE: SSSBracket[] = [
  { minSalary: 0, maxSalary: 4249.99, monthlySalaryCredit: 4000, employeeShare: 180, employerShare: 390 },
  { minSalary: 4250, maxSalary: 4749.99, monthlySalaryCredit: 4500, employeeShare: 202.5, employerShare: 437.5 },
  { minSalary: 4750, maxSalary: 5249.99, monthlySalaryCredit: 5000, employeeShare: 225, employerShare: 487.5 },
  { minSalary: 5250, maxSalary: 5749.99, monthlySalaryCredit: 5500, employeeShare: 247.5, employerShare: 537.5 },
  { minSalary: 5750, maxSalary: 6249.99, monthlySalaryCredit: 6000, employeeShare: 270, employerShare: 585 },
  { minSalary: 6250, maxSalary: 6749.99, monthlySalaryCredit: 6500, employeeShare: 292.5, employerShare: 632.5 },
  { minSalary: 6750, maxSalary: 7249.99, monthlySalaryCredit: 7000, employeeShare: 315, employerShare: 682.5 },
  { minSalary: 7250, maxSalary: 7749.99, monthlySalaryCredit: 7500, employeeShare: 337.5, employerShare: 730 },
  { minSalary: 7750, maxSalary: 8249.99, monthlySalaryCredit: 8000, employeeShare: 360, employerShare: 780 },
  { minSalary: 8250, maxSalary: 8749.99, monthlySalaryCredit: 8500, employeeShare: 382.5, employerShare: 827.5 },
  { minSalary: 8750, maxSalary: 9249.99, monthlySalaryCredit: 9000, employeeShare: 405, employerShare: 877.5 },
  { minSalary: 9250, maxSalary: 9749.99, monthlySalaryCredit: 9500, employeeShare: 427.5, employerShare: 925 },
  { minSalary: 9750, maxSalary: 10249.99, monthlySalaryCredit: 10000, employeeShare: 450, employerShare: 975 },
  { minSalary: 10250, maxSalary: 10749.99, monthlySalaryCredit: 10500, employeeShare: 472.5, employerShare: 1022.5 },
  { minSalary: 10750, maxSalary: 11249.99, monthlySalaryCredit: 11000, employeeShare: 495, employerShare: 1072.5 },
  { minSalary: 11250, maxSalary: 11749.99, monthlySalaryCredit: 11500, employeeShare: 517.5, employerShare: 1120 },
  { minSalary: 11750, maxSalary: 12249.99, monthlySalaryCredit: 12000, employeeShare: 540, employerShare: 1170 },
  { minSalary: 12250, maxSalary: 12749.99, monthlySalaryCredit: 12500, employeeShare: 562.5, employerShare: 1217.5 },
  { minSalary: 12750, maxSalary: 13249.99, monthlySalaryCredit: 13000, employeeShare: 585, employerShare: 1267.5 },
  { minSalary: 13250, maxSalary: 13749.99, monthlySalaryCredit: 13500, employeeShare: 607.5, employerShare: 1315 },
  { minSalary: 13750, maxSalary: 14249.99, monthlySalaryCredit: 14000, employeeShare: 630, employerShare: 1365 },
  { minSalary: 14250, maxSalary: 14749.99, monthlySalaryCredit: 14500, employeeShare: 652.5, employerShare: 1412.5 },
  { minSalary: 14750, maxSalary: 15249.99, monthlySalaryCredit: 15000, employeeShare: 675, employerShare: 1462.5 },
  { minSalary: 15250, maxSalary: 15749.99, monthlySalaryCredit: 15500, employeeShare: 697.5, employerShare: 1510 },
  { minSalary: 15750, maxSalary: 16249.99, monthlySalaryCredit: 16000, employeeShare: 720, employerShare: 1560 },
  { minSalary: 16250, maxSalary: 16749.99, monthlySalaryCredit: 16500, employeeShare: 742.5, employerShare: 1607.5 },
  { minSalary: 16750, maxSalary: 17249.99, monthlySalaryCredit: 17000, employeeShare: 765, employerShare: 1657.5 },
  { minSalary: 17250, maxSalary: 17749.99, monthlySalaryCredit: 17500, employeeShare: 787.5, employerShare: 1705 },
  { minSalary: 17750, maxSalary: 18249.99, monthlySalaryCredit: 18000, employeeShare: 810, employerShare: 1755 },
  { minSalary: 18250, maxSalary: 18749.99, monthlySalaryCredit: 18500, employeeShare: 832.5, employerShare: 1802.5 },
  { minSalary: 18750, maxSalary: 19249.99, monthlySalaryCredit: 19000, employeeShare: 855, employerShare: 1852.5 },
  { minSalary: 19250, maxSalary: 19749.99, monthlySalaryCredit: 19500, employeeShare: 877.5, employerShare: 1900 },
  { minSalary: 19750, maxSalary: 20249.99, monthlySalaryCredit: 20000, employeeShare: 900, employerShare: 1950 },
  { minSalary: 20250, maxSalary: 20749.99, monthlySalaryCredit: 20500, employeeShare: 922.5, employerShare: 1997.5 },
  { minSalary: 20750, maxSalary: 21249.99, monthlySalaryCredit: 21000, employeeShare: 945, employerShare: 2047.5 },
  { minSalary: 21250, maxSalary: 21749.99, monthlySalaryCredit: 21500, employeeShare: 967.5, employerShare: 2095 },
  { minSalary: 21750, maxSalary: 22249.99, monthlySalaryCredit: 22000, employeeShare: 990, employerShare: 2145 },
  { minSalary: 22250, maxSalary: 22749.99, monthlySalaryCredit: 22500, employeeShare: 1012.5, employerShare: 2192.5 },
  { minSalary: 22750, maxSalary: 23249.99, monthlySalaryCredit: 23000, employeeShare: 1035, employerShare: 2242.5 },
  { minSalary: 23250, maxSalary: 23749.99, monthlySalaryCredit: 23500, employeeShare: 1057.5, employerShare: 2290 },
  { minSalary: 23750, maxSalary: 24249.99, monthlySalaryCredit: 24000, employeeShare: 1080, employerShare: 2340 },
  { minSalary: 24250, maxSalary: 24749.99, monthlySalaryCredit: 24500, employeeShare: 1102.5, employerShare: 2387.5 },
  { minSalary: 24750, maxSalary: 25249.99, monthlySalaryCredit: 25000, employeeShare: 1125, employerShare: 2437.5 },
  { minSalary: 25250, maxSalary: 25749.99, monthlySalaryCredit: 25500, employeeShare: 1147.5, employerShare: 2485 },
  { minSalary: 25750, maxSalary: 26249.99, monthlySalaryCredit: 26000, employeeShare: 1170, employerShare: 2535 },
  { minSalary: 26250, maxSalary: 26749.99, monthlySalaryCredit: 26500, employeeShare: 1192.5, employerShare: 2582.5 },
  { minSalary: 26750, maxSalary: 27249.99, monthlySalaryCredit: 27000, employeeShare: 1215, employerShare: 2632.5 },
  { minSalary: 27250, maxSalary: 27749.99, monthlySalaryCredit: 27500, employeeShare: 1237.5, employerShare: 2680 },
  { minSalary: 27750, maxSalary: 28249.99, monthlySalaryCredit: 28000, employeeShare: 1260, employerShare: 2730 },
  { minSalary: 28250, maxSalary: 28749.99, monthlySalaryCredit: 28500, employeeShare: 1282.5, employerShare: 2777.5 },
  { minSalary: 28750, maxSalary: 29249.99, monthlySalaryCredit: 29000, employeeShare: 1305, employerShare: 2827.5 },
  { minSalary: 29250, maxSalary: 29749.99, monthlySalaryCredit: 29500, employeeShare: 1327.5, employerShare: 2875 },
  { minSalary: 29750, maxSalary: Infinity, monthlySalaryCredit: 30000, employeeShare: 1350, employerShare: 2930 },
];

/**
 * Compute SSS contribution based on monthly basic salary.
 * Returns monthly employee and employer shares.
 */
export function computeSSS(monthlySalary: number): {
  employee: number;
  employer: number;
} {
  const bracket =
    SSS_TABLE.find(
      (b) => monthlySalary >= b.minSalary && monthlySalary <= b.maxSalary
    ) ?? SSS_TABLE[SSS_TABLE.length - 1];

  return {
    employee: bracket.employeeShare,
    employer: bracket.employerShare,
  };
}

// ──────────────────────────────────────────────
// PhilHealth Contribution (2025)
// 5% of monthly basic salary, split 50/50
// Floor: PHP 500/month total (salary <= 10,000)
// Ceiling: PHP 5,000/month total (salary >= 100,000)
// ──────────────────────────────────────────────

export function computePhilHealth(monthlySalary: number): {
  employee: number;
  employer: number;
} {
  const RATE = 0.05;
  const FLOOR_SALARY = 10000;
  const CEILING_SALARY = 100000;

  let totalContribution: number;

  if (monthlySalary <= FLOOR_SALARY) {
    totalContribution = FLOOR_SALARY * RATE; // 500
  } else if (monthlySalary >= CEILING_SALARY) {
    totalContribution = CEILING_SALARY * RATE; // 5000
  } else {
    totalContribution = monthlySalary * RATE;
  }

  const half = round2(totalContribution / 2);
  return { employee: half, employer: half };
}

// ──────────────────────────────────────────────
// Pag-IBIG (HDMF) Contribution
// Employee: 1% if salary <= 1,500, else 2% (capped at PHP 200/month)
// Employer: 2% (capped at PHP 200/month)
// ──────────────────────────────────────────────

export function computePagibig(monthlySalary: number): {
  employee: number;
  employer: number;
} {
  const employeeRate = monthlySalary <= 1500 ? 0.01 : 0.02;
  const employeeContrib = Math.min(round2(monthlySalary * employeeRate), 200);
  const employerContrib = Math.min(round2(monthlySalary * 0.02), 200);

  return { employee: employeeContrib, employer: employerContrib };
}

// ──────────────────────────────────────────────
// Withholding Tax — BIR TRAIN Law
// Graduated monthly tax brackets
// ──────────────────────────────────────────────

type TaxBracket = {
  floor: number;
  ceiling: number;
  baseTax: number;
  rate: number;
};

const TAX_BRACKETS: TaxBracket[] = [
  { floor: 0, ceiling: 20833, baseTax: 0, rate: 0 },
  { floor: 20833, ceiling: 33333, baseTax: 0, rate: 0.15 },
  { floor: 33333, ceiling: 66667, baseTax: 1875, rate: 0.2 },
  { floor: 66667, ceiling: 166667, baseTax: 8541.8, rate: 0.25 },
  { floor: 166667, ceiling: 666667, baseTax: 33541.8, rate: 0.3 },
  { floor: 666667, ceiling: Infinity, baseTax: 183541.8, rate: 0.35 },
];

/**
 * Compute monthly withholding tax based on monthly taxable income.
 * Taxable income = gross - non-taxable allowances - SSS - PhilHealth - Pag-IBIG
 */
export function computeWithholdingTax(monthlyTaxableIncome: number): number {
  if (monthlyTaxableIncome <= 0) return 0;

  const bracket = TAX_BRACKETS.find(
    (b) =>
      monthlyTaxableIncome > b.floor && monthlyTaxableIncome <= b.ceiling
  );

  if (!bracket) {
    // Above all brackets
    const last = TAX_BRACKETS[TAX_BRACKETS.length - 1];
    return round2(last.baseTax + (monthlyTaxableIncome - last.floor) * last.rate);
  }

  if (bracket.rate === 0) return 0;

  return round2(bracket.baseTax + (monthlyTaxableIncome - bracket.floor) * bracket.rate);
}

// ──────────────────────────────────────────────
// Per-cutoff deduction helper
// Divides monthly contributions for semi-monthly payroll
// ──────────────────────────────────────────────

export function computePerCutoffDeductions(
  monthlySalary: number,
  cycle: "semi_monthly_1" | "semi_monthly_2" | "monthly"
): {
  sss_employee: number;
  sss_employer: number;
  philhealth_employee: number;
  philhealth_employer: number;
  pagibig_employee: number;
  pagibig_employer: number;
} {
  const sss = computeSSS(monthlySalary);
  const phil = computePhilHealth(monthlySalary);
  const pagibig = computePagibig(monthlySalary);

  const divisor = cycle === "monthly" ? 1 : 2;

  return {
    sss_employee: round2(sss.employee / divisor),
    sss_employer: round2(sss.employer / divisor),
    philhealth_employee: round2(phil.employee / divisor),
    philhealth_employer: round2(phil.employer / divisor),
    pagibig_employee: round2(pagibig.employee / divisor),
    pagibig_employer: round2(pagibig.employer / divisor),
  };
}

// ──────────────────────────────────────────────
// Main computation: single employee payslip
// ──────────────────────────────────────────────

export function computePayrollItem(
  params: ComputePayrollItemParams
): ComputedPayrollItem {
  const {
    basicSalary,
    dailyRate,
    hourlyRate,
    dtrRecords,
    allowances,
    loans,
    otherDeductions,
    cycle,
    payBasis,
    daysPerMonth,
  } = params;

  const divisor = cycle === "monthly" ? 1 : 2;

  // ── 1. Compute pay from DTR ───────────────────────────────────────────
  let totalRegularHours = 0;
  let totalNightDiffHours = 0;
  let totalLateMinutes = 0;
  let totalUndertimeMinutes = 0;
  let regularPay = 0;
  let holidayPay = 0;
  let restDayPay = 0;
  let nightDiffPay = 0;
  let daysWorked = 0;

  for (const dtr of dtrRecords) {
    const hours = dtr.regular_hours ?? 0;
    const nightHours = dtr.night_diff_hours ?? 0;

    if (hours > 0) daysWorked++;

    totalRegularHours += hours;
    totalNightDiffHours += nightHours;
    totalLateMinutes += dtr.late_minutes;
    totalUndertimeMinutes += dtr.undertime_minutes;

    const multiplier = getPayMultiplier({
      isRestDay: dtr.is_rest_day,
      isHoliday: dtr.is_holiday,
      holidayType: dtr.holiday_type,
    });

    const dayPay = round2(hours * hourlyRate * multiplier);

    // Track premium pay separately
    if (dtr.is_holiday) {
      const basePay = round2(hours * hourlyRate);
      holidayPay += round2(dayPay - basePay);
      regularPay += basePay;
    } else if (dtr.is_rest_day) {
      const basePay = round2(hours * hourlyRate);
      restDayPay += round2(dayPay - basePay);
      regularPay += basePay;
    } else {
      regularPay += dayPay;
    }

    // Night differential: 10% premium on night hours
    nightDiffPay += round2(nightHours * hourlyRate * 0.1);
  }

  regularPay = round2(regularPay);
  holidayPay = round2(holidayPay);
  restDayPay = round2(restDayPay);
  nightDiffPay = round2(nightDiffPay);

  // ── 1b. Compute overtime pay from approved OT ─────────────────────
  const overtimeRecords = params.overtimeRecords ?? [];
  let overtimePay = 0;
  for (const ot of overtimeRecords) {
    // DOLE OT rules: base multiplier * 1.25 (25% OT premium)
    // Regular day OT = 1.0 * 1.25 = 1.25x
    // Rest day OT = 1.30 * 1.30 = 1.69x
    // Regular holiday OT = 2.0 * 1.30 = 2.60x
    // Special holiday OT = 1.30 * 1.30 = 1.69x
    const baseMultiplier = getPayMultiplier({
      isRestDay: ot.is_rest_day,
      isHoliday: ot.is_holiday,
      holidayType: ot.holiday_type,
    });
    const otMultiplier = baseMultiplier * 1.25;
    overtimePay += round2(ot.ot_hours * hourlyRate * otMultiplier);
  }
  overtimePay = round2(overtimePay);

  // ── 2. Determine basic pay for the period ─────────────────────────────
  // For monthly-paid: basic pay is monthly / divisor (regardless of DTR)
  // For daily-paid: basic pay is based on days worked
  let basicPay: number;
  if (payBasis === "monthly") {
    basicPay = round2(basicSalary / divisor);
    // Monthly-paid get their basic; DTR adjusts via late/absence deductions
    // Override regular pay to be basic pay if no DTR (assume full attendance)
    if (dtrRecords.length === 0) {
      regularPay = basicPay;
    } else {
      regularPay = basicPay;
    }
  } else {
    basicPay = round2(daysWorked * dailyRate);
    regularPay = basicPay;
  }

  // ── 3. Late & undertime deductions ────────────────────────────────────
  const lateDeduction = round2((totalLateMinutes / 60) * hourlyRate);
  const undertimeDeduction = round2((totalUndertimeMinutes / 60) * hourlyRate);
  const lateUndertimeDeductions = round2(lateDeduction + undertimeDeduction);

  // ── 4. Allowances ─────────────────────────────────────────────────────
  let taxableAllowances = 0;
  let nonTaxableAllowances = 0;

  for (const a of allowances) {
    let amount = a.amount;

    // Monthly allowances are divided for semi-monthly
    if (a.frequency === "monthly" && cycle !== "monthly") {
      amount = round2(amount / 2);
    }

    if (a.is_de_minimis && a.de_minimis_limit != null) {
      // De minimis: tax-exempt up to limit, excess is taxable
      const exempt = Math.min(amount, a.de_minimis_limit);
      const excess = Math.max(0, amount - a.de_minimis_limit);
      nonTaxableAllowances += exempt;
      taxableAllowances += excess;
    } else if (a.is_taxable) {
      taxableAllowances += amount;
    } else {
      nonTaxableAllowances += amount;
    }
  }

  taxableAllowances = round2(taxableAllowances);
  nonTaxableAllowances = round2(nonTaxableAllowances);
  const totalAllowances = round2(taxableAllowances + nonTaxableAllowances);

  // ── 5. Gross pay ──────────────────────────────────────────────────────
  const grossPay = round2(
    basicPay +
      holidayPay +
      restDayPay +
      nightDiffPay +
      overtimePay +
      totalAllowances -
      lateUndertimeDeductions
  );

  // ── 6. Mandatory deductions (per cutoff) ──────────────────────────────
  const deductions = computePerCutoffDeductions(basicSalary, cycle);

  // ── 7. Withholding tax ────────────────────────────────────────────────
  // Compute on monthly basis, then divide for semi-monthly
  const monthlyTaxableIncome =
    (grossPay - nonTaxableAllowances) * divisor -
    deductions.sss_employee * divisor -
    deductions.philhealth_employee * divisor -
    deductions.pagibig_employee * divisor;

  const monthlyTax = computeWithholdingTax(monthlyTaxableIncome);
  const withholdingTax = round2(monthlyTax / divisor);

  // ── 8. Loan deductions (per cutoff) ───────────────────────────────────
  let loanDeductions = 0;
  for (const loan of loans) {
    loanDeductions += round2(loan.monthly_deduction / divisor);
  }
  loanDeductions = round2(loanDeductions);

  // ── 9. Total deductions & net pay ─────────────────────────────────────
  const totalDeductions = round2(
    deductions.sss_employee +
      deductions.philhealth_employee +
      deductions.pagibig_employee +
      withholdingTax +
      loanDeductions +
      otherDeductions
  );

  const netPay = round2(grossPay - totalDeductions);

  return {
    basic_pay: basicPay,
    days_worked: round2(daysWorked),
    hours_worked: round2(totalRegularHours),
    regular_pay: regularPay,
    holiday_pay: holidayPay,
    rest_day_pay: restDayPay,
    night_diff_pay: nightDiffPay,
    overtime_pay: overtimePay,
    gross_pay: grossPay,
    sss_employee: deductions.sss_employee,
    sss_employer: deductions.sss_employer,
    philhealth_employee: deductions.philhealth_employee,
    philhealth_employer: deductions.philhealth_employer,
    pagibig_employee: deductions.pagibig_employee,
    pagibig_employer: deductions.pagibig_employer,
    withholding_tax: withholdingTax,
    total_allowances: totalAllowances,
    total_deductions: totalDeductions,
    loan_deductions: loanDeductions,
    other_deductions: otherDeductions,
    late_undertime_deductions: lateUndertimeDeductions,
    net_pay: netPay,
    breakdown: {
      late_minutes: totalLateMinutes,
      undertime_minutes: totalUndertimeMinutes,
      late_deduction: lateDeduction,
      undertime_deduction: undertimeDeduction,
      taxable_allowances: taxableAllowances,
      non_taxable_allowances: nonTaxableAllowances,
      monthly_taxable_income: monthlyTaxableIncome,
      night_diff_hours: totalNightDiffHours,
      overtime_hours: overtimeRecords.reduce((s, o) => s + o.ot_hours, 0),
    },
  };
}
