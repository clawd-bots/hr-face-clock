# HRIS & Payroll System — Build Phases

Philippine-regulated HR Information System with payroll, built on Next.js 16 + Supabase.

## Tech Stack

- **Next.js 16.2.2** — `proxy.ts` (not middleware.ts), `export function proxy()`, async `params`, async `cookies()`
- **Supabase** — Auth (email/password), Postgres with RLS, Storage (private buckets)
- **@supabase/ssr** v0.10.0 — three clients: browser, server (cookies), service (bypasses RLS)
- **Tailwind CSS** — &You design system: cream `#fafaf2`, gold `#ffc671`/`#cf9358`, blue `#5c8cb5`
- **Deployed on Vercel** — auto-deploys from `main` branch

## Architecture Patterns

- **RLS**: All tables use `public.get_my_company_id()` and `public.get_my_role()` helper functions
- **API routes**: Use `getSupabaseService()` (bypasses RLS) for data ops, `getSupabaseServer()` for auth context
- **Auth context pattern**: `getContext()` helper returns `{ userId, companyId }` from cookie-based session
- **Kiosk isolation**: Root `/` uses service role client, no auth required, IP whitelist in proxy.ts
- **Multi-tenancy**: All tables have `company_id`, all queries scoped to authenticated user's company
- **Audit logging**: `logAudit({ companyId, userId, action, entityType, entityId, changes })` from `lib/audit.ts`
- **Migrations**: Numbered SQL files in `/migrations/`, run manually in Supabase SQL Editor
- **Types**: All TypeScript types in `lib/types/database.ts`

## Completed Phases

### Phase 1: Auth, RBAC, Multi-Tenancy ✅
- Supabase Auth with email/password
- 6 system roles: `super_admin`, `admin`, `hr_manager`, `payroll_manager`, `department_manager`, `employee`
- `companies`, `user_profiles`, `audit_logs` tables
- proxy.ts for auth checks on `/admin/*` and `/employee/*`
- First-run setup wizard at `/setup` (creates company + super_admin)
- Login page with auto-detect setup needed

### Phase 2: Employee 201 File, Departments, Documents ✅
- `departments` table with CRUD
- `employees` table expanded with 25+ fields (personal info, gov IDs, employment details)
- `employee_emergency_contacts`, `employee_dependents`, `employee_education`, `employee_work_history` tables
- `employee_documents` table + Supabase Storage bucket (`employee-documents`, private)
- Employee detail page with 8 tabs: Personal, Employment, Gov IDs, Emergency, Dependents, Education, Work History, Documents
- Document upload with drag-and-drop, viewing via signed URLs

### Phase 3: Time & Attendance ✅
- `work_schedules` — shift templates (start/end time, break, grace period, work days)
- `employee_schedules` — assign schedules to employees with effective dates
- `daily_time_records` — computed DTR per employee per day
- `holidays` — company holiday calendar with PH DOLE holiday seed function
- `lib/dtr-computation.ts` — pure functions: `computeDTR()`, `computeNightDiffHours()`, `isRestDay()`, `getPayMultiplier()`
- PH labor law: 8-hour workday, night diff 10pm-6am (+10%), rest day detection
- Pay multipliers: regular (1.0x), rest day (1.3x), regular holiday (2.0x), special holiday (1.3x)
- Pages: `/admin/attendance`, `/admin/schedules`, `/admin/holidays`
- No overtime functionality (deferred)

### Phase 4: Leave Management ✅
- `leave_types` — configurable per company with PH defaults seed (VL, SL, ML, PL, SPL, SIL, VAWC, SLW)
- `leave_balances` — per employee per year, with pro-rating, gender eligibility, min service checks
- `leave_requests` — file/approve/reject/cancel workflow with balance validation
- Leave Types popup integrated into leaves page (not a separate nav item)
- Bulk balance initialization for all employees
- Pages: `/admin/leaves` (with Requests and Balances tabs)

---

## Remaining Phases

### Phase 5: Payroll Engine

**Goal**: Compute payroll per pay period, applying PH mandatory deductions and generating payslips.

**Database tables to create** (migration `040_phase5_payroll.sql`):

**`salary_records`** — base salary per employee:
- `id` uuid PK
- `company_id` uuid FK → companies
- `employee_id` uuid FK → employees
- `basic_salary` numeric(12,2) — monthly base salary
- `daily_rate` numeric(10,2) — computed: basic_salary / days_per_month (usually 22 or 26)
- `hourly_rate` numeric(10,2) — computed: daily_rate / 8
- `effective_from` date
- `effective_to` date (NULL = current)
- `pay_basis` text — 'monthly' | 'daily'
- `days_per_month` integer DEFAULT 22
- `created_at` timestamptz

