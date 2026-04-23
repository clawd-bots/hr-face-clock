// Seeds the demo Sweldo project with sample data for UI review.
// Run with: node scripts/seed-demo.mjs
// Prereqs: `/api/setup` already ran (creates company + super admin).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---- load env from .env.local ----
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---- helpers ----
const log = (msg) => console.log(`  → ${msg}`);
const fail = (label, err) => {
  if (err) {
    console.error(`✗ ${label}:`, err.message || err);
    process.exit(1);
  }
};
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const isoDate = (d) => d.toISOString().slice(0, 10);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---- 1. find the company (already created via /api/setup) ----
const { data: companies, error: ce } = await sb.from("companies").select("*").limit(1);
fail("find company", ce);
if (!companies.length) {
  console.error("No company found. Run /api/setup first.");
  process.exit(1);
}
const company = companies[0];
console.log(`Seeding for company: ${company.name} (${company.id})`);

// ---- 2. departments ----
console.log("\n[1/9] Departments");
const deptRows = [
  { name: "Engineering", code: "ENG" },
  { name: "Human Resources", code: "HR" },
  { name: "Operations", code: "OPS" },
  { name: "Finance", code: "FIN" },
  { name: "Sales", code: "SALES" },
].map((d) => ({ ...d, company_id: company.id }));

const { data: depts, error: de } = await sb
  .from("departments")
  .upsert(deptRows, { onConflict: "company_id,name" })
  .select();
fail("seed departments", de);
depts.forEach((d) => log(`${d.name} (${d.code})`));

const byDept = Object.fromEntries(depts.map((d) => [d.code, d.id]));

// ---- 3. employees ----
console.log("\n[2/9] Employees");
const employeeDefs = [
  { first: "Angela", last: "Cruz",   gender: "F", dept: "HR",    pos: "HR Lead",              status: "regular",     hire: daysAgo(900) },
  { first: "Miguel", last: "Reyes",  gender: "M", dept: "FIN",   pos: "Payroll Officer",      status: "regular",     hire: daysAgo(820) },
  { first: "Priya",  last: "Nair",   gender: "F", dept: "ENG",   pos: "Senior Engineer",      status: "regular",     hire: daysAgo(730) },
  { first: "Juan",   last: "Dela Cruz", gender: "M", dept: "ENG", pos: "Full-stack Engineer", status: "regular",     hire: daysAgo(510) },
  { first: "Maria",  last: "Santos", gender: "F", dept: "ENG",   pos: "QA Engineer",          status: "regular",     hire: daysAgo(420) },
  { first: "Jose",   last: "Garcia", gender: "M", dept: "OPS",   pos: "Operations Manager",   status: "regular",     hire: daysAgo(1200) },
  { first: "Ana",    last: "Villanueva", gender: "F", dept: "OPS", pos: "Operations Analyst", status: "regular",     hire: daysAgo(360) },
  { first: "Carlos", last: "Mendoza",gender: "M", dept: "SALES", pos: "Account Executive",    status: "regular",     hire: daysAgo(280) },
  { first: "Bianca", last: "Tan",    gender: "F", dept: "SALES", pos: "Sales Associate",      status: "probationary", hire: daysAgo(90) },
  { first: "Paolo",  last: "Ramos",  gender: "M", dept: "FIN",   pos: "Accountant",           status: "regular",     hire: daysAgo(640) },
  { first: "Kim",    last: "Uy",     gender: "F", dept: "HR",    pos: "Recruiter",            status: "probationary", hire: daysAgo(120) },
  { first: "Isabela",last: "Fernandez",gender: "F",dept: "ENG",  pos: "Frontend Engineer",    status: "regular",     hire: daysAgo(210) },
];
const employeeRows = employeeDefs.map((e, i) => ({
  company_id: company.id,
  name: `${e.first} ${e.last}`,
  first_name: e.first,
  last_name: e.last,
  gender: e.gender,
  employee_number: `EMP-${String(1001 + i)}`,
  department: depts.find((d) => d.code === e.dept).name,
  department_id: byDept[e.dept],
  position_title: e.pos,
  role: e.pos,
  employment_status: e.status,
  hire_date: isoDate(e.hire),
  regularization_date: e.status === "regular" ? isoDate(new Date(e.hire.getTime() + 183 * 86400e3)) : null,
  work_email: `${e.first.toLowerCase()}.${e.last.toLowerCase().replace(/\s/g, "")}@sweldodemo.com`,
  phone: `+63 917 ${Math.floor(1000000 + Math.random() * 9000000)}`,
  nationality: "Filipino",
  pay_frequency: "semi_monthly",
  active: true,
  face_descriptors: [],
}));

