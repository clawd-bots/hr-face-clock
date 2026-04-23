"use client";

import { useState, useEffect, useCallback } from "react";
import TabNav from "@/components/TabNav";

type LeaveType = { id: string; name: string; code: string };
type LeaveBalance = {
  id: string;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  adjusted_days: number;
  leave_type?: LeaveType;
};
type LeaveRequest = {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  leave_type?: LeaveType;
};

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[var(--color-sw-gold-50)] text-sw-gold-600",
  approved: "bg-[rgba(76,175,80,0.12)] text-sw-success-500",
  rejected: "bg-[rgba(244,67,54,0.12)] text-sw-danger-500",
  cancelled: "bg-[rgba(28, 26, 22, 0.06)] text-sw-ink-500",
};

export default function EmployeeLeavesPage() {
  const [activeTab, setActiveTab] = useState("requests");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // File leave modal
  const [showModal, setShowModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    total_days: "1",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/employee/me/leaves");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setBalances(data.balances ?? []);
      setRequests(data.requests ?? []);
      // Extract unique leave types for the filing form
      const types = (data.balances ?? [])
        .map((b: LeaveBalance) => b.leave_type)
        .filter((t: LeaveType | undefined): t is LeaveType => !!t);
      setLeaveTypes(types);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleFileLeave() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/employee/me/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type_id: form.leave_type_id,
          start_date: form.start_date,
          end_date: form.end_date,
          total_days: parseFloat(form.total_days),
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to file leave");
      }
      setShowModal(false);
      setForm({ leave_type_id: "", start_date: "", end_date: "", total_days: "1", reason: "" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="t-display">
          My Leaves
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: "var(--color-sw-gold-500)" }}
        >
          File Leave
        </button>
      </div>

      <TabNav
        tabs={[
          { key: "requests", label: "My Requests" },
          { key: "balances", label: "Balances" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
      ) : activeTab === "requests" ? (
        requests.length === 0 ? (
          <div className="text-center py-12 text-sw-ink-500 text-sm">
            No leave requests yet. Click &quot;File Leave&quot; to get started.
          </div>
        ) : (
          <div className="sw-panel overflow-hidden mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                  <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Type</th>
                  <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Dates</th>
                  <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Days</th>
                  <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Reason</th>
                  <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Status</th>
                  <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Filed</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                    <td className="px-6 py-4.5 text-sw-ink-900 font-medium">{r.leave_type?.name ?? "—"}</td>
                    <td className="px-6 py-4.5 text-sw-ink-700">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</td>
                    <td className="px-6 py-4.5 text-right text-sw-ink-700">{r.total_days}</td>
                    <td className="px-6 py-4.5 text-sw-ink-700 max-w-[200px] truncate">{r.reason || "—"}</td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${STATUS_STYLES[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-sw-ink-500 text-xs">{fmtDate(r.created_at.split("T")[0])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Balances tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {balances.map((b) => {
            const available =
              (b.entitled_days ?? 0) + (b.carried_over ?? 0) + (b.adjusted_days ?? 0) -
              (b.used_days ?? 0) - (b.pending_days ?? 0);
            return (
              <div key={b.id} className="sw-panel p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-sw-ink-900">
                    {b.leave_type?.name ?? "—"}
                  </h3>
                  <span className="text-xs text-sw-ink-500 font-mono">{b.leave_type?.code}</span>
                </div>
                <p className="text-2xl font-semibold text-sw-ink-900 mb-2">
                  {available.toFixed(1)}
                  <span className="text-sm font-normal text-sw-ink-500"> days available</span>
                </p>
                <div className="space-y-1 text-xs text-sw-ink-500">
                  <div className="flex justify-between">
                    <span>Entitled</span><span>{b.entitled_days}</span>
                  </div>
                  {(b.carried_over ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Carried Over</span><span>{b.carried_over}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Used</span><span>{b.used_days}</span>
                  </div>
                  {(b.pending_days ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Pending</span><span>{b.pending_days}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {balances.length === 0 && (
            <div className="col-span-full text-center py-12 text-sw-ink-500 text-sm">
              No leave balances initialized yet
            </div>
          )}
        </div>
      )}

      {/* File Leave Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-4">File Leave Request</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">Leave Type</label>
                  <select
                    value={form.leave_type_id}
                    onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  >
                    <option value="">Select type...</option>
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sw-ink-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sw-ink-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">Total Days</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.total_days}
                    onChange={(e) => setForm({ ...form, total_days: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)] resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-[var(--color-sw-ink-100)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileLeave}
                  disabled={submitting || !form.leave_type_id || !form.start_date || !form.end_date}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--color-sw-gold-500)" }}
                >
                  {submitting ? "Filing..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