**`allowance_types`** — configurable allowance categories:
- `id` uuid PK
- `company_id` uuid FK → companies
- `name` text (e.g., "Rice Subsidy", "Transportation", "Clothing")
- `code` text
- `is_taxable` boolean DEFAULT false
- `is_de_minimis` boolean DEFAULT false — tax-exempt up to BIR limits
- `de_minimis_limit` numeric(10,2) — monthly limit if de minimis
- `active` boolean DEFAULT true

**`employee_allowances`** — recurring allowances assigned to employees:
- `id` uuid PK
- `company_id` uuid FK → companies
- `employee_id` uuid FK → employees
- `allowance_type_id` uuid FK → allowance_types
- `amount` numeric(10,2)
- `frequency` text — 'per_cutoff' | 'monthly'
- `active` boolean DEFAULT true

**`loan_types`** — SSS, Pag-IBIG, company loans:
- `id` uuid PK
- `company_id` uuid FK → companies
- `name` text
- `code` text

**`employee_loans`** — active loan deductions:
- `id` uuid PK
- `company_id` uuid FK → companies
- `employee_id` uuid FK → employees
- `loan_type_id` uuid FK → loan_types
- `total_amount` numeric(12,2)
- `monthly_deduction` numeric(10,2)
- `remaining_balance` numeric(12,2)
- `start_date` date
- `active` boolean DEFAULT true

**`payroll_runs`** — a single payroll batch:
- `id` uuid PK
- `company_id` uuid FK → companies
- `period_start` date
- `period_end` date
- `pay_date` date
- `cycle` text — 'semi_monthly_1' | 'semi_monthly_2' | 'monthly'
- `status` text — 'draft' | 'computed' | 'approved' | 'paid'
- `total_gross` numeric(14,2)
- `total_deductions` numeric(14,2)
- `total_net` numeric(14,2)
- `employee_count` integer
- `computed_by` uuid
- `approved_by` uuid
- `approved_at` timestamptz
- `created_at` timestamptz

**`payroll_items`** — one row per employee per payroll run (the payslip):
- `id` uuid PK
- `company_id` uuid FK → companies
- `payroll_run_id` uuid FK → payroll_runs
- `employee_id` uuid FK → employees
- `basic_pay` numeric(10,2) — base pay for the period
- `days_worked` numeric(5,2)
- `hours_worked` numeric(6,2)
- `regular_pay` numeric(10,2)
- `holiday_pay` numeric(10,2)
- `rest_day_pay` numeric(10,2)
- `night_diff_pay` numeric(10,2)
- `overtime_pay` numeric(10,2) DEFAULT 0
- `gross_pay` numeric(12,2)
- `sss_employee` numeric(8,2)
- `sss_employer` numeric(8,2) — for records, not deducted from employee
- `philhealth_employee` numeric(8,2)
- `philhealth_employer` numeric(8,2)
- `pagibig_employee` numeric(8,2)
- `pagibig_employer` numeric(8,2)
- `withholding_tax` numeric(10,2)
- `total_allowances` numeric(10,2)
- `total_deductions` numeric(10,2) — sum of all employee-side deductions
- `loan_deductions` numeric(10,2)
- `other_deductions` numeric(10,2) DEFAULT 0
- `net_pay` numeric(12,2)
- `adjustments` jsonb DEFAULT '{}'
- `breakdown` jsonb DEFAULT '{}' — detailed computation breakdown for audit

**Core computation library**: `lib/payroll-computation.ts`

Must encode current PH contribution tables:

**SSS (2025 table)**: Graduated based on monthly salary credit (MSC). Employee share ranges from PHP 180 to PHP 1,350. Employer share ranges from PHP 390 to PHP 2,930. Look up bracket by monthly salary.

**PhilHealth**: 5% of basic salary, split 50/50 between employee and employer. Floor PHP 500/month, ceiling PHP 5,000/month (based on salary range PHP 10,000 - PHP 100,000).

**Pag-IBIG (HDMF)**: Employee: 1% if salary <= PHP 1,500, otherwise 2% (capped at PHP 200/month). Employer: 2% (capped at PHP 200/month).

**Withholding Tax (BIR TRAIN Law)**: Graduated rates on taxable income after deducting SSS + PhilHealth + Pag-IBIG:
- 0 – 20,833/month: 0%
- 20,833 – 33,333: 15% of excess over 20,833
- 33,333 – 66,667: 1,875 + 20% of excess over 33,333
- 66,667 – 166,667: 8,541.80 + 25% of excess over 66,667
- 166,667 – 666,667: 33,541.80 + 30% of excess over 166,667
- Over 666,667: 183,541.80 + 35% of excess over 666,667

