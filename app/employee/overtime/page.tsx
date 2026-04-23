"use client";

import { useState, useEffect, useCallback } from "react";
import TabNav from "@/components/TabNav";

type OvertimeRequest = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  ot_hours: number;
  reason: string;
  status: string;
  created_at: string;
};

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

export default function EmployeeOvertimePage() {
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // File overtime modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    ot_hours: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate OT hours
  useEffect(() => {
    if (form.start_time && form.end_time) {
      const [sh, sm] = form.start_time.split(":").map(Number);
      const [eh, em] = form.end_time.split(":").map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // overnight OT
      setForm(f => ({ ...f, ot_hours: String((diff / 60).toFixed(2)) }));
    }
  }, [form.start_time, form.end_time]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/employee/me/overtime");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : data.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleFileOvertime() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/employee/me/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          ot_hours: parseFloat(form.ot_hours),
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to file overtime");
      }
      setShowModal(false);
      setForm({ date: "", start_time: "", end_time: "", ot_hours: "", reason: "" });
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
          My Overtime
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: "var(--color-sw-gold-500)" }}
        >
          File Overtime
        </button>
      </div>

      <TabNav
        tabs={[{ key: "requests", label: "My Requests" }]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">
          No overtime requests yet. Click &quot;File Overtime&quot; to get started.
        </div>
      ) : (
        <div className="glass-card overflow-hidden mt-6">
          <table className="glass-table w-full text-sm">
            <thead>
              <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Date</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Start Time</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">End Time</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">OT Hours</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Reason</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Status</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Filed</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                  <td className="px-6 py-4.5 text-sw-ink-900 font-medium">{fmtDate(r.date)}</td>
                  <td className="px-6 py-4.5 text-sw-ink-700">{r.start_time}</td>
                  <td className="px-6 py-4.5 text-sw-ink-700">{r.end_time}</td>
                  <td className="px-6 py-4.5 text-right text-sw-ink-700">{r.ot_hours}</td>
                  <td className="px-6 py-4.5 text-sw-ink-700 max-w-[200px] truncate">{r.reason || "\u2014"}</td>
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
      )}

      {/* File Overtime Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-4">File Overtime Request</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sw-ink-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sw-ink-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">OT Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    value={form.ot_hours}
                    onChange={(e) => setForm({ ...form, ot_hours: e.target.value })}
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
                  onClick={handleFileOvertime}
                  disabled={submitting || !form.date || !form.start_time || !form.end_time}
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
