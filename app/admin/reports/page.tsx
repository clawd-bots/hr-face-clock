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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)]">
          Reports
        </h1>
        <button
          onClick={handleExport}
          className="px-5 py-3 bg-[#000] text-white rounded-full text-sm font-medium transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 mb-6">
        <div className="flex flex-wrap gap-5 items-end">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)] mb-2">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 px-3 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] bg-[#fafaf2]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)] mb-2">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 px-3 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] bg-[#fafaf2]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)] mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="h-10 px-3 border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] bg-[#fafaf2]"
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
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8 mb-6">
          <h2 className="text-xl font-medium tracking-[-1px] leading-[1.2] text-[rgba(0,0,0,0.88)] mb-5">
            Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-[rgba(0,0,0,0.08)]">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Employee</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Days Worked</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Total Hours</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Avg Hours/Day</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                    <td className="py-4 text-sm font-medium text-[rgba(0,0,0,0.88)]">{s.name}</td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">{s.daysWorked}</td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">{formatHours(s.totalHours)}</td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">{formatHours(s.avgHoursPerDay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed logs */}
      <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8">
        <h2 className="text-xl font-medium tracking-[-1px] leading-[1.2] text-[rgba(0,0,0,0.88)] mb-5">
          Detailed Logs ({logs.length} entries)
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffc671]" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-base text-[rgba(0,0,0,0.4)]">
            No attendance records for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-[rgba(0,0,0,0.08)]">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Employee</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Date</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Clock In</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Clock Out</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)] text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                    <td className="py-4 text-sm font-medium text-[rgba(0,0,0,0.88)]">
                      {(log.employee as unknown as Employee)?.name || "Unknown"}
                    </td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">
                      {formatDate(log.date)}
                    </td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">
                      {formatTime(log.clock_in)}
                    </td>
                    <td className="py-4 text-sm text-[rgba(0,0,0,0.65)]">
                      {log.clock_out ? (
                        formatTime(log.clock_out)
                      ) : (
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
