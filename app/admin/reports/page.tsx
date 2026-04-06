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
        log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : "\u2014",
        log.hours_worked?.toFixed(2) || "\u2014",
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
      <div className="flex justify-between items-center mb-spacing-andyou-6">
        <h1 className="text-andyou-heading-h1-primary text-andyou-text-primary">Reports</h1>
        <button
          onClick={handleExport}
          className="px-spacing-andyou-5 py-spacing-andyou-3 bg-andyou-black text-andyou-text-inverse rounded-andyou-full text-andyou-ui-label transition-all duration-andyou-fast hover:shadow-andyou-card-md"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-4 mb-spacing-andyou-6">
        <div className="flex flex-wrap gap-spacing-andyou-4">
          <div>
            <label className="block text-andyou-ui-overline text-andyou-text-muted mb-spacing-andyou-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-spacing-andyou-3 py-spacing-andyou-2 border border-andyou-border-default rounded-andyou-md text-andyou-body text-andyou-text-primary bg-andyou-white"
            />
          </div>
          <div>
            <label className="block text-andyou-ui-overline text-andyou-text-muted mb-spacing-andyou-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-spacing-andyou-3 py-spacing-andyou-2 border border-andyou-border-default rounded-andyou-md text-andyou-body text-andyou-text-primary bg-andyou-white"
            />
          </div>
          <div>
            <label className="block text-andyou-ui-overline text-andyou-text-muted mb-spacing-andyou-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-spacing-andyou-3 py-spacing-andyou-2 border border-andyou-border-default rounded-andyou-md text-andyou-body text-andyou-text-primary bg-andyou-white"
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

      {/* Summary */}
      {!loading && summary.length > 0 && (
        <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-6 mb-spacing-andyou-6">
          <h2 className="text-andyou-heading-h3-primary text-andyou-text-primary mb-spacing-andyou-4">
            Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-andyou-border-default">
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Employee</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Days Worked</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Total Hours</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Avg Hours/Day</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.id} className="border-b border-andyou-border-default last:border-0">
                    <td className="py-spacing-andyou-3 text-andyou-body-sm text-andyou-text-primary">{s.name}</td>
                    <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">{s.daysWorked}</td>
                    <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">{formatHours(s.totalHours)}</td>
                    <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">{formatHours(s.avgHoursPerDay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed logs */}
      <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-6">
        <h2 className="text-andyou-heading-h3-primary text-andyou-text-primary mb-spacing-andyou-4">
          Detailed Logs ({logs.length} entries)
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-andyou-accent" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-andyou-body text-andyou-text-muted">
            No attendance records for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-andyou-border-default">
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Employee</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Date</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Clock In</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Clock Out</th>
                  <th className="pb-spacing-andyou-2 text-andyou-ui-label text-andyou-text-muted">Hours</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-andyou-border-default last:border-0">
                    <td className="py-spacing-andyou-3 text-andyou-body-sm text-andyou-text-primary">
                      {(log.employee as unknown as Employee)?.name || "Unknown"}
                    </td>
                    <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">
                      {formatDate(log.date)}
                    </td>
                    <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">
                      {formatTime(log.clock_in)}
                    </td>
                    <td className="py-spacing-andyou-3 text-andyou-body text-andyou-text-secondary">
                      {log.clock_out ? (
                        formatTime(log.clock_out)
                      ) : (
                        <span
                          className="text-andyou-ui-badge px-spacing-andyou-2 py-spacing-andyou-1 rounded-andyou-badge"
                          style={{ background: "rgba(207, 147, 88, 0.15)", color: "#9a6d2a" }}
                        >
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
          </div>
        )}
      </div>
    </div>
  );
}
