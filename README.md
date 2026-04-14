# &you HR — Philippine-Regulated HRIS & Payroll System

A comprehensive Human Resource Information System built for Philippine labor compliance, featuring face recognition time tracking, full 201 employee file management, leave management, payroll computation, and multi-tenant role-based access control.

Built with **Next.js 16**, **Supabase**, **face-api.js**, and the **&you Design System**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Database Migrations](#database-migrations)
- [User Roles & Permissions](#user-roles--permissions)
- [Module Guide](#module-guide)
  - [Face Clock Kiosk](#face-clock-kiosk)
  - [Admin Portal](#admin-portal)
  - [Employee Self-Service Portal](#employee-self-service-portal)
- [API Reference](#api-reference)
- [Design System](#design-system)
- [Project Structure](#project-structure)
- [Deployment](#deployment)

---

## Features

### Core Platform
- **Multi-tenant architecture** — company-scoped data with Row Level Security (RLS)
- **Role-based access control** — 6 system roles with granular permissions
- **Audit logging** — all mutations tracked with before/after change records
- **Liquid glass UI** — glassmorphism design with backdrop blur effects
- **Collapsible sidebar navigation** — responsive side nav for admin and employee portals
- **Client-side caching** — SWR-style request deduplication and TTL-based cache

### Employee Management (201 File)
- **Full employee profiles** — personal info, government IDs, employment details
- **Emergency contacts** — multiple contacts with primary designation
- **Dependents** — with PWD/senior citizen flags for tax computation
- **Education history** — school, degree, field of study, year graduated
- **Work history** — previous employment records
- **Document management** — upload/download employee documents (contracts, IDs, etc.)
- **Account creation** — admins create login accounts for employees directly

### Time & Attendance
- **Face recognition clock-in/out** — browser-based webcam kiosk using face-api.js
- **Daily Time Records (DTR)** — automated computation from time logs
- **Work schedules** — configurable schedules with start/end times, break duration, grace periods
- **Night differential tracking** — automatic night diff hour computation
- **Late & undertime tracking** — computed against assigned schedule
- **Rest day & holiday detection** — flags DTR entries for premium pay computation
- **Flexible time support** — optional flexi-time schedule type

### Leave Management
- **Philippine-compliant leave types** — SL, VL, maternity, paternity, solo parent, VAWC, etc.
- **Leave balance tracking** — entitled days, used, pending, carried over, adjusted
- **Per-employee balance editing** — HR can adjust individual leave balances
- **Leave requests** — file, approve, reject with reason, cancel
- **Half-day leaves** — morning or afternoon half-day support
- **Attachment support** — required attachments for specific leave types (e.g., medical certificates)
- **Gender-specific leaves** — maternity/paternity auto-filtered by gender
- **Pro-rating** — automatic proration based on hire date
- **Carry-over rules** — configurable max carry-over per leave type

### Payroll Engine
- **Philippine tax computation** — BIR withholding tax tables
- **Mandatory contributions** — SSS, PhilHealth, Pag-IBIG (employee + employer shares)
- **Payroll runs** — draft → computed → approved → paid workflow
- **Semi-monthly & monthly cycles** — configurable pay cycles
- **Salary records** — basic salary, daily/hourly rate, effective dates
- **Allowances** — configurable allowance types (taxable, de minimis, per-cutoff/monthly)
- **Loan deductions** — SSS, Pag-IBIG, company loans with amortization tracking
- **Premium pay computation** — holiday, rest day, night differential, overtime
- **Late/undertime deductions** — automatic deduction from DTR data
- **Payslip generation** — HTML payslips viewable by employees

### Holidays
- **Philippine holiday calendar** — regular, special non-working, special working
- **Seed data** — one-click seeding of current year Philippine holidays
- **Custom holidays** — add company-specific holidays

### Departments
- **Department management** — create, edit, deactivate departments
- **Department codes** — unique short codes for reporting
- **Department heads** — assign head employee per department
- **Hierarchical structure** — parent/child department relationships

### Reports
- **Date-filtered reports** — attendance, leave, payroll reports
- **Per-employee summaries** — individual employee report views
- **CSV export** — download reports as CSV files

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 19 + Tailwind CSS v4 |
| Design System | &you tokens (glassmorphism) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| RLS | Row Level Security with company scoping |
| Face Recognition | face-api.js (browser-based, no server GPU needed) |
| Caching | Custom SWR-style client cache with TTL & deduplication |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                              │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Kiosk   │  │ Admin Portal │  │ Employee Portal   │  │
│  │ (face    │  │ (sidebar +   │  │ (sidebar +        │  │
│  │  clock)  │  │  all modules)│  │  self-service)    │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
│       │               │                    │             │
│       └───────────────┴────────────────────┘             │
│                       │                                  │
│              Client-side Cache (TTL)                     │
└───────────────────────┬──────────────────────────────────┘
                        │ REST API
┌───────────────────────┴──────────────────────────────────┐
│                Next.js API Routes                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ getContext() → { userId, companyId, role }           │ │
│  │ → Supabase Server Client (auth-scoped, RLS active)  │ │
│  │ → Supabase Service Client (bypasses RLS for kiosk)  │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────────┐
│              Supabase PostgreSQL                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ RLS Policies │  │  Functions   │  │  Storage       │  │
│  │ (company_id) │  │ get_my_role()│  │  (documents)   │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Multi-tenant by default** — every table has `company_id`, enforced at the database level via RLS helper functions `get_my_company_id()` and `get_my_role()`
- **Dual Supabase clients** — `getSupabaseServer()` respects RLS for authenticated users; `getSupabaseService()` bypasses RLS for kiosk/admin operations
- **Face recognition runs entirely in the browser** — no server-side GPU needed, face descriptors stored in Postgres as `float8[][]`
- **Audit everything** — `logAudit()` fires after all create/update/delete operations, capturing old/new values

---

## Prerequisites

- **Node.js 18+**
- A [Supabase](https://supabase.com) account (free tier works)
- A webcam (for face recognition features)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/clawd-bots/hr-face-clock.git
cd hr-face-clock
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys from **Settings → API**

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Note:** The service role key is required for the kiosk face clock (bypasses RLS to read all employees) and for admin account creation.

### 4. Run database migrations

Execute the SQL migration files in order in your Supabase SQL Editor:

```
migrations/001_phase1_auth_rbac.sql       → Companies, user profiles, audit logs
migrations/002_phase1_rls_policies.sql    → RLS policies & helper functions
migrations/010_phase2_employee_201.sql    → Employee 201 file & departments
migrations/020_phase3_time_attendance.sql → DTR, schedules, holidays
migrations/030_phase4_leave_management.sql → Leave types, balances, requests
migrations/040_phase5_payroll.sql         → Payroll runs, salary, allowances, loans
```

### 5. Initial setup

```bash
npm run dev
```

Open [http://localhost:3000/setup](http://localhost:3000/setup) to create:
- Your company record
- Your super admin account (first user)

After setup, you'll be redirected to the admin dashboard.

### 6. Seed data (optional)

After logging in as admin, you can seed:
- **Leave types** — go to Admin → Leave Types, click "Seed Philippine Leave Types"
- **Holidays** — go to Admin → Holidays, click "Seed Holidays"

---

## User Roles & Permissions

| Role | Portal | Capabilities |
|------|--------|-------------|
| `super_admin` | Admin | Full system access — all modules, all actions |
| `company_admin` | Admin | Company-level admin — same as super_admin, scoped to company |
| `hr_manager` | Admin | Employee management, leaves, attendance, account creation, audit logs |
| `payroll_officer` | Admin | Admin portal access, payroll operations |
| `department_manager` | Admin | Admin portal access, department management |
| `employee` | Employee | Self-service: dashboard, profile, leaves, payslips, attendance |

### Permission Groups

| Group | Roles | Used For |
|-------|-------|----------|
| **ADMIN_ROLES** | super_admin, company_admin, hr_manager, payroll_officer, department_manager | Access `/admin` portal |
| **HR_PLUS_ROLES** | super_admin, company_admin, hr_manager | Create/edit/delete employees, create accounts, view audit logs |
| **PAYROLL_ROLES** | super_admin, company_admin, payroll_officer | Run payroll, manage salary records |

### Database-Level Security (RLS)

| Table | Read | Write |
|-------|------|-------|
| Companies | Own company only | — |
| Employees | All users in company | HR+ only |
| Time Logs | All users in company | All users in company |
| Audit Logs | HR+ only | All authenticated (insert only) |
| All other tables | Company-scoped | Role-appropriate |

---

## Module Guide

### Face Clock Kiosk

**URL:** [http://localhost:3000](http://localhost:3000)

The kiosk is a standalone screen designed for shared devices (e.g., a tablet at the office entrance).

1. Open the kiosk page on a device with a webcam
2. An employee stands in front of the camera
3. The system detects and matches their face against stored descriptors
4. Automatically clocks them in (or out if already clocked in)
5. Shows a confirmation screen for 5 seconds, then returns to scanning

> **How face registration works:** Go to Admin → Employees → Register. Capture 5 face images via webcam (move head slightly between captures). The face descriptors are stored as numerical arrays in the database.

### Admin Portal

**URL:** [http://localhost:3000/admin](http://localhost:3000/admin)

Accessible to all ADMIN_ROLES. The sidebar navigation includes:

#### Dashboard (`/admin`)
- Employee count, currently clocked in/out, total hours worked today
- Today's time log activity table

#### Employees (`/admin/employees`)
- **Employee list** — searchable, filterable table of all employees
- **Employee detail** (`/admin/employees/[id]`) — tabbed interface:
  - **Personal** — basic info, address, contact, emergency contacts, dependents, education, work history (expandable sections)
  - **Employment** — status, position, department, dates, schedule
  - **Gov IDs** — SSS, TIN, PhilHealth, Pag-IBIG numbers
  - **Documents** — upload/download employee files
- **Register employee** (`/admin/employees/register`) — new employee with face capture
- **Create account** — button on employee detail page to create a login account for the employee (assigns email + role + auto-confirmed password)

#### Departments (`/admin/departments`)
- Create, edit, deactivate departments
- Assign department head and parent department

#### Attendance (`/admin/attendance`)
- Daily Time Records for all employees
- Date range filtering
- View first in, last out, total hours, late minutes, undertime
- Holiday and rest day flags

#### Leaves (`/admin/leaves`)
- **Leave Requests tab** — view/approve/reject pending requests
- **Leave Balances tab** — view all employee balances, inline edit entitled/carried/adjusted days per employee
- Employee dropdown filter

#### Payroll (`/admin/payroll`)
- **Payroll Runs** — create new run (select period, cycle), compute, approve, mark paid
- **Payroll Detail** (`/admin/payroll/[id]`) — line items per employee with full breakdown
- **Salary Records tab** — manage basic salary, daily/hourly rates per employee
- **Allowances tab** — assign allowance types and amounts to employees
- Philippine-compliant computation: SSS, PhilHealth, Pag-IBIG, BIR withholding tax

#### Schedules (`/admin/schedules`)
- Create work schedules (name, start/end time, break minutes, grace period, work days)
- Night differential flag
- Flexible time option
- Assign schedules to employees with effective dates

#### Holidays (`/admin/holidays`)
- Manage holiday calendar (regular, special non-working, special working)
- Seed current year's Philippine holidays with one click

#### Leave Types (`/admin/leave-types`)
- Configure leave types with Philippine labor compliance:
  - Days per year, paid/unpaid, convertible to cash
  - Gender-specific (maternity, paternity)
  - Minimum service months required
  - Half-day allowed, carry-over max, prorate on hire
  - Attachment required (medical certificates, etc.)
- Seed standard Philippine leave types with one click

#### Reports (`/admin/reports`)
- Date-filtered reports for attendance, leaves, payroll
- Per-employee summaries
- CSV export

### Employee Self-Service Portal

**URL:** [http://localhost:3000/employee](http://localhost:3000/employee)

Accessible to employees after their admin creates a login account for them.

#### Dashboard (`/employee`)
- Today's clock status
- Recent time logs
- Leave balance summary

#### Profile (`/employee/profile`)
- View personal information (read-only for employees)
- Government IDs
- Emergency contacts

#### Leaves (`/employee/leaves`)
- View leave balances per type
- File new leave requests (select type, dates, half-day option, reason, attachment)
- View request history and status

#### Payslips (`/employee/payslips`)
- View payslips for completed payroll runs
- Breakdown of earnings and deductions

#### Attendance (`/employee/attendance`)
- View own Daily Time Records
- Date range filtering
- Late/undertime visibility

---

## API Reference

### Authentication & Setup
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/callback` | OAuth callback handler |
| POST | `/api/setup` | Initial company + super admin setup |
| GET | `/api/setup/check` | Check if setup has been completed |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees (company-scoped) |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get employee detail |
| PATCH | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Deactivate employee |
| POST | `/api/employees/[id]/create-account` | Create login account (HR+ only) |
| GET | `/api/employees/[id]/account-status` | Check if employee has account |
| GET/POST | `/api/employees/[id]/contacts` | Emergency contacts |
| GET/POST | `/api/employees/[id]/dependents` | Dependents |
| GET/POST | `/api/employees/[id]/education` | Education history |
| GET/POST | `/api/employees/[id]/work-history` | Work history |
| POST | `/api/employees/[id]/documents` | Upload document |
| GET | `/api/employees/[id]/documents/download` | Download document |
| GET/PUT | `/api/employees/[id]/schedule` | Employee schedule assignment |

### Time & Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/time-logs` | Clock in/out |
| GET | `/api/dtr` | List Daily Time Records |
| POST | `/api/dtr` | Compute DTR for date range |
| GET/PATCH | `/api/dtr/[id]` | Get/adjust DTR entry |

### Schedules & Holidays
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/schedules` | List/create work schedules |
| PATCH/DELETE | `/api/schedules/[id]` | Update/delete schedule |
| GET/POST | `/api/holidays` | List/create holidays |
| POST | `/api/holidays/seed` | Seed Philippine holidays |

### Leave Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/leave-types` | List/create leave types |
| PATCH | `/api/leave-types/[id]` | Update leave type |
| POST | `/api/leave-types/seed` | Seed Philippine leave types |
| GET | `/api/leave-balances` | List leave balances |
| PATCH | `/api/leave-balances/[id]` | Edit individual balance |
| POST | `/api/leave-balances/initialize` | Initialize balances for year |
| GET/POST | `/api/leave-requests` | List/file leave requests |
| PATCH | `/api/leave-requests/[id]` | Approve/reject/cancel |

### Payroll
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/payroll` | List/create payroll runs |
| GET/PATCH | `/api/payroll/[id]` | Get/update payroll run |
| GET | `/api/payroll/[id]/items` | List payroll line items |
| PATCH | `/api/payroll/[id]/items/[itemId]` | Adjust payroll item |
| GET | `/api/payroll/[id]/payslip` | Generate payslip HTML |
| GET/POST | `/api/salary-records` | List/create salary records |
| PATCH | `/api/salary-records/[id]` | Update salary record |
| GET | `/api/allowance-types` | List allowance types |
| GET/POST | `/api/employee-allowances` | List/assign allowances |
| PATCH | `/api/employee-allowances/[id]` | Update allowance |

### Departments & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/departments` | List/create departments |
| GET | `/api/reports` | List available report types |
| GET | `/api/reports/[type]` | Generate report with date filters |

### Employee Self-Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employee/me` | Current employee profile |
| GET | `/api/employee/me/leaves` | My leave requests |
| GET | `/api/employee/me/payslips` | My payslips |
| GET | `/api/employee/me/dtr` | My daily time records |
| GET | `/api/employee/me/documents` | My documents |

---

## Design System

The app uses the **&you Design System** with a glassmorphism visual language.

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--color-andyou-cream` | `#fafaf2` | Page background |
| `--color-andyou-accent` | `#ffc671` | Gold accent, gradients |
| `--color-andyou-card-dark-bg` | `#9a6d2a` | Dark gold for active states |
| `--color-andyou-text-primary` | `rgba(0,0,0,0.88)` | Headings, body text |
| `--color-andyou-text-secondary` | `rgba(0,0,0,0.65)` | Secondary text |
| `--color-andyou-text-muted` | `rgba(0,0,0,0.4)` | Captions, placeholders |

### Glass CSS Classes
| Class | Description |
|-------|-------------|
| `.glass-card` | Standard card — 55% white, 20px blur, inner glow, hover brightens |
| `.glass-stat` | Stat card — 40% white, hover lifts |
| `.glass-table` | Table wrapper — 50% white, 16px blur |
| `.glass-sidebar` | Fixed sidebar — 70% white, 24px blur |
| `.glass-modal` | Modal overlay — 75% white, 24px blur, deep shadow |
| `.glass-nav-active` | Active nav item — gold-tinted glass with border |

---

## Project Structure

```
app/
  page.tsx                              # Kiosk — face clock in/out
  login/page.tsx                        # Login page
  setup/page.tsx                        # First-time setup
  admin/
    layout.tsx                          # Admin sidebar + role guard
    page.tsx                            # Dashboard
    employees/
      page.tsx                          # Employee list
      [id]/page.tsx                     # Employee detail (tabbed)
      register/page.tsx                 # Register + face capture
    attendance/page.tsx                 # DTR management
    departments/page.tsx                # Department CRUD
    holidays/page.tsx                   # Holiday calendar
    leave-types/page.tsx                # Leave type configuration
    leaves/page.tsx                     # Leave requests + balances
    payroll/
      page.tsx                          # Payroll runs + salary + allowances
      [id]/page.tsx                     # Payroll run detail
    schedules/page.tsx                  # Work schedule management
    reports/page.tsx                    # Reports + export
  employee/
    layout.tsx                          # Employee sidebar + auth guard
    page.tsx                            # Employee dashboard
    profile/page.tsx                    # My profile
    leaves/page.tsx                     # My leaves
    payslips/page.tsx                   # My payslips
    attendance/page.tsx                 # My attendance
  api/                                  # 45+ REST API routes (see API Reference)

components/
  AuthProvider.tsx                      # Auth context (session + profile)
  ClockInOut.tsx                        # Kiosk face clock UI
  DocumentUpload.tsx                    # File upload component
  FaceRegistration.tsx                  # Multi-capture face enrollment
  FaceScanner.tsx                       # Real-time face detection
  RoleGate.tsx                          # Role-based conditional render
  TabNav.tsx                            # Tab navigation component

lib/
  supabase.ts                           # Client init + shared types
  supabase-browser.ts                   # Browser Supabase client
  supabase-server.ts                    # Server client (respects RLS)
  supabase-service.ts                   # Service role client (bypasses RLS)
  auth.ts                               # requireRole(), getCurrentUser()
  api-context.ts                        # getContext() for API routes
  swr-fetcher.ts                        # Client cache with TTL + dedup
  audit.ts                              # logAudit() helper
  dtr-computation.ts                    # DTR calculation logic
  payroll-computation.ts                # Payroll engine (PH tax, SSS, etc.)
  face-recognition.ts                   # face-api.js helpers
  report-generators.ts                  # Report generation
  report-export.ts                      # CSV export
  payslip-html.ts                       # Payslip HTML template
  employee-context.ts                   # Employee context helpers
  utils.ts                              # Date/time formatting utilities
  types/database.ts                     # TypeScript types for all tables

migrations/
  001_phase1_auth_rbac.sql              # Auth, companies, user profiles
  002_phase1_rls_policies.sql           # RLS policies + helper functions
  010_phase2_employee_201.sql           # Employee 201 file + departments
  020_phase3_time_attendance.sql        # DTR, schedules, holidays
  030_phase4_leave_management.sql       # Leave types, balances, requests
  040_phase5_payroll.sql                # Payroll engine tables

public/models/                          # face-api.js model weights
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### First Run After Deploy

1. Visit `https://your-app.vercel.app/setup` to create the company + super admin
2. Log in at `/login`
3. Seed leave types and holidays from their respective admin pages
4. Register employees at `/admin/employees/register` (capture faces)
5. Create login accounts for employees from the employee detail page
6. Set up work schedules and assign to employees
7. Configure salary records and allowances before running payroll

---

## License

Private — &you Philippines. All rights reserved.
