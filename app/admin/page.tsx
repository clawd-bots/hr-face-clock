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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-andyou-accent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-andyou-heading-h1-primary text-andyou-text-primary mb-spacing-andyou-6">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-spacing-andyou-card-gap">
        <StatCard label="Total Employees" value={employees.length} color="accent" />
        <StatCard label="Currently In" value={clockedIn.length} color="green" />
        <StatCard label="Clocked Out" value={clockedOut.length} color="muted" />
        <StatCard label="Total Hours Today" value={formatHours(totalHours)} color="blue" />
      </div>

      {/* Currently clocked in */}
      <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-6 mt-spacing-andyou-6">
        <h2 className="text-andyou-heading-h3-primary text-andyou-text-primary mb-spacing-andyou-4">
          Currently Clocked In ({clockedIn.length})
        </h2>
        {clockedIn.length === 0 ? (
          <p className="text-andyou-body text-andyou-text-muted">No one is currently clocked in.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-spacing-andyou-3">
            {clockedIn.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-spacing-andyou-3 p-spacing-andyou-3 bg-andyou-warm-light rounded-andyou-md border border-andyou-border-default"
              >
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#cf9358" }} />
                <div>
                  <p className="text-andyou-body-sm text-andyou-text-primary">
                    {(log.employee as unknown as Employee)?.name || "Unknown"}
                  </p>
                  <p className="text-andyou-ui-badge text-andyou-text-muted">
                    In since {formatTime(log.clock_in)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's activity */}
      <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-6 mt-spacing-andyou-6">
        <h2 className="text-andyou-heading-h3-primary text-andyou-text-primary mb-spacing-andyou-4">
          Today&apos;s Activity
        </h2>
        {todayLogs.length === 0 ? (
          <p className="text-andyou-body text-andyou-text-muted">No activity yet today.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-andyou-border-default">
                <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Employee</th>
                <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Clock In</th>
                <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Clock Out</th>
                <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Hours</th>
              </tr>
            </thead>
            <tbody>
              {todayLogs.map((log) => (
                <tr key={log.id} className="border-b border-andyou-border-default last:border-0">
                  <td className="py-spacing-andyou-3 text-andyou-body-sm text-andyou-text-primary">
                    {(log.employee as unknown as Employee)?.name || "Unknown"}
                  </td>
                  <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">
                    {formatTime(log.clock_in)}
                  </td>
                  <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">
                    {log.clock_out ? formatTime(log.clock_out) : (
                      <span className="text-andyou-ui-badge px-spacing-andyou-2 py-spacing-andyou-1 rounded-andyou-badge" style={{ background: "rgba(207, 147, 88, 0.15)", color: "#9a6d2a" }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">
                    {formatHours(log.hours_worked)}
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
    accent: { bg: "rgba(255, 198, 113, 0.12)", border: "rgba(255, 198, 113, 0.3)", text: "#9a6d2a" },
    green: { bg: "rgba(207, 147, 88, 0.08)", border: "rgba(207, 147, 88, 0.2)", text: "#cf9358" },
    muted: { bg: "rgba(0, 0, 0, 0.03)", border: "rgba(0, 0, 0, 0.08)", text: "rgba(0,0,0,0.65)" },
    blue: { bg: "rgba(92, 140, 181, 0.08)", border: "rgba(92, 140, 181, 0.2)", text: "#37556e" },
  };
  const s = styles[color] || styles.muted;

  return (
    <div
      className="rounded-andyou-lg p-spacing-andyou-5 border"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <p className="text-andyou-ui-overline text-andyou-text-muted">{label}</p>
      <p className="text-andyou-heading-h2-primary mt-spacing-andyou-2" style={{ color: s.text }}>
        {value}
      </p>
    </div>
  );
}
