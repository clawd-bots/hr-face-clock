"use client";

import { useEffect, useState } from "react";
import { formatTime, formatHours } from "@/lib/utils";
import type { Employee, TimeLog } from "@/lib/supabase";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayLogs, setTodayLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch(`/api/time-logs?date=${today}`).then((r) => r.json()),
    ])
      .then(([emps, logs]) => {
        setEmployees(emps);
        setTodayLogs(Array.isArray(logs) ? logs : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const clockedIn = todayLogs.filter((l) => !l.clock_out);
  const clockedOut = todayLogs.filter((l) => l.clock_out);
  const totalHours = todayLogs.reduce(
    (sum, l) => sum + (l.hours_worked || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffc671]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)] mb-8">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Employees" value={employees.length} color="accent" />
        <StatCard label="Currently In" value={clockedIn.length} color="green" />
        <StatCard label="Clocked Out" value={clockedOut.length} color="muted" />
        <StatCard label="Total Hours Today" value={formatHours(totalHours)} color="blue" />
      </div>

      {/* Currently clocked in */}
      <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 mb-6">
        <h2 className="text-xl font-medium tracking-[-1px] leading-[1.2] text-[rgba(0,0,0,0.88)] mb-5">
          Currently Clocked In ({clockedIn.length})
        </h2>
        {clockedIn.length === 0 ? (
          <p className="text-base text-[rgba(0,0,0,0.4)]">No one is currently clocked in.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clockedIn.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-4 bg-[#fafaf2] rounded-2xl border border-[rgba(0,0,0,0.06)]"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#cf9358] animate-pulse shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[rgba(0,0,0,0.88)]">
                    {(log.employee as unknown as Employee)?.name || "Unknown"}
                  </p>
                  <p className="text-xs font-medium text-[rgba(0,0,0,0.4)]">
                    In since {formatTime(log.clock_in)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's activity */}
      <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8">
        <h2 className="text-xl font-medium tracking-[-1px] leading-[1.2] text-[rgba(0,0,0,0.88)] mb-5">
          Today&apos;s Activity
        </h2>
        {todayLogs.length === 0 ? (
          <p className="text-base text-[rgba(0,0,0,0.4)]">No activity yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-[rgba(0,0,0,0.08)]">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Employee</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Clock In</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Clock Out</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)] text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                    <td className="py-4 text-sm font-medium text-[rgba(0,0,0,0.88)]">
                      {(log.employee as unknown as Employee)?.name || "Unknown"}
                    </td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">
                      {formatTime(log.clock_in)}
                    </td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">
                      {log.clock_out ? formatTime(log.clock_out) : (
                        <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[rgba(207,147,88,0.12)] text-[#9a6d2a]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)] text-right">
                      {formatHours(log.hours_worked)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    accent: { bg: "rgba(255,198,113,0.1)", border: "rgba(255,198,113,0.25)", text: "#9a6d2a" },
    green: { bg: "rgba(207,147,88,0.08)", border: "rgba(207,147,88,0.2)", text: "#cf9358" },
    muted: { bg: "rgba(0,0,0,0.02)", border: "rgba(0,0,0,0.06)", text: "rgba(0,0,0,0.65)" },
    blue: { bg: "rgba(92,140,181,0.08)", border: "rgba(92,140,181,0.2)", text: "#37556e" },
  };
  const s = styles[color] || styles.muted;

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
        {label}
      </p>
      <p className="text-[28px] font-medium tracking-[-1.75px] leading-none mt-2" style={{ color: s.text }}>
        {value}
      </p>
    </div>
  );
}
