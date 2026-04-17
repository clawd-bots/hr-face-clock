"use client";

import { useState, useEffect, useCallback } from "react";
import TabNav from "@/components/TabNav";

type TimeDeclaration = {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  hours_worked: number;
  location: string | null;
  reason: string;
  status: string;
  rejection_reason?: string;
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
  pending: "bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]",
  approved: "bg-[rgba(76,175,80,0.12)] text-[#2e7d32]",
  rejected: "bg-[rgba(244,67,54,0.12)] text-[#c62828]",
  cancelled: "bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.4)]",
};

export default function EmployeeDeclarationsPage() {
  const [activeTab, setActiveTab] = useState("declarations");
  const [declarations, setDeclarations] = useState<TimeDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // File declaration modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    date: "",
    clock_in: "",
    clock_out: "",
    hours_worked: "",
    location: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate hours worked
  useEffect(() => {
    if (form.clock_in && form.clock_out) {
      const [sh, sm] = form.clock_in.split(":").map(Number);
      const [eh, em] = form.clock_out.split(":").map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // overnight
      setForm(f => ({ ...f, hours_worked: String((diff / 60).toFixed(2)) }));
    }
  }, [form.clock_in, form.clock_out]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/employee/me/time-declarations");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setDeclarations(Array.isArray(data) ? data : data.declarations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleFileDeclaration() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/employee/me/time-declarations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          clock_in: form.clock_in,
          clock_out: form.clock_out,
          hours_worked: parseFloat(form.hours_worked),
          location: form.location || null,
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to file declaration");
      }
      setShowModal(false);
      setForm({ date: "", clock_in: "", clock_out: "", hours_worked: "", location: "", reason: "" });
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
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)]">
            Time Declarations
          </h1>
          <p className="text-sm text-[rgba(0,0,0,0.45)] mt-1">
            Declare your clock-in/out times for field work or off-site activities
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
        >
          New Declaration
        </button>
      </div>

      <TabNav
        tabs={[{ key: "declarations", label: "My Declarations" }]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">Loading...</div>
      ) : declarations.length === 0 ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">
          No time declarations yet. Click &quot;New Declaration&quot; to declare your work hours.
        </div>
      ) : (
        <div className="glass-card overflow-hidden mt-6">
          <table className="glass-table w-full text-sm">
            <thead>
              <tr className="bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)]">
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Date</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Clock In</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Clock Out</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Hours</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Location</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Reason</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Status</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Filed</th>
              </tr>
            </thead>
            <tbody>
              {declarations.map((d) => (
                <tr key={d.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f9f8f3] transition-colors">
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.88)] font-medium">{fmtDate(d.date)}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{d.clock_in}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{d.clock_out}</td>
                  <td className="px-5 py-3.5 text-right text-[rgba(0,0,0,0.65)]">{d.hours_worked}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)] max-w-[150px] truncate">{d.location || "\u2014"}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)] max-w-[200px] truncate">{d.reason}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${STATUS_STYLES[d.status] ?? ""}`}>
                      {d.status}
                    </span>
                    {d.status === "rejected" && d.rejection_reason && (
                      <p className="text-[10px] text-[rgba(244,67,54,0.8)] mt-1 max-w-[120px] truncate" title={d.rejection_reason}>
                        {d.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.4)] text-xs">{fmtDate(d.created_at.split("T")[0])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File Declaration Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-[rgba(0,0,0,0.88)] mb-1">Declare Time Entry</h2>
              <p className="text-xs text-[rgba(0,0,0,0.4)] mb-5">For field work, client visits, or off-site activities</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Clock In</label>
                    <input
                      type="time"
                      value={form.clock_in}
                      onChange={(e) => setForm({ ...form, clock_in: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Clock Out</label>
                    <input
                      type="time"
                      value={form.clock_out}
                      onChange={(e) => setForm({ ...form, clock_out: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Hours Worked</label>
                  <input
                    type="number"
                    step="0.25"
                    value={form.hours_worked}
                    onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671] bg-[#fafaf2]"
                    readOnly
                  />
                  <p className="text-[10px] text-[rgba(0,0,0,0.35)] mt-1">Auto-calculated from clock in/out times</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Location / Client Site</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. BGC Taguig, Client Office"
                    className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Reason <span className="text-[#c62828]">*</span></label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    rows={3}
                    placeholder="e.g. Client meeting, field sales visit, delivery run..."
                    className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671] resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-[rgba(0,0,0,0.65)] hover:bg-[#f4f1e6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileDeclaration}
                  disabled={submitting || !form.date || !form.clock_in || !form.clock_out || !form.reason}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
                >
                  {submitting ? "Submitting..." : "Submit Declaration"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
