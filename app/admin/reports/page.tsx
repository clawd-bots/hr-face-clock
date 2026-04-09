"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportType = {
  slug: string;
  name: string;
  category: string;
  description: string;
  params: string[];
};

type ReportData = {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: Record<string, string | number>;
};

type Employee = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  employee_number?: string;
};

function empName(e?: Employee): string {
  if (!e) return "—";
  if (e.first_name) return `${e.first_name} ${e.last_name ?? ""}`.trim();
  return e.name ?? "—";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Config state
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");

  // Load report types
  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setReportTypes)
      .catch(() => {});
  }, []);

  // Load employees (for BIR 2316)
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => {});
  }, []);

  const generateReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError("");
    setReportData(null);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      if (selectedReport.params.includes("month")) params.set("month", String(month));
      if (selectedReport.slug === "bir-2316" && employeeId) params.set("employee_id", employeeId);

      const res = await fetch(`/api/reports/${selectedReport.slug}?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate report");
      }
      setReportData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [selectedReport, year, month, employeeId]);

  function handleExportCSV() {
    if (!selectedReport) return;
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("format", "csv");
    if (selectedReport.params.includes("month")) params.set("month", String(month));
    if (selectedReport.slug === "bir-2316" && employeeId) params.set("employee_id", employeeId);
    window.open(`/api/reports/${selectedReport.slug}?${params}`, "_blank");
  }

  function handleExportPDF() {
    if (!selectedReport) return;
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("format", "html");
    if (selectedReport.params.includes("month")) params.set("month", String(month));
    if (selectedReport.slug === "bir-2316" && employeeId) params.set("employee_id", employeeId);
    window.open(`/api/reports/${selectedReport.slug}?${params}`, "_blank");
  }

  const govReports = reportTypes.filter((r) => r.category === "government");
  const hrReports = reportTypes.filter((r) => r.category === "hr" || r.category === "payroll");

  return (
    <div className="bg-mesh-reports">
      <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)] mb-8">
        Reports
      </h1>

      {/* Report Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Government Compliance */}
        <div>
          <h2 className="text-sm font-semibold text-[rgba(0,0,0,0.5)] uppercase tracking-wider mb-3">
            Government Compliance
          </h2>
          <div className="space-y-2">
            {govReports.map((r) => (
              <button
                key={r.slug}
                onClick={() => { setSelectedReport(r); setReportData(null); setError(""); }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedReport?.slug === r.slug
                    ? "border-[#cf9358] bg-[rgba(255,198,113,0.08)]"
                    : "border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.15)]"
                }`}
              >
                <div className="text-sm font-medium text-[rgba(0,0,0,0.88)]">{r.name}</div>
                <div className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">{r.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* HR & Analytics */}
        <div>
          <h2 className="text-sm font-semibold text-[rgba(0,0,0,0.5)] uppercase tracking-wider mb-3">
            HR &amp; Analytics
          </h2>
          <div className="space-y-2">
            {hrReports.map((r) => (
              <button
                key={r.slug}
                onClick={() => { setSelectedReport(r); setReportData(null); setError(""); }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedReport?.slug === r.slug
                    ? "border-[#cf9358] bg-[rgba(255,198,113,0.08)]"
                    : "border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.15)]"
                }`}
              >
                <div className="text-sm font-medium text-[rgba(0,0,0,0.88)]">{r.name}</div>
                <div className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">{r.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {selectedReport && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-6 mb-6">
          <h3 className="text-sm font-semibold text-[rgba(0,0,0,0.88)] mb-4">
            {selectedReport.name}
          </h3>

          <div className="flex flex-wrap gap-4 items-end">
            {selectedReport.params.includes("year") && (
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="h-10 w-24 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                />
              </div>
            )}

            {selectedReport.params.includes("month") && (
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString("en-PH", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedReport.slug === "bir-2316" && (
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Employee</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {empName(e)} {e.employee_number ? `(${e.employee_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={generateReport}
              disabled={loading || (selectedReport.slug === "bir-2316" && !employeeId)}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              {loading ? "Generating..." : "Generate"}
            </button>

            {reportData && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-full text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.12)] hover:bg-[#f4f1e6] transition-colors"
                >
                  Download CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2.5 rounded-full text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.12)] hover:bg-[#f4f1e6] transition-colors"
                >
                  Print / PDF
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.06)]">
            <h3 className="text-sm font-semibold text-[rgba(0,0,0,0.88)]">{reportData.title}</h3>
            {reportData.subtitle && (
              <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">{reportData.subtitle}</p>
            )}
          </div>

          {/* Summary */}
          {reportData.summary && (
            <div className="px-5 py-3 bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)] flex flex-wrap gap-6">
              {Object.entries(reportData.summary).map(([key, val]) => (
                <div key={key} className="text-xs">
                  <span className="text-[rgba(0,0,0,0.4)]">{key}: </span>
                  <span className="font-semibold text-[rgba(0,0,0,0.88)]">{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f9f8f3] border-b border-[rgba(0,0,0,0.06)]">
                  {reportData.headers.map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 font-medium text-[rgba(0,0,0,0.5)] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f9f8f3] transition-colors"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-3 whitespace-nowrap ${
                          typeof cell === "number" || /^[\d,]+\.\d{2}$/.test(String(cell))
                            ? "text-right tabular-nums text-[rgba(0,0,0,0.88)]"
                            : String(cell).startsWith("—")
                            ? "font-semibold text-[rgba(0,0,0,0.5)] pt-5"
                            : "text-[rgba(0,0,0,0.65)]"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reportData.rows.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[rgba(0,0,0,0.4)]">
              No data found for the selected period.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
