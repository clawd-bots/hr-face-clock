"use client";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyTimeRecord {
  id: string;
  date: string;
  first_in: string | null;
  last_out: string | null;
  total_hours_worked: number | null;
  regular_hours: number | null;
  night_diff_hours: number | null;
  late_minutes: number | null;
  undertime_minutes: number | null;
  is_rest_day: boolean;
  is_holiday: boolean;
  holiday_type: string | null;
  status: "computed" | "adjusted" | "approved";
  employee_id: string;
  schedule_id: string | null;
  employee: {
    id: string;
    name: string;
    employee_number?: string;
    department_id: string | null;
  } | null;
}

interface Department {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the current semi-monthly period boundaries. */
function getSemiMonthlyPeriod(): { from: string; to: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (day <= 15) {
    const from = new Date(year, month, 1);
    const to = new Date(year, month, 15);
    return { from: fmt(from), to: fmt(to) };
  } else {
    const from = new Date(year, month, 16);
    const to = new Date(year, month + 1, 0); // last day of month
    return { from: fmt(from), to: fmt(to) };
  }
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "—";
  // timeStr could be "HH:mm:ss" or an ISO timestamp
  const d = timeStr.includes("T") ? new Date(timeStr) : new Date(`1970-01-01T${timeStr}`);
  if (isNaN(d.getTime())) return timeStr;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatHours(val: number | null): string {
  if (val == null) return "—";
  return val.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AttendancePage() {
  const period = getSemiMonthlyPeriod();

  const [records, setRecords] = useState<DailyTimeRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Filters
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (departmentId) params.set("department_id", departmentId);
      const res = await fetch(`/api/dtr?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to, departmentId]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ---------------------------------------------------------------------------
  // Filtered records
  // ---------------------------------------------------------------------------

  const filtered = records.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = r.employee?.name?.toLowerCase() ?? "";
      const num = r.employee?.employee_number?.toLowerCase() ?? "";
      if (!name.includes(q) && !num.includes(q)) return false;
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const totalRecords = filtered.length;
  const avgHours =
    totalRecords > 0
      ? filtered.reduce((sum, r) => sum + (r.total_hours_worked ?? 0), 0) / totalRecords
      : 0;
  const totalLateHours =
    filtered.reduce((sum, r) => sum + (r.late_minutes ?? 0), 0) / 60;
  const totalUndertimeHours =
    filtered.reduce((sum, r) => sum + (r.undertime_minutes ?? 0), 0) / 60;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCompute = async () => {
    setComputing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dtr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(`Computed ${data.computed} records`);
        await fetchRecords();
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch {
      setMessage("Failed to compute DTR");
    } finally {
      setComputing(false);
    }
  };

  const handleBulkApprove = async () => {
    const approvable = filtered.filter(
      (r) => r.status === "computed" || r.status === "adjusted",
    );
    if (approvable.length === 0) {
      setMessage("No records to approve");
      return;
    }
    if (!confirm(`Approve ${approvable.length} records?`)) return;

    setApproving(true);
    setMessage(null);
    let approved = 0;
    for (const record of approvable) {
      try {
        const res = await fetch(`/api/dtr/${record.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });
        if (res.ok) approved++;
      } catch {}
    }
    setMessage(`Approved ${approved} of ${approvable.length} records`);
    await fetchRecords();
    setApproving(false);
  };

  // ---------------------------------------------------------------------------
  // Status badge
  // ---------------------------------------------------------------------------

  function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, { bg: string; text: string }> = {
      computed: { bg: "rgba(0,0,0,0.06)", text: "rgba(0,0,0,0.55)" },
      adjusted: { bg: "rgba(207,147,88,0.15)", text: "#9a6d2a" },
      approved: { bg: "rgba(34,139,34,0.10)", text: "#1a7a1a" },
    };
    const s = styles[status] ?? styles.computed;
    return (
      <span
        className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize"
        style={{ background: s.bg, color: s.text }}
      >
        {status}
      </span>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-mesh-attendance">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[28px] font-medium tracking-[-1.75px] text-[rgba(0,0,0,0.88)]">
          Attendance
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleBulkApprove}
            disabled={approving}
            className="px-5 py-2.5 rounded-full text-sm font-medium border border-[rgba(0,0,0,0.12)] text-[rgba(0,0,0,0.65)] bg-white hover:bg-[#f4f1e6] transition-all duration-150 disabled:opacity-50"
          >
            {approving ? "Approving..." : "Bulk Approve"}
          </button>
          <button
            onClick={handleCompute}
            disabled={computing}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] disabled:opacity-50"
            style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
          >
            {computing ? "Computing..." : "Compute DTR"}
          </button>
        </div>
      </div>

      {/* Success / error message */}
      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-white border border-[rgba(0,0,0,0.06)] text-sm text-[rgba(0,0,0,0.65)]">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[rgba(0,0,0,0.4)] uppercase tracking-wide">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
          />
        </div>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee..."
          className="h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.35)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] min-w-[180px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
        >
          <option value="all">All Statuses</option>
          <option value="computed">Computed</option>
          <option value="adjusted">Adjusted</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Records", value: totalRecords.toString() },
          { label: "Avg Hours", value: formatHours(avgHours) },
          { label: "Total Late", value: `${totalLateHours.toFixed(1)}h` },
          { label: "Total Undertime", value: `${totalUndertimeHours.toFixed(1)}h` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl px-5 py-4"
          >
            <p className="text-xs text-[rgba(0,0,0,0.4)] uppercase tracking-wide mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-medium text-[rgba(0,0,0,0.88)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffc671]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] p-16 text-center">
          <p className="text-base text-[rgba(0,0,0,0.4)]">
            {records.length === 0
              ? "No DTR records found for this period. Click \"Compute DTR\" to generate."
              : "No records match your filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-[#f4f1e6] border-b border-[rgba(0,0,0,0.06)]">
                  {[
                    "Employee",
                    "Date",
                    "Schedule",
                    "In",
                    "Out",
                    "Hours",
                    "Regular",
                    "Night Diff",
                    "Late",
                    "Undertime",
                    "Status",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[#fafaf2] transition-colors duration-150 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-[rgba(0,0,0,0.88)]">
                        {r.employee?.name ?? "—"}
                      </span>
                      {r.employee?.employee_number && (
                        <span className="ml-1.5 text-xs text-[rgba(0,0,0,0.35)]">
                          #{r.employee.employee_number}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.65)] whitespace-nowrap">
                      {formatShortDate(r.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.65)]">
                      {r.is_rest_day
                        ? "Rest Day"
                        : r.is_holiday
                          ? r.holiday_type ?? "Holiday"
                          : r.schedule_id
                            ? "Regular"
                            : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.65)] whitespace-nowrap">
                      {formatTime(r.first_in)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.65)] whitespace-nowrap">
                      {formatTime(r.last_out)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.88)] font-medium">
                      {formatHours(r.total_hours_worked)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.65)]">
                      {formatHours(r.regular_hours)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[rgba(0,0,0,0.65)]">
                      {formatHours(r.night_diff_hours)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span
                        className={
                          (r.late_minutes ?? 0) > 0
                            ? "text-red-600 font-medium"
                            : "text-[rgba(0,0,0,0.4)]"
                        }
                      >
                        {r.late_minutes != null ? `${r.late_minutes}m` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span
                        className={
                          (r.undertime_minutes ?? 0) > 0
                            ? "text-red-600 font-medium"
                            : "text-[rgba(0,0,0,0.4)]"
                        }
                      >
                        {r.undertime_minutes != null
                          ? `${r.undertime_minutes}m`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
