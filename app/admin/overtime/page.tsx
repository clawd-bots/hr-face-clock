"use client";

import { useState, useEffect, useCallback } from "react";
import TabNav from "@/components/TabNav";

type Employee = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
};

type OvertimeRequest = {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  ot_hours: number;
  reason: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  employee?: Employee;
};

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function employeeName(e?: Employee | null): string {
  if (!e) return "\u2014";
  return e.first_name ? `${e.first_name} ${e.last_name}` : e.name ?? "\u2014";
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]",
  approved: "bg-[rgba(76,175,80,0.12)] text-[#2e7d32]",
  rejected: "bg-[rgba(244,67,54,0.12)] text-[#c62828]",
  cancelled: "bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.4)]",
};

export default function AdminOvertimePage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url =
        activeTab === "pending"
          ? "/api/overtime-requests?status=pending"
          : "/api/overtime-requests";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : data.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/overtime-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error();
      fetchRequests();
    } catch {
      /* silent */
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      const res = await fetch(`/api/overtime-requests/${rejectTarget}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejection_reason: rejectReason,
        }),
      });
      if (!res.ok) throw new Error();
      setRejectTarget(null);
      setRejectReason("");
      fetchRequests();
    } catch {
      /* silent */
    } finally {
      setRejectSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)]">
          Overtime Management
        </h1>
      </div>

      <TabNav
        tabs={[
          { key: "pending", label: "Pending" },
          { key: "all", label: "All Requests" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">
          {activeTab === "pending" ? "No pending overtime requests." : "No overtime requests found."}
        </div>
      ) : (
        <div className="glass-card overflow-hidden mt-6">
          <table className="glass-table w-full text-sm">
            <thead>
              <tr className="bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)]">
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Employee</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Date</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Start Time</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">End Time</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">OT Hours</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Reason</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Status</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f9f8f3] transition-colors">
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.88)] font-medium">{employeeName(r.employee)}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{fmtDate(r.date)}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{r.start_time}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{r.end_time}</td>
                  <td className="px-5 py-3.5 text-right text-[rgba(0,0,0,0.65)]">{r.ot_hours}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)] max-w-[200px] truncate">{r.reason || "\u2014"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${STATUS_STYLES[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-3 py-1 rounded-full text-xs font-medium text-white bg-[#4caf50] hover:bg-[#43a047] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(r.id)}
                          className="px-3 py-1 rounded-full text-xs font-medium text-white bg-[#f44336] hover:bg-[#e53935] transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[rgba(0,0,0,0.3)]">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { setRejectTarget(null); setRejectReason(""); }} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-[rgba(0,0,0,0.88)] mb-4">Reject Overtime Request</h2>
              <div>
                <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671] resize-none"
                  placeholder="Reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                  className="px-4 py-2 rounded-full text-sm font-medium text-[rgba(0,0,0,0.65)] hover:bg-[#f4f1e6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectSubmitting}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50 bg-[#f44336] hover:bg-[#e53935] transition-colors"
                >
                  {rejectSubmitting ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