const { data: employees, error: ee } = await sb
  .from("employees")
  .insert(employeeRows)
  .select();
fail("seed employees", ee);
employees.forEach((e) => log(`${e.name} — ${e.position_title}`));

// ---- 4. work schedule + assignments ----
console.log("\n[3/9] Work schedule");
const { data: sched, error: se } = await sb
  .from("work_schedules")
  .insert({
    company_id: company.id,
    name: "Standard 9-to-6",
    start_time: "09:00",
    end_time: "18:00",
    break_minutes: 60,
    grace_period_minutes: 10,
    work_days: [1, 2, 3, 4, 5],
  })
  .select()
  .single();
fail("seed schedule", se);
log(`${sched.name}`);

const empSchedRows = employees.map((e) => ({
  company_id: company.id,
  employee_id: e.id,
  schedule_id: sched.id,
  effective_from: e.hire_date,
}));
const { error: esErr } = await sb.from("employee_schedules").insert(empSchedRows);
fail("assign schedules", esErr);
log(`assigned to ${empSchedRows.length} employees`);

// ---- 5. holidays (via Postgres RPC) ----
console.log("\n[4/9] Philippine holidays 2026");
const { error: hErr } = await sb.rpc("seed_holidays_2026", { p_company_id: company.id });
fail("seed holidays", hErr);
const { count: hCount } = await sb
  .from("holidays")
  .select("*", { count: "exact", head: true })
  .eq("company_id", company.id);
log(`${hCount} holidays seeded`);

// ---- 6. leave types (via Postgres RPC) ----
console.log("\n[5/9] Leave types");
const { error: ltErr } = await sb.rpc("seed_ph_leave_types", { p_company_id: company.id });
fail("seed leave types", ltErr);
const { data: leaveTypes } = await sb
  .from("leave_types")
  .select("*")
  .eq("company_id", company.id);
leaveTypes.forEach((lt) => log(`${lt.name} — ${lt.default_entitled_days}d`));

// ---- 7. leave balances (one per employee × leave type, 2026) ----
console.log("\n[6/9] Leave balances");
const balanceRows = [];
for (const emp of employees) {
  for (const lt of leaveTypes) {
    balanceRows.push({
      company_id: company.id,
      employee_id: emp.id,
      leave_type_id: lt.id,
      year: 2026,
      entitled_days: lt.default_entitled_days ?? 0,
      used_days: Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0,
    });
  }
}
const { error: lbErr } = await sb.from("leave_balances").insert(balanceRows);
fail("seed leave balances", lbErr);
log(`${balanceRows.length} balances inserted`);

