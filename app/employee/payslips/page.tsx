"use client";

import { useState, useEffect } from "react";

type PayrollRun = {
  id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  cycle: string;
  status: string;
};

type Payslip = {
  id: string;
  basic_pay: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  sss_employee: number;
  philhealth_employee: number;
  pagibig_employee: number;
  withholding_tax: number;
  total_allowances: number;
  loan_deductions: number;
  payroll_run?: PayrollRun;
};

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const CYCLE_LABELS: Record<string, string> = {
  semi_monthly_1: "1st–15th",
  semi_monthly_2: "16th–EOM",
  monthly: "Monthly",
};

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/employee/me/payslips");
        if (res.ok) setPayslips(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-sw-ink-500 text-sm">Loading...</div>;
  }

  return (
    <div>
      <h1 className="t-display mb-8">
        My Payslips
      </h1>

      {payslips.length === 0 ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">
          No payslips available yet.
        </div>
      ) : (
        <div className="sw-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Period</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Cycle</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Basic Pay</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Allowances</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Gross</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Deductions</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Net Pay</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Pay Date</th>
                <th className="text-center px-6 py-4 font-medium text-sw-ink-500">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                  <td className="px-6 py-4.5 text-sw-ink-900 font-medium">
                    {p.payroll_run
                      ? `${fmtDate(p.payroll_run.period_start)} – ${fmtDate(p.payroll_run.period_end)}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4.5 text-sw-ink-700">
                    {CYCLE_LABELS[p.payroll_run?.cycle ?? ""] ?? "—"}
                  </td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-900">{fmt(p.basic_pay)}</td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-700">{fmt(p.total_allowances)}</td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-900 font-medium">{fmt(p.gross_pay)}</td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-700">{fmt(p.total_deductions)}</td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-900 font-semibold">{fmt(p.net_pay)}</td>
                  <td className="px-6 py-4.5 text-sw-ink-700">
                    {p.payroll_run ? fmtDate(p.payroll_run.pay_date) : "—"}
                  </td>
                  <td className="px-6 py-4.5 text-center">
                    {p.payroll_run && (
                      <a
                        href={`/api/payroll/${p.payroll_run.id}/payslip?item_id=${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sw-gold-600 hover:text-sw-gold-600 font-medium"
                      >
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
