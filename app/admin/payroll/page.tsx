"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import TabNav from "@/components/TabNav";

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

type PayrollRun = {
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
  created_at: string;
};

type SalaryRecord = {
  id: string;
  employee_id: string;
  basic_salary: number;
  daily_rate: number;
  hourly_rate: number;
  effective_from: string;
  effective_to: string | null;
  pay_basis: string;
  days_per_month: number;
  employee?: Employee;
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
  draft: "bg-[rgba(28, 26, 22, 0.06)] text-sw-ink-500",
  computed: "bg-[var(--color-sw-gold-50)] text-sw-gold-600",
  approved: "bg-[rgba(76,175,80,0.12)] text-sw-success-500",
  paid: "bg-[rgba(33,150,243,0.12)] text-sw-lilac-500",
};

const CYCLE_LABELS: Record<string, string> = {
  semi_monthly_1: "1st–15th",
  semi_monthly_2: "16th–EOM",
  monthly: "Monthly",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PayrollPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("runs");

  // Payroll Runs state
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState("");
  const [showRunModal, setShowRunModal] = useState(false);
  const [runCycle, setRunCycle] = useState<"semi_monthly_1" | "semi_monthly_2">("semi_monthly_1");
  const [runMonth, setRunMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [runPayDate, setRunPayDate] = useState("");
  const [runSubmitting, setRunSubmitting] = useState(false);

  // Salary state
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [salariesLoading, setSalariesLoading] = useState(false);
  const [salariesError, setSalariesError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    employee_id: "",
    basic_salary: "",
    effective_from: new Date().toISOString().split("T")[0],
    pay_basis: "monthly",
    days_per_month: "22",
  });
  const [salarySubmitting, setSalarySubmitting] = useState(false);

  // ── Fetch payroll runs ────────────────────────────────────────────────
  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError("");
    try {
      const res = await fetch("/api/payroll");
      if (!res.ok) throw new Error("Failed to load payroll runs");
      setRuns(await res.json());
    } catch (err) {
      setRunsError(err instanceof Error ? err.message : "Error");
    } finally {
      setRunsLoading(false);
    }
  }, []);

  // ── Fetch salary records ──────────────────────────────────────────────
  const fetchSalaries = useCallback(async () => {
    setSalariesLoading(true);
    setSalariesError("");
    try {
      const res = await fetch("/api/salary-records");
      if (!res.ok) throw new Error("Failed to load salary records");
      setSalaries(await res.json());
    } catch (err) {
      setSalariesError(err instanceof Error ? err.message : "Error");
    } finally {
      setSalariesLoading(false);
    }
  }, []);

  // ── Fetch employees ───────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) return;
      setEmployees(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === "runs") fetchRuns();
    if (activeTab === "salary") {
      fetchSalaries();
      fetchEmployees();
    }
  }, [activeTab, fetchRuns, fetchSalaries, fetchEmployees]);

  // ── Run payroll ───────────────────────────────────────────────────────
  async function handleRunPayroll() {
    setRunSubmitting(true);
    try {
      const [year, month] = runMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();

      const period_start =
        runCycle === "semi_monthly_1"
          ? `${runMonth}-01`
          : `${runMonth}-16`;
      const period_end =
        runCycle === "semi_monthly_1"
          ? `${runMonth}-15`
          : `${runMonth}-${lastDay}`;

      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start,
          period_end,
          pay_date: runPayDate || period_end,
          cycle: runCycle,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to run payroll");
      }

      setShowRunModal(false);
      fetchRuns();
    } catch (err) {
      setRunsError(err instanceof Error ? err.message : "Error");
    } finally {
      setRunSubmitting(false);
    }
  }

  // ── Set salary ────────────────────────────────────────────────────────
  async function handleSetSalary() {
    setSalarySubmitting(true);
    try {
      const res = await fetch("/api/salary-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: salaryForm.employee_id,
          basic_salary: parseFloat(salaryForm.basic_salary),
          effective_from: salaryForm.effective_from,
          pay_basis: salaryForm.pay_basis,
          days_per_month: parseInt(salaryForm.days_per_month, 10),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set salary");
      }

      setShowSalaryModal(false);
      setSalaryForm({
        employee_id: "",
        basic_salary: "",
        effective_from: new Date().toISOString().split("T")[0],
        pay_basis: "monthly",
        days_per_month: "22",
      });
      fetchSalaries();
    } catch (err) {
      setSalariesError(err instanceof Error ? err.message : "Error");
    } finally {
      setSalarySubmitting(false);
    }
  }

  // ── Delete salary record ──────────────────────────────────────────────
  async function handleDeleteSalary(id: string) {
    if (!confirm("Delete this salary record?")) return;
    try {
      const res = await fetch(`/api/salary-records/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchSalaries();
    } catch (err) {
      setSalariesError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="t-display">
          Payroll
        </h1>
      </div>

      <TabNav
        tabs={[
          { key: "runs", label: "Payroll Runs" },
          { key: "salary", label: "Salary Management" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ── Payroll Runs Tab ─────────────────────────────────────────────── */}
      {activeTab === "runs" && (
        <div className="mt-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowRunModal(true)}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ background: "var(--color-sw-gold-500)" }}
            >
              Run Payroll
            </button>
          </div>

          {runsError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{runsError}</div>
          )}

          {runsLoading ? (
            <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-sw-ink-500 text-sm">
              No payroll runs yet. Click &quot;Run Payroll&quot; to get started.
            </div>
          ) : (
            <div className="sw-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Period</th>
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Cycle</th>
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Status</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Employees</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Gross</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Deductions</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Net</th>
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Pay Date</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/admin/payroll/${r.id}`)}
                      className="border-b border-sw-ink-100 hover:bg-sw-cream-25 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4.5 text-sw-ink-900 font-medium">
                        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                      </td>
                      <td className="px-6 py-4.5 text-sw-ink-700">
                        {CYCLE_LABELS[r.cycle] ?? r.cycle}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${STATUS_STYLES[r.status] ?? ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-700">{r.employee_count}</td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-900 font-medium tabular-nums">
                        {fmt(r.total_gross)}
                      </td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-700 tabular-nums">
                        {fmt(r.total_deductions)}
                      </td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-900 font-medium tabular-nums">
                        {fmt(r.total_net)}
                      </td>
                      <td className="px-6 py-4.5 text-sw-ink-700">{fmtDate(r.pay_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Run Payroll Modal */}
          {showRunModal && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowRunModal(false)} />
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="glass-modal rounded-2xl w-full max-w-md p-6">
                  <h2 className="text-lg font-semibold text-sw-ink-900 mb-4">Run Payroll</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-sw-ink-700 mb-1">Month</label>
                      <input
                        type="month"
                        value={runMonth}
                        onChange={(e) => setRunMonth(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sw-ink-700 mb-1">Cutoff</label>
                      <select
                        value={runCycle}
                        onChange={(e) => setRunCycle(e.target.value as "semi_monthly_1" | "semi_monthly_2")}
                        className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                      >
                        <option value="semi_monthly_1">1st – 15th</option>
                        <option value="semi_monthly_2">16th – End of Month</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sw-ink-700 mb-1">Pay Date</label>
                      <input
                        type="date"
                        value={runPayDate}
                        onChange={(e) => setRunPayDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowRunModal(false)}
                      className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-[var(--color-sw-ink-100)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRunPayroll}
                      disabled={runSubmitting}
                      className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--color-sw-gold-500)" }}
                    >
                      {runSubmitting ? "Computing..." : "Compute Payroll"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Salary Management Tab ────────────────────────────────────────── */}
      {activeTab === "salary" && (
        <div className="mt-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowSalaryModal(true)}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ background: "var(--color-sw-gold-500)" }}
            >
              Set Salary
            </button>
          </div>

          {salariesError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{salariesError}</div>
          )}

          {salariesLoading ? (
            <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
          ) : salaries.length === 0 ? (
            <div className="text-center py-12 text-sw-ink-500 text-sm">
              No salary records yet. Click &quot;Set Salary&quot; to assign salaries.
            </div>
          ) : (
            <div className="sw-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Employee</th>
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Position</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Basic Salary</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Daily Rate</th>
                    <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Hourly Rate</th>
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Effective From</th>
                    <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Basis</th>
                    <th className="text-center px-6 py-4 font-medium text-sw-ink-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((s) => (
                    <tr key={s.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                      <td className="px-6 py-4.5 text-sw-ink-900 font-medium">
                        <div>{empName(s.employee)}</div>
                        {s.employee?.employee_number && (
                          <div className="text-xs text-sw-ink-500">{s.employee.employee_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-sw-ink-700">
                        {s.employee?.position_title ?? "—"}
                      </td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-900 font-medium tabular-nums">
                        {fmt(s.basic_salary)}
                      </td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-700 tabular-nums">
                        {fmt(s.daily_rate)}
                      </td>
                      <td className="px-6 py-4.5 text-right text-sw-ink-700 tabular-nums">
                        {fmt(s.hourly_rate)}
                      </td>
                      <td className="px-6 py-4.5 text-sw-ink-700">
                        {fmtDate(s.effective_from)}
                      </td>
                      <td className="px-6 py-4.5 text-sw-ink-700 capitalize">{s.pay_basis}</td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => handleDeleteSalary(s.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Set Salary Modal */}
          {showSalaryModal && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowSalaryModal(false)} />
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="glass-modal rounded-2xl w-full max-w-md p-6">
                  <h2 className="text-lg font-semibold text-sw-ink-900 mb-4">Set Salary</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-sw-ink-700 mb-1">Employee</label>
                      <select
                        value={salaryForm.employee_id}
                        onChange={(e) => setSalaryForm({ ...salaryForm, employee_id: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                      >
                        <option value="">Select employee...</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {empName(e)} {e.employee_number ? `(${e.employee_number})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sw-ink-700 mb-1">Basic Salary (Monthly)</label>
                      <input
                        type="number"
                        value={salaryForm.basic_salary}
                        onChange={(e) => setSalaryForm({ ...salaryForm, basic_salary: e.target.value })}
                        placeholder="e.g. 25000"
                        className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sw-ink-700 mb-1">Effective From</label>
                      <input
                        type="date"
                        value={salaryForm.effective_from}
                        onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-sw-ink-700 mb-1">Pay Basis</label>
                        <select
                          value={salaryForm.pay_basis}
                          onChange={(e) => setSalaryForm({ ...salaryForm, pay_basis: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="daily">Daily</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-sw-ink-700 mb-1">Days/Month</label>
                        <input
                          type="number"
                          value={salaryForm.days_per_month}
                          onChange={(e) => setSalaryForm({ ...salaryForm, days_per_month: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowSalaryModal(false)}
                      className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-[var(--color-sw-ink-100)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetSalary}
                      disabled={salarySubmitting || !salaryForm.employee_id || !salaryForm.basic_salary}
                      className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--color-sw-gold-500)" }}
                    >
                      {salarySubmitting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