// ---- 8. a few sample leave requests (varied statuses) ----
console.log("\n[7/9] Leave requests");
const admin = employees[0]; // use first employee as the approver
const leaveRequests = [
  {
    employee: employees[2], lt: leaveTypes[0],
    start: daysAgo(-14), end: daysAgo(-12), status: "pending", reason: "Family event",
  },
  {
    employee: employees[3], lt: leaveTypes[1],
    start: daysAgo(5), end: daysAgo(4), status: "approved", reason: "Flu",
  },
  {
    employee: employees[5], lt: leaveTypes[0],
    start: daysAgo(-30), end: daysAgo(-26), status: "approved", reason: "Vacation",
  },
  {
    employee: employees[7], lt: leaveTypes[0],
    start: daysAgo(-7), end: daysAgo(-7), status: "rejected", reason: "Personal",
    rejection: "Team crunch — please reschedule.",
  },
  {
    employee: employees[9], lt: leaveTypes[1],
    start: daysAgo(3), end: daysAgo(3), status: "pending", reason: "Medical appointment",
  },
];
const lrRows = leaveRequests.map((r) => {
  const days = Math.max(1, (r.end - r.start) / 86400e3 + 1);
  return {
    company_id: company.id,
    employee_id: r.employee.id,
    leave_type_id: r.lt.id,
    start_date: isoDate(r.start),
    end_date: isoDate(r.end),
    total_days: days,
    reason: r.reason,
    status: r.status,
    rejection_reason: r.rejection ?? null,
    filed_by: r.employee.id,
    approved_by: r.status !== "pending" ? admin.id : null,
    approved_at: r.status !== "pending" ? new Date().toISOString() : null,
  };
});
const { error: lrErr } = await sb.from("leave_requests").insert(lrRows);
fail("seed leave requests", lrErr);
log(`${lrRows.length} leave requests`);

// ---- 9. time logs (past 5 weekdays, ~70% of employees each day) ----
console.log("\n[8/9] Time logs");
const timeLogs = [];
for (let dayOffset = 5; dayOffset >= 0; dayOffset--) {
  const d = daysAgo(dayOffset);
  if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
  const dateStr = isoDate(d);
  for (const emp of employees) {
    if (Math.random() > 0.7) continue;
    const clockIn = new Date(d);
    clockIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 45));
    let clockOut = null;
    let hoursWorked = null;
    // 90% have clocked out, except today
    if (dayOffset > 0 || Math.random() > 0.5) {
      clockOut = new Date(clockIn);
      clockOut.setHours(clockIn.getHours() + 8 + Math.floor(Math.random() * 2));
      hoursWorked = Math.round(((clockOut - clockIn) / 3600e3) * 100) / 100;
    }
    timeLogs.push({
      company_id: company.id,
      employee_id: emp.id,
      clock_in: clockIn.toISOString(),
      clock_out: clockOut ? clockOut.toISOString() : null,
      hours_worked: hoursWorked,
      date: dateStr,
    });
  }
}
const { error: tlErr } = await sb.from("time_logs").insert(timeLogs);
fail("seed time logs", tlErr);
log(`${timeLogs.length} time log rows over past 5 weekdays`);

// ---- 10. overtime requests ----
console.log("\n[9/9] Overtime requests");
const otRows = [
  {
    company_id: company.id,
    employee_id: employees[3].id,
    date: isoDate(daysAgo(2)),
    start_time: "18:00",
    end_time: "21:00",
    hours: 3,
    reason: "Release night — deploying v2.4",
    status: "pending",
    filed_by: employees[3].id,
  },
  {
    company_id: company.id,
    employee_id: employees[4].id,
    date: isoDate(daysAgo(10)),
    start_time: "18:00",
    end_time: "20:30",
    hours: 2.5,
    reason: "Regression testing backlog",
    status: "approved",
    filed_by: employees[4].id,
    approved_by: admin.id,
    approved_at: new Date().toISOString(),
  },
];
const { error: otErr } = await sb.from("overtime_requests").insert(otRows);
if (otErr) {
  console.warn(`  ! overtime_requests skipped: ${otErr.message}`);
} else {
  log(`${otRows.length} overtime requests`);
}

console.log("\n✓ Demo seed complete.\n");
console.log(`Login:   demo@sweldo.test / sweldo123`);
console.log(`URL:     http://localhost:3000/login\n`);
