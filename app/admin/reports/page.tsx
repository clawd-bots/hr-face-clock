"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";

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

export default function ReportsPage() {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setReportTypes)
      .catch(() => {});
  }, []);

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
    <div>
      <h1 className="t-display mb-8">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ReportGroup
          title="Government Compliance"
          reports={govReports}
          selectedSlug={selectedReport?.slug}
          onSelect={(r) => { setSelectedReport(r); setReportData(null); setError(""); }}
        />
        <ReportGroup
          title="HR & Analytics"
          reports={hrReports}
          selectedSlug={selectedReport?.slug}
          onSelect={(r) => { setSelectedReport(r); setReportData(null); setError(""); }}
        />
      </div>

      {selectedReport && (
        <div className="sw-panel p-6 mb-6">
          <h3 className="t-h5 mb-4 text-sw-ink-900">{selectedReport.name}</h3>

          <div className="flex flex-wrap gap-4 items-end">
            {selectedReport.params.includes("year") && (
              <div className="w-28">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                />
              </div>
            )}

            {selectedReport.params.includes("month") && (
              <div className="w-40">
                <Label>Month</Label>
                <Select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString("en-PH", { month: "long" })}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {selectedReport.slug === "bir-2316" && (
              <div className="min-w-[240px]">
                <Label>Employee</Label>
                <Select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {empName(e)} {e.employee_number ? `(${e.employee_number})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <Button
              variant="primary"
              onClick={generateReport}
              disabled={loading || (selectedReport.slug === "bir-2316" && !employeeId)}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>

            {reportData && (
              <>
                <Button variant="secondary" onClick={handleExportCSV}>Download CSV</Button>
                <Button variant="secondary" onClick={handleExportPDF}>Print / PDF</Button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
          {error}
        </div>
      )}

      {reportData && (
        <div className="sw-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-sw-ink-100">
            <h3 className="t-h5 text-sw-ink-900">{reportData.title}</h3>
            {reportData.subtitle && (
              <p className="text-sw-micro text-sw-ink-500 mt-0.5">{reportData.subtitle}</p>
            )}
          </div>

          {reportData.summary && (
            <div className="px-6 py-3 bg-sw-cream-25 border-b border-sw-ink-100 flex flex-wrap gap-6">
              {Object.entries(reportData.summary).map(([key, val]) => (
                <div key={key} className="text-sw-micro">
                  <span className="text-sw-ink-500">{key}: </span>
                  <span className="font-semibold text-sw-ink-900">{val}</span>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-sw-cream-25 border-b border-sw-ink-100">
                  {reportData.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500 whitespace-nowrap"
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
                    className="border-b border-sw-ink-100 last:border-0 hover:bg-sw-cream-25 transition-colors duration-sw-fast"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-3 text-sw-caption whitespace-nowrap ${
                          typeof cell === "number" || /^[\d,]+\.\d{2}$/.test(String(cell))
                            ? "text-right tabular-nums text-sw-ink-900"
                            : String(cell).startsWith("—")
                            ? "font-semibold text-sw-ink-500 pt-5"
                            : "text-sw-ink-700"
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
            <div className="px-6 py-8 text-center text-sw-caption text-sw-ink-500">
              No data found for the selected period.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportGroup({
  title,
  reports,
  selectedSlug,
  onSelect,
}: {
  title: string;
  reports: ReportType[];
  selectedSlug?: string;
  onSelect: (r: ReportType) => void;
}) {
  return (
    <div>
      <h2 className="text-sw-micro font-medium text-sw-ink-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="space-y-2">
        {reports.map((r) => (
          <button
            key={r.slug}
            onClick={() => onSelect(r)}
            data-active={selectedSlug === r.slug || undefined}
            className="sw-panel-item w-full text-left px-4 py-3"
          >
            <div className="text-sw-caption font-medium text-sw-ink-900">{r.name}</div>
            <div className="text-sw-micro text-sw-ink-500 mt-0.5">{r.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