**Payroll computation flow**:
1. For each employee in the payroll period:
2. Get salary record (basic_salary, daily_rate, hourly_rate)
3. Pull DTR data for the period (from daily_time_records)
4. Compute: regular pay, holiday pay (DTR hours × multiplier × hourly rate), rest day pay, night diff pay
5. Add allowances (taxable and non-taxable)
6. Compute gross pay
7. Compute mandatory deductions: SSS, PhilHealth, Pag-IBIG
8. Compute taxable income = gross - non-taxable allowances - SSS - PhilHealth - Pag-IBIG
9. Compute withholding tax
10. Deduct loans
11. Net pay = gross - all deductions + non-taxable allowances

**API routes**:
- `/api/salary-records` — CRUD for employee salary records
- `/api/allowance-types` — CRUD for allowance categories
- `/api/employee-allowances` — CRUD for employee allowance assignments
- `/api/payroll` — GET list runs, POST create/compute a run
- `/api/payroll/[id]` — GET run detail with items, PATCH approve, POST recompute
- `/api/payroll/[id]/items` — GET payslip items for a run
- `/api/payroll/[id]/items/[itemId]` — PATCH manual adjustments

**Pages**:
- `/admin/payroll` — list payroll runs, "Run Payroll" button, status badges
- `/admin/payroll/[id]` — payroll run detail: summary cards, employee payslip table, approve button
- `/admin/payroll/salary` — salary records management (assign/edit base salary per employee)

**Nav**: Add "Payroll" to admin nav

---

### Phase 6: Employee Self-Service Portal

**Goal**: Give employees their own portal to view personal info, file leaves, view payslips, and clock in/out.

**No new database tables** — uses existing tables with employee-scoped RLS.

**Pages** (all under `/employee`):
- `/employee` — dashboard with quick stats (leave balance, next pay date, recent activity)
- `/employee/profile` — view/edit own 201 file (limited fields: phone, address, emergency contacts)
- `/employee/leaves` — view own leave balances, file leave requests, track status
- `/employee/payslips` — view own payslips per pay period, download as PDF
- `/employee/attendance` — view own DTR, clock-in/out history
- `/employee/documents` — view own uploaded documents

**Auth**: Employee role users are redirected to `/employee` (not `/admin`). proxy.ts already handles `/employee/*` routes.

**Key considerations**:
- Employees can only see their own data — enforce via `user_profiles.id` matching
- Leave filing: employee selects leave type, dates, reason → creates request with `filed_by = own user id`
- Payslip PDF: generate client-side or via API returning a PDF buffer
- Profile edit: only allow updating phone, personal_email, address fields (not salary, role, etc.)
- Link employee record to user_profile via a new `user_profile_id` column on employees table, or match by email

**API changes**:
- Add `/api/employee/me` — returns current user's employee record
- Add `/api/employee/me/leaves` — own leave requests and balances
- Add `/api/employee/me/payslips` — own payroll items
- Add `/api/employee/me/dtr` — own DTR records
- Existing APIs already support employee_id filtering; these "me" endpoints auto-resolve the employee_id

**Employee layout**: `/app/employee/layout.tsx` — simpler nav than admin (Dashboard, Profile, Leaves, Payslips, Attendance)

---

### Phase 7: Compliance & Reporting

**Goal**: Generate reports required by Philippine regulatory bodies and for internal HR analytics.

**Reports to build**:

**Government compliance reports**:
- **SSS R3/R5**: Monthly contribution report — employee list with SSS numbers, salary credits, contributions
- **PhilHealth RF-1**: Monthly remittance report
- **Pag-IBIG**: Monthly contribution schedule
- **BIR 1601-C**: Monthly withholding tax remittance
- **BIR 2316**: Annual tax certificate per employee (Certificate of Compensation Payment/Tax Withheld)
- **DOLE Rule 1020**: Establishment report (company profile, employee count, etc.)
- **13th Month Pay computation**: Mandatory year-end report

**Internal HR reports**:
- **Headcount report**: By department, employment status, gender
- **Attendance summary**: Late/undertime/absence rates per department/period
- **Leave utilization**: Leave usage vs. entitlement per type, per department
- **Payroll summary**: Per period, per department, totals and averages
- **Turnover report**: Hires, separations, retention rate
- **Employee directory**: Exportable list with key details
- **Cost analysis**: Labor cost by department/role

**Database tables** (migration `060_phase7_reports.sql`):
- `report_templates` — saved report configurations
- `generated_reports` — stored report outputs (JSON + optional file path in Storage)

**Core library**: `lib/report-generators.ts` — functions that query data and format into report structures

**Export formats**: CSV, PDF (for government forms), Excel (via a library like `xlsx`)

**API routes**:
- `/api/reports` — GET list available report types, POST generate a report
- `/api/reports/[type]` — GET specific report with date range and filters
- `/api/reports/export` — POST generate and download (CSV/PDF/Excel)

