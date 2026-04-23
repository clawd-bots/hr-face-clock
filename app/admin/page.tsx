"use client";

import { useEffect, useState } from "react";
import { formatTime, formatHours } from "@/lib/utils";
import { cachedFetch } from "@/lib/swr-fetcher";
import { StatCard } from "@/components/ui/StatCard";
import { Chip } from "@/components/ui/Chip";
import type { Employee, TimeLog } from "@/lib/supabase";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayLogs, setTodayLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      cachedFetch<Employee[]>("/api/employees", { ttl: 120_000 }),
      cachedFetch<TimeLog[]>(`/api/time-logs?date=${today}`, { ttl: 30_000 }),
    ])
      .then(([emps, logs]) => {
        setEmployees(Array.isArray(emps) ? emps : []);
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
        <div className="animate-spin rounded-sw-full h-8 w-8 border-b-2 border-sw-gold-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="t-display mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Employees" value={employees.length} tone="gold" />
        <StatCard label="Currently In" value={clockedIn.length} tone="success" />
        <StatCard label="Clocked Out" value={clockedOut.length} tone="neutral" />
        <StatCard label="Total Hours Today" value={formatHours(totalHours)} tone="lilac" />
      </div>

      <div className="glass-card rounded-sw-xl p-8 mb-6">
        <h2 className="t-h4 mb-5 text-sw-ink-900">
          Currently Clocked In ({clockedIn.length})
        </h2>
        {clockedIn.length === 0 ? (
          <p className="t-body text-sw-ink-500">No one is currently clocked in.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clockedIn.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-4 bg-sw-cream-25 rounded-[16px] border border-sw-ink-100"
              >
                <div className="w-2.5 h-2.5 rounded-sw-full bg-sw-success-500 animate-pulse shrink-0" />
                <div>
                  <p className="text-sw-caption font-medium text-sw-ink-900">
                    {(log.employee as unknown as Employee)?.name || "Unknown"}
                  </p>
                  <p className="text-sw-micro font-medium text-sw-ink-500">
                    In since {formatTime(log.clock_in)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-sw-xl p-8">
        <h2 className="t-h4 mb-5 text-sw-ink-900">Today&apos;s Activity</h2>
        {todayLogs.length === 0 ? (
          <p className="t-body text-sw-ink-500">No activity yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-sw-ink-100">
                  <th className="pb-3 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Employee</th>
                  <th className="pb-3 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Clock In</th>
                  <th className="pb-3 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Clock Out</th>
                  <th className="pb-3 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500 text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((log) => (
                  <tr key={log.id} className="border-b border-sw-ink-100 last:border-0">
                    <td className="py-4 text-sw-caption font-medium text-sw-ink-900">
                      {(log.employee as unknown as Employee)?.name || "Unknown"}
                    </td>
                    <td className="py-4 text-sw-caption text-sw-ink-700">
                      {formatTime(log.clock_in)}
                    </td>
                    <td className="py-4 text-sw-caption text-sw-ink-700">
                      {log.clock_out ? formatTime(log.clock_out) : <Chip tone="success">Active</Chip>}
                    </td>
                    <td className="py-4 text-sw-caption text-sw-ink-700 text-right">
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
