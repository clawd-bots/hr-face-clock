"use client";

import { useEffect, useState } from "react";
import { formatTime, formatHours, formatDate } from "@/lib/utils";
import type { Employee, TimeLog } from "@/lib/supabase";

export default function ReportsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees);
  }, []);

  useEffect(() => {
    setLoading(true);
    let url = `/api/time-logs?from=${dateFrom}&to=${dateTo}`;
    if (selectedEmployee) url += `&employee_id=${selectedEmployee}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, selectedEmployee]);

  // Calculate summary per employee
  const summaryMap = new Map<
    string,
    { name: string; totalHours: number; daysWorked: Set<string> }
  >();
  for (const log of logs) {
    const emp = log.employee as unknown as Employee;
    const name = emp?.name || "Unknown";
    const id = log.employee_id;
    if (!summaryMap.has(id)) {
      summaryMap.set(id, { name, totalHours: 0, daysWorked: new Set() });
    }
    const entry = summaryMap.get(id)!;
    entry.totalHours += log.hours_worked || 0;
    entry.daysWorked.add(log.date);
  }
  const summary = Array.from(summaryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      totalHours: data.totalHours,
      daysWorked: data.daysWorked.size,
      avgHoursPerDay:
        data.daysWorked.size > 0 ? data.totalHours / data.daysWorked.size : 0,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const handleExport = () => {
    const rows = [
      ["Employee", "Date", "Clock In", "Clock Out", "Hours Worked"],
      ...logs.map((log) => [
        (log.employee as unknown as Employee)?.name || "Unknown",
        log.date,
        new Date(log.clock_in).toLocaleTimeString(),
        log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : "—",
        log.hours_worked?.toFixed(2) || "—",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && summary.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Days Worked</th>
                  <th className="pb-2 font-medium">Total Hours</th>
                  <th className="pb-2 font-medium">Avg Hours/Day</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">
                      {s.name}
                    </td>
                    <td className="py-3 text-gray-600">{s.daysWorked}</td>
                    <td className="py-3 text-gray-600">
                      {formatHours(s.totalHours)}
                    </td>
                    <td className="py-3 text-gray-600">
                      {formatHours(s.avgHoursPerDay)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Detailed Logs ({logs.length} entries)
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No attendance records for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Clock In</th>
                  <th className="pb-2 font-medium">Clock Out</th>
                  <th className="pb-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">
                      {(log.employee as unknown as Employee)?.name || "Unknown"}
                    </td>
                    <td className="py-3 text-gray-600">
                      {formatDate(log.date)}
                    </td>
                    <td className="py-3 text-gray-600">
                      {formatTime(log.clock_in)}
                    </td>
                    <td className="py-3 text-gray-600">
                      {log.clock_out ? (
                        formatTime(log.clock_out)
                      ) : (
                        <span className="text-green-600 font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-600">
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
