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
    return <div className="text-center py-20 text-[rgba(0,0,0,0.4)] text-sm">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)] mb-8">
        My Payslips
      </h1>

      {payslips.length === 0 ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">
          No payslips available yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)]">
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Period</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Cycle</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Basic Pay</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Allowances</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Gross</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Deductions</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Net Pay</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Pay Date</th>
                <th className="text-center px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f9f8f3] transition-colors">
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.88)] font-medium">
                    {p.payroll_run
                      ? `${fmtDate(p.payroll_run.period_start)} – ${fmtDate(p.payroll_run.period_end)}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">
                    {CYCLE_LABELS[p.payroll_run?.cycle ?? ""] ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)]">{fmt(p.basic_pay)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(p.total_allowances)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)] font-medium">{fmt(p.gross_pay)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(p.total_deductions)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)] font-semibold">{fmt(p.net_pay)}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">
                    {p.payroll_run ? fmtDate(p.payroll_run.pay_date) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.payroll_run && (
                      <a
                        href={`/api/payroll/${p.payroll_run.id}/payslip?item_id=${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#9a6d2a] hover:text-[#7a5520] font-medium"
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
