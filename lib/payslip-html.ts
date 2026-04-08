/**
 * Payslip HTML Generator
 *
 * Generates a print-ready HTML page for payslips matching the sample layout.
 * Opens in a new tab for Print → Save as PDF.
 * Zero dependencies — pure HTML/CSS string generation.
 */

type PayslipItem = {
  employeeNumber: string;
  employeeName: string;
  position: string;
  basicSalary: number;
  deMinimisAllowance: number;
  lateAbsences: number;
  adjustments: number;
  sss: number;
  philHealth: number;
  pagibig: number;
  withholdingTax: number;
  grossEarnings: number;
  totalGovtDeductions: number;
  netEarnings: number;
  totalOthers: number;
};

type PayslipData = {
  companyName: string;
  periodStart: string;
  periodEnd: string;
  payableDate: string;
  items: PayslipItem[];
};

function fmt(n: number): string {
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function renderPayslip(data: PayslipData, item: PayslipItem): string {
  return `
    <div class="payslip">
      <div class="header">
        <div class="company-name">${data.companyName}</div>
      </div>

      <div class="title-bar">EMPLOYEE OFFICIAL PAYSLIP</div>
      <div class="subtitle-bar">PAYOUT INFORMATION</div>

      <table class="info-table">
        <tr>
          <td class="label">EMPLOYEE NUMBER</td>
          <td class="value">${item.employeeNumber}</td>
          <td class="label">PERIOD START DATE</td>
          <td class="value right">${fmtDate(data.periodStart)}</td>
        </tr>
        <tr>
          <td class="label">EMPLOYEE NAME</td>
          <td class="value">${item.employeeName}</td>
          <td class="label">PERIOD END DATE</td>
          <td class="value right">${fmtDate(data.periodEnd)}</td>
        </tr>
        <tr>
          <td class="label">COMPANY</td>
          <td class="value">${data.companyName}</td>
          <td class="label">PAYABLE DATE</td>
          <td class="value right">${fmtDate(data.payableDate)}</td>
        </tr>
        <tr>
          <td class="label">POSITION</td>
          <td class="value">${item.position}</td>
          <td></td>
          <td></td>
        </tr>
      </table>

      <div class="section-bar">GROSS EARNINGS</div>

      <table class="earnings-table">
        <tr>
          <td class="earnings-label">(+)BASIC SALARY EARNED</td>
          <td class="earnings-value">${fmt(item.basicSalary)}</td>
          <td class="earnings-label">(-)SSS CONTRIBUTION</td>
          <td class="earnings-value">${fmt(item.sss)}</td>
        </tr>
        <tr>
          <td class="earnings-label">(+)DE MINIMIS / ALLOWANCE, NET</td>
          <td class="earnings-value">${fmt(item.deMinimisAllowance)}</td>
          <td class="earnings-label">(-)PHIL HEALTH</td>
          <td class="earnings-value">${fmt(item.philHealth)}</td>
        </tr>
        <tr>
          <td class="earnings-label">(-)LATE &amp; ABSENCES</td>
          <td class="earnings-value">${fmt(item.lateAbsences)}</td>
          <td class="earnings-label">(-)PAGIBIG</td>
          <td class="earnings-value">${fmt(item.pagibig)}</td>
        </tr>
        <tr>
          <td class="earnings-label">(+)ADJUSTMENTS ON SALARY</td>
          <td class="earnings-value">${fmt(item.adjustments)}</td>
          <td class="earnings-label">(-)WITHHOLDING TAX</td>
          <td class="earnings-value">${fmt(item.withholdingTax)}</td>
        </tr>
      </table>

      <table class="summary-table">
        <tr>
          <td class="summary-label dark">GROSS EARNINGS</td>
          <td class="summary-value dark">\u20B1${fmt(item.grossEarnings)}</td>
          <td class="summary-label">NET EARNINGS</td>
          <td class="summary-value highlight">\u20B1${fmt(item.netEarnings)}</td>
        </tr>
        <tr>
          <td class="summary-label dark">TOTAL GOVT DEDUCTIONS</td>
          <td class="summary-value dark">\u20B1${fmt(item.totalGovtDeductions)}</td>
          <td class="summary-label">TOTAL OTHERS</td>
          <td class="summary-value">${item.totalOthers > 0 ? "\u20B1" + fmt(item.totalOthers) : ""}</td>
        </tr>
      </table>

      <div class="footer">
        ***This is a computer-generated document. No signature is required.***
      </div>
    </div>
  `;
}

export function generatePayslipHTML(data: PayslipData): string {
  const payslips = data.items.map((item) => renderPayslip(data, item)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip — ${data.companyName} — ${fmtDate(data.periodStart)} to ${fmtDate(data.periodEnd)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #333;
      background: #f5f5f5;
    }

    .payslip {
      width: 8.5in;
      min-height: 5.5in;
      margin: 20px auto;
      padding: 30px 40px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 16px;
    }

    .company-name {
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #4a7c59;
    }

    .title-bar {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      padding: 4px;
      border-top: 2px solid #4a7c59;
      border-bottom: 1px dotted #999;
      background: #f9f9f9;
    }

    .subtitle-bar {
      text-align: center;
      font-size: 10px;
      font-weight: bold;
      padding: 3px;
      background: #eee;
      border-bottom: 1px dotted #999;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .info-table td {
      padding: 3px 8px;
      vertical-align: top;
    }

    .info-table .label {
      font-weight: bold;
      font-size: 10px;
      width: 22%;
    }

    .info-table .value {
      font-size: 11px;
      width: 28%;
    }

    .info-table .right {
      text-align: right;
    }

    .section-bar {
      text-align: center;
      font-weight: bold;
      font-size: 10px;
      padding: 4px;
      background: #eee;
      border-top: 1px dotted #999;
      border-bottom: 1px dotted #999;
      margin-bottom: 8px;
    }

    .earnings-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .earnings-table td {
      padding: 3px 8px;
    }

    .earnings-label {
      font-size: 10px;
      width: 30%;
    }

    .earnings-value {
      text-align: right;
      font-size: 11px;
      width: 20%;
      font-variant-numeric: tabular-nums;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 20px;
      border: 1px dotted #999;
    }

    .summary-table td {
      padding: 5px 8px;
    }

    .summary-label {
      font-weight: bold;
      font-size: 10px;
      width: 25%;
    }

    .summary-label.dark {
      background: #4a7c59;
      color: white;
    }

    .summary-value {
      text-align: right;
      font-size: 12px;
      font-weight: bold;
      width: 25%;
      font-variant-numeric: tabular-nums;
    }

    .summary-value.dark {
      background: #4a7c59;
      color: white;
    }

    .summary-value.highlight {
      font-size: 14px;
      color: #4a7c59;
    }

    .footer {
      text-align: center;
      font-style: italic;
      font-size: 10px;
      color: #888;
      margin-top: 24px;
    }

    @media print {
      body { background: white; }
      .payslip {
        box-shadow: none;
        margin: 0;
        padding: 20px 30px;
        page-break-after: always;
      }
      .payslip:last-child {
        page-break-after: avoid;
      }
      .no-print { display: none; }
    }

    .print-button {
      display: block;
      margin: 20px auto;
      padding: 10px 30px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      background: #4a7c59;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .print-button:hover { background: #3d6a4c; }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">
    Print / Save as PDF
  </button>

  ${payslips}

  <button class="print-button no-print" onclick="window.print()">
    Print / Save as PDF
  </button>
</body>
</html>`;
}
