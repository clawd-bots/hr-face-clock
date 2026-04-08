import { NextResponse } from "next/server";

const REPORT_TYPES = [
  {
    slug: "sss",
    name: "SSS Contribution Report (R3/R5)",
    category: "government",
    description: "Monthly SSS employee/employer contribution list",
    params: ["month", "year"],
  },
  {
    slug: "philhealth",
    name: "PhilHealth Remittance (RF-1)",
    category: "government",
    description: "Monthly PhilHealth contribution report",
    params: ["month", "year"],
  },
  {
    slug: "pagibig",
    name: "Pag-IBIG Contribution Schedule",
    category: "government",
    description: "Monthly Pag-IBIG/HDMF contribution list",
    params: ["month", "year"],
  },
  {
    slug: "bir-1601c",
    name: "BIR 1601-C Withholding Tax",
    category: "government",
    description: "Monthly withholding tax remittance report",
    params: ["month", "year"],
  },
  {
    slug: "bir-2316",
    name: "BIR 2316 Tax Certificate",
    category: "government",
    description: "Annual certificate of compensation/tax withheld per employee",
    params: ["year", "employee_id"],
  },
  {
    slug: "13th-month",
    name: "13th Month Pay",
    category: "government",
    description: "Year-end 13th month pay computation for all employees",
    params: ["year"],
  },
  {
    slug: "headcount",
    name: "Headcount Report",
    category: "hr",
    description: "Active employees by department, status, and gender",
    params: [],
  },
  {
    slug: "attendance-summary",
    name: "Attendance Summary",
    category: "hr",
    description: "Late/undertime/hours summary per employee",
    params: ["month", "year"],
  },
  {
    slug: "leave-utilization",
    name: "Leave Utilization",
    category: "hr",
    description: "Leave usage vs. entitlement per employee and type",
    params: ["year"],
  },
  {
    slug: "payroll-summary",
    name: "Payroll Summary",
    category: "payroll",
    description: "Summary of all payroll runs with totals",
    params: ["year"],
  },
  {
    slug: "employee-directory",
    name: "Employee Directory",
    category: "hr",
    description: "Exportable list of all active employees",
    params: [],
  },
];

export async function GET() {
  return NextResponse.json(REPORT_TYPES);
}
