"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Employee = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  employee_number?: string;
  position_title?: string;
};

type PayrollItem = {
  id: string;
  employee_id: string;
  basic_pay: number;
  gross_pay: number;
  sss_employee: number;
  philhealth_employee: number;
  pagibig_employee: number;
  withholding_tax: number;
  total_allowances: number;
  total_deductions: number;
  loan_deductions: number;
  other_deductions: number;
  late_undertime_deductions: number;
  net_pay: number;
  employee?: Employee;
};

type PayrollRunDetail = {
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
  approved_at: string | null;
  items: PayrollItem[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function empName(e?: Employee): string {
  if (!e) return "—";
  if (e.first_name) return `${e.first_name} ${e.last_name ?? ""}`.trim();
  return e.name ?? "—";
}

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.5)]",
  computed: "bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]",
  approved: "bg-[rgba(76,175,80,0.12)] text-[#2e7d32]",
  paid: "bg-[rgba(33,150,243,0.12)] text-[#1565c0]",
};

const CYCLE_LABELS: Record<string, string> = {
  semi_monthly_1: "1st–15th",
  semi_monthly_2: "16th–EOM",
  monthly: "Monthly",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRun = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payroll/${id}`);
      if (!res.ok) throw new Error("Failed to load payroll run");
      setRun(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      fetchRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkPaid() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      fetchRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecompute() {
    if (!confirm("This will delete all current payslip items and recompute from scratch. Continue?")) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recompute" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to recompute");
      }
      fetchRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this payroll run and all its items? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      router.push("/admin/payroll");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-[rgba(0,0,0,0.4)] text-sm">Loading payroll run...</div>
    );
  }

  if (error || !run) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-sm mb-4">{error || "Not found"}</p>
        <button onClick={() => router.push("/admin/payroll")} className="text-sm text-[#9a6d2a] font-medium">
          Back to Payroll
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.push("/admin/payroll")}
          className="text-sm text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.65)] transition-colors"
        >
          &larr; Payroll
        </button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)]">
            {fmtDate(run.period_start)} – {fmtDate(run.period_end)}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-[rgba(0,0,0,0.5)]">
              {CYCLE_LABELS[run.cycle] ?? run.cycle} &middot; Pay date: {fmtDate(run.pay_date)}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${STATUS_STYLES[run.status] ?? ""}`}>
              {run.status}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {(run.status === "draft" || run.status === "computed") && (
            <button
              onClick={handleRecompute}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              {actionLoading ? "..." : "Recompute"}
            </button>
          )}
          {run.status === "computed" && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #66bb6a, #43a047)" }}
            >
              {actionLoading ? "..." : "Approve Payroll"}
            </button>
          )}
          {run.status === "approved" && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white bg-[#1565c0] disabled:opacity-50"
            >
              {actionLoading ? "..." : "Mark as Paid"}
            </button>
          )}
          {(run.status === "draft" || run.status === "computed") && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-[#8a3a34] border border-[rgba(138,58,52,0.3)] hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gross Pay", value: run.total_gross, color: "#ffc671" },
          { label: "Total Deductions", value: run.total_deductions, color: "#ef9a9a" },
          { label: "Net Pay", value: run.total_net, color: "#81c784" },
          { label: "Employees", value: run.employee_count, isCount: true },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-5"
          >
            <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <p className="text-xl font-semibold text-[rgba(0,0,0,0.88)] tabular-nums">
              {"isCount" in card
                ? card.value
                : `₱${fmt(card.value as number)}`}
            </p>
          </div>
        ))}
      </div>

      {/* Employee Payslip Table */}
      <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)]">
                <th className="text-left px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Employee</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Basic Pay</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Allowances</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">SSS</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">PhilHealth</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Pag-IBIG</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Tax</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Loans</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Late/UT</th>
                <th className="text-right px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Net Pay</th>
                <th className="text-center px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {run.items.map((item) => (
                <tr key={item.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f9f8f3] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="text-[rgba(0,0,0,0.88)] font-medium">{empName(item.employee)}</div>
                    <div className="text-xs text-[rgba(0,0,0,0.4)]">
                      {item.employee?.employee_number ?? ""} {item.employee?.position_title ? `· ${item.employee.position_title}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)]">{fmt(item.basic_pay)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.total_allowances)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)] font-medium">{fmt(item.gross_pay)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.sss_employee)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.philhealth_employee)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.pagibig_employee)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.withholding_tax)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.loan_deductions)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">{fmt(item.late_undertime_deductions)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)] font-semibold">{fmt(item.net_pay)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <a
                      href={`/api/payroll/${id}/payslip?item_id=${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#9a6d2a] hover:text-[#7a5520] font-medium"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
            {run.items.length > 0 && (
              <tfoot>
                <tr className="bg-[#f9f8f3] border-t-2 border-[rgba(0,0,0,0.1)]">
                  <td className="px-4 py-3.5 font-semibold text-[rgba(0,0,0,0.88)]">Totals</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[rgba(0,0,0,0.88)]">
                    {fmt(run.items.reduce((s, i) => s + i.basic_pay, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.total_allowances, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[rgba(0,0,0,0.88)]">
                    {fmt(run.total_gross)}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.sss_employee, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.philhealth_employee, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.pagibig_employee, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.withholding_tax, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.loan_deductions, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {fmt(run.items.reduce((s, i) => s + i.late_undertime_deductions, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-[rgba(0,0,0,0.88)]">
                    {fmt(run.total_net)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <a
                      href={`/api/payroll/${id}/payslip`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#9a6d2a] hover:text-[#7a5520] font-medium"
                    >
                      All
                    </a>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
