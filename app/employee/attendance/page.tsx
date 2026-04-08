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
        <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)]">
          My Attendance
        </h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-4">
          <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider mb-1">Days Worked</p>
          <p className="text-xl font-semibold text-[rgba(0,0,0,0.88)]">{totalDays}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-4">
          <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider mb-1">Total Hours</p>
          <p className="text-xl font-semibold text-[rgba(0,0,0,0.88)]">{totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-4">
          <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider mb-1">Late (mins)</p>
          <p className="text-xl font-semibold text-[rgba(0,0,0,0.88)]">{totalLate}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-4">
          <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider mb-1">Undertime (mins)</p>
          <p className="text-xl font-semibold text-[rgba(0,0,0,0.88)]">{totalUndertime}</p>
        </div>
      </div>

      {/* DTR Table */}
      {loading ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-[rgba(0,0,0,0.4)] text-sm">
          No attendance records for this month.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)]">
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Date</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Time In</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Time Out</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Hours</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Late</th>
                <th className="text-right px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Undertime</th>
                <th className="text-left px-5 py-3 font-medium text-[rgba(0,0,0,0.5)]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f9f8f3] transition-colors">
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.88)] font-medium">{fmtDate(r.date)}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{fmtTime(r.first_in)}</td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.65)]">{fmtTime(r.last_out)}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.88)]">
                    {(r.total_hours_worked ?? 0).toFixed(1)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {r.late_minutes > 0 ? (
                      <span className="text-[#c62828]">{r.late_minutes}m</span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[rgba(0,0,0,0.65)]">
                    {r.undertime_minutes > 0 ? (
                      <span className="text-[#c62828]">{r.undertime_minutes}m</span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[rgba(0,0,0,0.4)] text-xs">
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
