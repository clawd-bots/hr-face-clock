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
  // Title block at the top — easier to identify the file once exported
  lines.push(`# ${report.title}`);
  if (report.subtitle) lines.push(`# ${report.subtitle}`);
  lines.push("");

  lines.push(report.headers.map(escape).join(","));

  if (report.rows.length === 0) {
    // Surface the empty state explicitly instead of producing a header-only file
    const colCount = report.headers.length || 1;
    const blanks = new Array(colCount - 1).fill("").map(escape);
    lines.push(["No data for this period.", ...blanks].join(","));
  } else {
    for (const row of report.rows) {
      lines.push(row.map(escape).join(","));
    }
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

  const bodyRows = report.rows.length === 0
    ? `<tr><td colspan="${report.headers.length || 1}" class="empty">No data for this period.</td></tr>`
    : report.rows
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
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; font-size: 11px; color: #392e25; background: #f5f0e8; }
    .report { width: 11in; margin: 20px auto; padding: 30px 40px; background: #faf8f2; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    h1 { font-size: 18px; font-weight: 600; color: #392e25; margin-bottom: 4px; letter-spacing: -0.3px; }
    .subtitle { font-size: 12px; color: #61474c; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; background: #f5f0e8; border-bottom: 2px solid #ffc671; color: #61474c; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 7px 10px; border-bottom: 1px solid #ece8df; font-size: 11px; color: #392e25; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.empty { text-align: center; color: #9c9690; font-style: italic; padding: 24px; }
    tr:hover { background: rgba(255,198,113,0.08); }
    .summary { margin-top: 16px; padding: 14px 16px; background: #f5f0e8; border-radius: 8px; }
    .summary-item { display: inline-block; margin-right: 24px; font-size: 11px; }
    .summary .label { font-weight: 600; color: #61474c; }
    .summary .value { color: #392e25; font-variant-numeric: tabular-nums; }
    .print-btn { display: block; margin: 20px auto; padding: 10px 30px; font-size: 14px; background: #ffc671; color: #392e25; border: none; border-radius: 999px; cursor: pointer; font-weight: 500; }
    .print-btn:hover { background: #f0b85c; }
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
