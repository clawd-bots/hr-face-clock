"use client";

import { useState, useEffect } from "react";

type Employee = {
  first_name?: string;
  last_name?: string;
  name?: string;
  position_title?: string;
  department?: { name: string };
};

type LeaveBalance = {
  id: string;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  adjusted_days: number;
  leave_type?: { name: string; code: string };
};

type LeaveRequest = {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
  leave_type?: { name: string };
};

type Payslip = {
  id: string;
  gross_pay: number;
  net_pay: number;
  payroll_run?: {
    period_start: string;
    period_end: string;
    pay_date: string;
  };
};

function empName(e?: Employee | null): string {
  if (!e) return "";
  if (e.first_name) return `${e.first_name} ${e.last_name ?? ""}`.trim();
  return e.name ?? "";
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[var(--color-sw-gold-50)] text-sw-gold-600",
  approved: "bg-[rgba(76,175,80,0.12)] text-sw-success-500",
  rejected: "bg-[rgba(244,67,54,0.12)] text-sw-danger-500",
  cancelled: "bg-[rgba(28, 26, 22, 0.06)] text-sw-ink-500",
};

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [nextPayslip, setNextPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [meRes, leavesRes, payslipsRes] = await Promise.all([
          fetch("/api/employee/me"),
          fetch("/api/employee/me/leaves"),
          fetch("/api/employee/me/payslips"),
        ]);

        if (meRes.ok) setEmployee(await meRes.json());
        if (leavesRes.ok) {
          const data = await leavesRes.json();
          setBalances(data.balances ?? []);
          setRequests((data.requests ?? []).slice(0, 5));
        }
        if (payslipsRes.ok) {
          const payslips = await payslipsRes.json();
          if (payslips.length > 0) setNextPayslip(payslips[0]);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-sw-ink-500 text-sm">Loading...</div>
    );
  }

  const totalLeave = balances.reduce(
    (sum, b) =>
      sum +
      (b.entitled_days ?? 0) +
      (b.carried_over ?? 0) +
      (b.adjusted_days ?? 0) -
      (b.used_days ?? 0) -
      (b.pending_days ?? 0),
    0
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="t-display">
          Welcome, {empName(employee) || "Employee"}
        </h1>
        {employee?.position_title && (
          <p className="text-sm text-sw-ink-500 mt-1">
            {employee.position_title}
            {employee.department ? ` · ${employee.department.name}` : ""}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="sw-panel p-5">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">
            Available Leave Days
          </p>
          <p className="text-2xl font-semibold text-sw-ink-900">
            {totalLeave.toFixed(1)}
          </p>
          <p className="text-xs text-sw-ink-500 mt-1">
            across {balances.length} leave type{balances.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="sw-panel p-5">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">
            Latest Payslip
          </p>
          {nextPayslip?.payroll_run ? (
            <>
              <p className="text-2xl font-semibold text-sw-ink-900 tabular-nums">
                ₱{nextPayslip.net_pay.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-sw-ink-500 mt-1">
                {fmtDate(nextPayslip.payroll_run.period_start)} – {fmtDate(nextPayslip.payroll_run.period_end)}
              </p>
            </>
          ) : (
            <p className="text-sm text-sw-ink-500">No payslips yet</p>
          )}
        </div>

        <div className="sw-panel p-5">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">
            Pending Requests
          </p>
          <p className="text-2xl font-semibold text-sw-ink-900">
            {requests.filter((r) => r.status === "pending").length}
          </p>
          <p className="text-xs text-sw-ink-500 mt-1">leave requests awaiting approval</p>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="sw-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-sw-ink-100">
          <h2 className="text-sm font-semibold text-sw-ink-900">Recent Leave Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-sw-ink-500">
            No leave requests yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sw-cream-25">
                <th className="text-left px-5 py-2.5 font-medium text-sw-ink-500">Type</th>
                <th className="text-left px-5 py-2.5 font-medium text-sw-ink-500">Dates</th>
                <th className="text-right px-5 py-2.5 font-medium text-sw-ink-500">Days</th>
                <th className="text-left px-5 py-2.5 font-medium text-sw-ink-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-sw-ink-100">
                  <td className="px-6 py-4 text-sw-ink-900">{r.leave_type?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-sw-ink-700">
                    {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                  </td>
                  <td className="px-6 py-4 text-right text-sw-ink-700">{r.total_days}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${STATUS_STYLES[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
