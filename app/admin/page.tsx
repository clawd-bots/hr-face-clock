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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Employees"
          value={employees.length}
          color="blue"
        />
        <StatCard
          label="Currently In"
          value={clockedIn.length}
          color="green"
        />
        <StatCard
          label="Clocked Out"
          value={clockedOut.length}
          color="gray"
        />
        <StatCard
          label="Total Hours Today"
          value={formatHours(totalHours)}
          color="purple"
        />
      </div>

      {/* Currently clocked in */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Currently Clocked In ({clockedIn.length})
        </h2>
        {clockedIn.length === 0 ? (
          <p className="text-gray-500 text-sm">No one is currently clocked in.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clockedIn.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="font-medium text-gray-900">
                    {(log.employee as unknown as Employee)?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    In since {formatTime(log.clock_in)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today&apos;s Activity
        </h2>
        {todayLogs.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet today.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-2 font-medium">Employee</th>
                <th className="pb-2 font-medium">Clock In</th>
                <th className="pb-2 font-medium">Clock Out</th>
                <th className="pb-2 font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {todayLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-gray-900">
                    {(log.employee as unknown as Employee)?.name || "Unknown"}
                  </td>
                  <td className="py-3 text-gray-600">
                    {formatTime(log.clock_in)}
                  </td>
                  <td className="py-3 text-gray-600">
                    {log.clock_out ? formatTime(log.clock_out) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </td>
                  <td className="py-3 text-gray-600">
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
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
