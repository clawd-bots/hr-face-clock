"use client";

import { useState, useEffect, useCallback } from "react";

type DTRRecord = {
  id: string;
  date: string;
  first_in: string | null;
  last_out: string | null;
  total_hours_worked: number | null;
  regular_hours: number | null;
  night_diff_hours: number | null;
  late_minutes: number;
  undertime_minutes: number;
  is_rest_day: boolean;
  is_holiday: boolean;
  holiday_type: string | null;
  status: string;
};

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-PH", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function EmployeeAttendancePage() {
  const [records, setRecords] = useState<DTRRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchDTR = useCallback(async () => {
    setLoading(true);
    try {
      const [year, m] = month.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      const from = `${month}-01`;
      const to = `${month}-${lastDay}`;
      const res = await fetch(`/api/employee/me/dtr?from=${from}&to=${to}`);
      if (res.ok) setRecords(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [month]);

  useEffect(() => {
    fetchDTR();
  }, [fetchDTR]);

  // Summary
  const totalDays = records.filter((r) => (r.regular_hours ?? 0) > 0).length;
  const totalHours = records.reduce((s, r) => s + (r.total_hours_worked ?? 0), 0);
  const totalLate = records.reduce((s, r) => s + (r.late_minutes ?? 0), 0);
  const totalUndertime = records.reduce((s, r) => s + (r.undertime_minutes ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="t-display">
          My Attendance
        </h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="sw-panel p-4">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">Days Worked</p>
          <p className="text-xl font-semibold text-sw-ink-900">{totalDays}</p>
        </div>
        <div className="sw-panel p-4">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">Total Hours</p>
          <p className="text-xl font-semibold text-sw-ink-900">{totalHours.toFixed(1)}</p>
        </div>
        <div className="sw-panel p-4">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">Late (mins)</p>
          <p className="text-xl font-semibold text-sw-ink-900">{totalLate}</p>
        </div>
        <div className="sw-panel p-4">
          <p className="text-xs font-medium text-sw-ink-500 uppercase tracking-wider mb-1">Undertime (mins)</p>
          <p className="text-xl font-semibold text-sw-ink-900">{totalUndertime}</p>
        </div>
      </div>

      {/* DTR Table */}
      {loading ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">
          No attendance records for this month.
        </div>
      ) : (
        <div className="sw-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Date</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Time In</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Time Out</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Hours</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Late</th>
                <th className="text-right px-6 py-4 font-medium text-sw-ink-500">Undertime</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                  <td className="px-6 py-4.5 text-sw-ink-900 font-medium">{fmtDate(r.date)}</td>
                  <td className="px-6 py-4.5 text-sw-ink-700">{fmtTime(r.first_in)}</td>
                  <td className="px-6 py-4.5 text-sw-ink-700">{fmtTime(r.last_out)}</td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-900">
                    {(r.total_hours_worked ?? 0).toFixed(1)}
                  </td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-700">
                    {r.late_minutes > 0 ? (
                      <span className="text-sw-danger-500">{r.late_minutes}m</span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4.5 text-right tabular-nums text-sw-ink-700">
                    {r.undertime_minutes > 0 ? (
                      <span className="text-sw-danger-500">{r.undertime_minutes}m</span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4.5 text-sw-ink-500 text-xs">
                    {[
                      r.is_rest_day && "Rest Day",
                      r.is_holiday && (r.holiday_type === "regular" ? "Regular Holiday" : "Special Holiday"),
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
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