**Pages**:
- `/admin/reports` — report hub with categorized list (Government, HR, Payroll)
- Each report type opens a configuration panel (date range, filters) and renders a preview table
- Export buttons for each format

**Nav**: Reports page already exists in nav, just needs content

---

### Phase 8: Onboarding & Offboarding

**Goal**: Structured workflows for employee lifecycle events.

**Database tables** (migration `070_phase8_onboarding.sql`):

**`onboarding_templates`** — reusable checklist templates:
- `id` uuid PK
- `company_id` uuid FK → companies
- `name` text (e.g., "Standard Onboarding", "IT Setup")
- `description` text
- `department_id` uuid FK → departments (optional — department-specific templates)
- `items` jsonb — array of `{ title, description, assignee_role, due_days_offset, required }`
- `active` boolean DEFAULT true

**`onboarding_checklists`** — instantiated checklist for a specific employee:
- `id` uuid PK
- `company_id` uuid FK → companies
- `employee_id` uuid FK → employees
- `template_id` uuid FK → onboarding_templates
- `type` text — 'onboarding' | 'offboarding'
- `status` text — 'in_progress' | 'completed' | 'cancelled'
- `started_at` timestamptz
- `completed_at` timestamptz
- `created_at` timestamptz

**`checklist_items`** — individual tasks within a checklist:
- `id` uuid PK
- `company_id` uuid FK → companies
- `checklist_id` uuid FK → onboarding_checklists
- `title` text
- `description` text
- `assigned_to` uuid FK → auth.users (who should complete this task)
- `due_date` date
- `completed` boolean DEFAULT false
- `completed_by` uuid
- `completed_at` timestamptz
- `notes` text
- `sort_order` integer

**`separation_records`** — offboarding/termination details:
- `id` uuid PK
- `company_id` uuid FK → companies
- `employee_id` uuid FK → employees
- `separation_type` text — 'resignation' | 'termination' | 'end_of_contract' | 'retirement' | 'redundancy'
- `notice_date` date — when notice was given
- `last_working_day` date
- `effective_date` date — official separation date
- `reason` text
- `exit_interview_notes` text
- `final_pay_status` text — 'pending' | 'computed' | 'released'
- `final_pay_amount` numeric(12,2)
- `clearance_status` text — 'pending' | 'cleared'
- `created_at` timestamptz

**Onboarding workflow**:
1. HR creates new employee record (Phase 2)
2. System auto-creates onboarding checklist from template
3. Tasks assigned to relevant people (HR, IT, manager, employee)
4. Dashboard shows progress per employee
5. Checklist items can be checked off by assigned person
6. All items complete → status changes to 'completed'

**Offboarding workflow**:
1. HR initiates separation (creates separation_record)
2. System creates offboarding checklist from template
3. Includes: IT account deactivation, equipment return, final pay computation, certificate of employment
4. Final pay computed: remaining salary + pro-rated 13th month + unused leave conversion - outstanding loans
5. Clearance tracking per department

**API routes**:
- `/api/onboarding/templates` — CRUD for templates
- `/api/onboarding/checklists` — GET list, POST create (from template for employee)
- `/api/onboarding/checklists/[id]` — GET detail, PATCH complete items
- `/api/onboarding/checklists/[id]/items/[itemId]` — PATCH toggle complete
- `/api/separation` — CRUD for separation records
- `/api/separation/[id]/final-pay` — POST compute final pay

**Pages**:
- `/admin/onboarding` — active onboarding/offboarding checklists with progress bars
- `/admin/onboarding/templates` — manage checklist templates
- `/admin/onboarding/[id]` — individual checklist detail with task list
- Integration into employee detail page — "Onboard" / "Offboard" action buttons

**Nav**: Add "Onboarding" to admin nav

---

## Important Notes for Agents

1. **Always read Next.js 16 docs** at `node_modules/next/dist/docs/` before writing code — breaking changes from Next.js 15
2. **Dynamic route params** are `Promise<{ id: string }>` and must be `await`ed
3. **`cookies()`** and **`headers()`** must be `await`ed
4. **proxy.ts** not middleware.ts, `export function proxy()` not `export function middleware()`
5. **All Supabase tables use RLS** — use `getSupabaseService()` to bypass for server-side operations
6. **AuthProvider's `onAuthStateChange` must be synchronous** — no async work (like DB queries) inside the callback, or it deadlocks the auth lock
7. **Employee `name` field** is the legacy kiosk field — `first_name`/`last_name` may not be populated, always fallback to `name`
8. **Design system**: Use direct Tailwind values, NOT token-based utility classes. Cream `#fafaf2`, gold gradient `linear-gradient(to right, #ffc671, #cf9358)`, text hierarchy `rgba(0,0,0,0.88/0.65/0.4)`
9. **No overtime functionality** — was explicitly deferred
10. **Migration files** are run manually in Supabase SQL Editor, not via CLI
