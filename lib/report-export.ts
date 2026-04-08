/**
 * Report Export Utilities
 * CSV and print-ready HTML generation. Zero dependencies.
 */

import type { ReportData } from "@/lib/report-generators";

/**
 * Generate a CSV string from report data.
 */
export function exportToCSV(report: ReportData): string {
  const escape = (val: string | number): string => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push(report.headers.map(escape).join(","));
  for (const row of report.rows) {
    lines.push(row.map(escape).join(","));
  }

  if (report.summary) {
    lines.push("");
    for (const [key, val] of Object.entries(report.summary)) {
      lines.push(`${escape(key)},${escape(val)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate a print-ready HTML page for a report.
 */
export function exportToHTML(report: ReportData): string {
  const headerCells = report.headers
    .map((h) => `<th>${h}</th>`)
    .join("");

  const bodyRows = report.rows
    .map((row) => {
      const cells = row
        .map((val) => {
          const isNum = typeof val === "number" || /^[\d,]+\.\d{2}$/.test(String(val));
          return `<td${isNum ? ' class="num"' : ""}>${val}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n");

  const summaryHTML = report.summary
    ? `<div class="summary">
        ${Object.entries(report.summary)
          .map(([k, v]) => `<div class="summary-item"><span class="label">${k}:</span> <span class="value">${v}</span></div>`)
          .join("")}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report.title}${report.subtitle ? ` — ${report.subtitle}` : ""}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #333; background: #f5f5f5; }
    .report { width: 11in; margin: 20px auto; padding: 30px 40px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 16px; font-weight: bold; color: #4a7c59; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; font-weight: bold; background: #f0f0f0; border-bottom: 2px solid #4a7c59; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    td.num, th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    tr:hover { background: #fafafa; }
    .summary { margin-top: 16px; padding: 12px; background: #f9f9f9; border: 1px solid #eee; }
    .summary-item { display: inline-block; margin-right: 24px; font-size: 11px; }
    .summary .label { font-weight: bold; }
    .print-btn { display: block; margin: 20px auto; padding: 10px 30px; font-size: 14px; font-family: system-ui; background: #4a7c59; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .print-btn:hover { background: #3d6a4c; }
    @media print {
      body { background: white; }
      .report { box-shadow: none; margin: 0; width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="report">
    <h1>${report.title}</h1>
    ${report.subtitle ? `<div class="subtitle">${report.subtitle}</div>` : ""}
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${summaryHTML}
  </div>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;
}
