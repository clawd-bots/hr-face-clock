-- =============================================================
-- Sweldo HR — complete schema bootstrap
-- Runs cleanly on an empty Supabase project OR re-runs safely
-- (drops and recreates the public schema first).
-- =============================================================

-- Reset public schema (safe on a fresh project — drops everything in public,
-- leaves Supabase's auth/storage/extensions schemas untouched).
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- =============================================================
-- Base schema (supabase-schema.sql) — creates employees, time_logs
-- =============================================================
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Employees table
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text default '',
  department text default '',
  face_descriptors jsonb default '[]'::jsonb,
  photo_url text,
  created_at timestamp with time zone default now(),
  active boolean default true
);

-- Time logs table
create table if not exists time_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  clock_in timestamp with time zone not null,
  clock_out timestamp with time zone,
  hours_worked numeric(6,2),
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

-- Index for fast lookups
create index if not exists idx_time_logs_employee_date on time_logs(employee_id, date);
create index if not exists idx_time_logs_date on time_logs(date);
create index if not exists idx_employees_active on employees(active);

-- Enable Row Level Security (optional - disable for simplicity)
-- alter table employees enable row level security;
-- alter table time_logs enable row level security;

-- Allow public access (for development - restrict in production)
create policy "Allow all on employees" on employees for all using (true) with check (true);
create policy "Allow all on time_logs" on time_logs for all using (true) with check (true);

-- ============================================================
-- migrations/001_phase1_auth_rbac.sql
-- ============================================================
-- Phase 1: Authentication, RBAC & Multi-Tenancy Foundation
-- Run this in Supabase SQL Editor after the initial schema

-- Enable UUID extension (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (multi-tenancy root)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- User profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  employee_id uuid REFERENCES employees(id),
  system_role text NOT NULL DEFAULT 'employee'
    CHECK (system_role IN ('super_admin','company_admin','hr_manager','payroll_officer','department_manager','employee')),
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Add company_id to existing tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee ON user_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_company ON time_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_entity ON audit_logs(company_id, entity_type, created_at DESC);

-- ============================================================
-- migrations/002_phase1_rls_policies.sql
-- ============================================================
-- Phase 1: RLS Policies
-- Run after 001_phase1_auth_rbac.sql

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old open policies
DROP POLICY IF EXISTS "Allow all on employees" ON employees;
DROP POLICY IF EXISTS "Allow all on time_logs" ON time_logs;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id() RETURNS uuid AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's system_role
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text AS $$
  SELECT system_role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Companies: users can read their own company
CREATE POLICY "Users read own company" ON companies
  FOR SELECT USING (id = public.get_my_company_id());

-- Employees: company-scoped read
CREATE POLICY "Company employees read" ON employees
  FOR SELECT USING (company_id = public.get_my_company_id());

-- Employees: HR+ can write
CREATE POLICY "HR+ employees write" ON employees
  FOR INSERT WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

CREATE POLICY "HR+ employees update" ON employees
  FOR UPDATE USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

CREATE POLICY "HR+ employees delete" ON employees
  FOR DELETE USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Time logs: company-scoped read and insert
CREATE POLICY "Company time_logs read" ON time_logs
  FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY "Time logs insert" ON time_logs
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Time logs update" ON time_logs
  FOR UPDATE USING (company_id = public.get_my_company_id());

-- User profiles: company-scoped read
CREATE POLICY "Company profiles read" ON user_profiles
  FOR SELECT USING (company_id = public.get_my_company_id());

-- Audit logs: HR+ read only
CREATE POLICY "HR+ audit read" ON audit_logs
  FOR SELECT USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Audit logs: any authenticated user can insert (via service role in practice)
CREATE POLICY "Audit logs insert" ON audit_logs
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

-- Service role bypass: allow service_role key to bypass RLS for kiosk operations
-- (This is automatic in Supabase - service_role key bypasses RLS by default)

-- ============================================================
-- migrations/010_phase2_employee_201.sql
-- ============================================================
-- Phase 2: Employee Records (201 File) & Document Management
-- Run after Phase 1 migrations

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  code text,
  head_employee_id uuid REFERENCES employees(id),
  parent_department_id uuid REFERENCES departments(id),
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  UNIQUE(company_id, name)
);

-- Expand employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_number text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS suffix text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS civil_status text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Filipino';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_email text;

-- Philippine government IDs
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sss_number text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tin_number text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS philhealth_number text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pagibig_number text;

-- Employment details
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'regular';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS regularization_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS separation_date date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS separation_reason text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position_title text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_to uuid REFERENCES employees(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_frequency text DEFAULT 'semi_monthly';

-- Emergency contacts
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  address text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Dependents
CREATE TABLE IF NOT EXISTS employee_dependents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  is_pwd boolean DEFAULT false,
  is_senior boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Education history
CREATE TABLE IF NOT EXISTS employee_education (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  level text NOT NULL,
  school_name text NOT NULL,
  degree text,
  field_of_study text,
  year_graduated integer,
  created_at timestamptz DEFAULT now()
);

-- Work history (previous employment)
CREATE TABLE IF NOT EXISTS employee_work_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  position text NOT NULL,
  start_date date,
  end_date date,
  reason_for_leaving text,
  created_at timestamptz DEFAULT now()
);

-- Documents (Supabase Storage metadata)
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee ON employee_emergency_contacts(employee_id);
CREATE INDEX IF NOT EXISTS idx_dependents_employee ON employee_dependents(employee_id);
CREATE INDEX IF NOT EXISTS idx_education_employee ON employee_education(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_history_employee ON employee_work_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- Department policies
CREATE POLICY "Company departments read" ON departments
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "HR+ departments write" ON departments
  FOR ALL USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Sub-table policies (via employee's company)
-- Emergency contacts
CREATE POLICY "Company contacts read" ON employee_emergency_contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
  );
CREATE POLICY "HR+ contacts write" ON employee_emergency_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Dependents
CREATE POLICY "Company dependents read" ON employee_dependents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
  );
CREATE POLICY "HR+ dependents write" ON employee_dependents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Education
CREATE POLICY "Company education read" ON employee_education
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
  );
CREATE POLICY "HR+ education write" ON employee_education
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Work history
CREATE POLICY "Company work_history read" ON employee_work_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
  );
CREATE POLICY "HR+ work_history write" ON employee_work_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE employees.id = employee_id AND employees.company_id = public.get_my_company_id())
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- Documents
CREATE POLICY "Company documents read" ON employee_documents
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "HR+ documents write" ON employee_documents
  FOR ALL USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin','company_admin','hr_manager')
  );

-- ============================================================
-- migrations/020_phase3_time_attendance.sql
-- ============================================================
-- Migration: Phase 3 - Time & Attendance
-- Tables: work_schedules, employee_schedules, daily_time_records, holidays
-- Function: seed_holidays_2026(p_company_id uuid)

-- ============================================================================
-- 1. WORK SCHEDULES (shift templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_schedules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    name text NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    break_minutes integer DEFAULT 60,
    is_flexible boolean DEFAULT false,
    grace_period_minutes integer DEFAULT 0,
    work_days integer[] DEFAULT '{1,2,3,4,5}',
    is_night_diff boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    active boolean DEFAULT true,
    UNIQUE(company_id, name)
);

CREATE INDEX idx_work_schedules_company ON work_schedules(company_id);
CREATE INDEX idx_work_schedules_active ON work_schedules(company_id, active);

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_schedules_select ON work_schedules
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY work_schedules_insert ON work_schedules
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY work_schedules_update ON work_schedules
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY work_schedules_delete ON work_schedules
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 2. EMPLOYEE SCHEDULES (assign schedule to employee)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_schedules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    employee_id uuid NOT NULL REFERENCES employees(id),
    schedule_id uuid NOT NULL REFERENCES work_schedules(id),
    effective_from date NOT NULL,
    effective_to date,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_employee_schedules_company ON employee_schedules(company_id);
CREATE INDEX idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_schedule ON employee_schedules(schedule_id);
CREATE INDEX idx_employee_schedules_effective ON employee_schedules(employee_id, effective_from, effective_to);

ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_schedules_select ON employee_schedules
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY employee_schedules_insert ON employee_schedules
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY employee_schedules_update ON employee_schedules
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY employee_schedules_delete ON employee_schedules
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 3. DAILY TIME RECORDS (computed DTR per employee per day)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_time_records (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    employee_id uuid NOT NULL REFERENCES employees(id),
    date date NOT NULL,
    schedule_id uuid REFERENCES work_schedules(id),
    first_in timestamptz,
    last_out timestamptz,
    total_hours_worked numeric(6,2),
    regular_hours numeric(6,2),
    night_diff_hours numeric(6,2),
    late_minutes integer DEFAULT 0,
    undertime_minutes integer DEFAULT 0,
    is_rest_day boolean DEFAULT false,
    is_holiday boolean DEFAULT false,
    holiday_type text,
    status text DEFAULT 'computed' CHECK (status IN ('computed', 'adjusted', 'approved')),
    remarks text,
    computed_at timestamptz DEFAULT now(),
    approved_by uuid,
    approved_at timestamptz,
    UNIQUE(company_id, employee_id, date)
);

CREATE INDEX idx_dtr_company ON daily_time_records(company_id);
CREATE INDEX idx_dtr_employee ON daily_time_records(employee_id);
CREATE INDEX idx_dtr_date ON daily_time_records(company_id, date);
CREATE INDEX idx_dtr_employee_date ON daily_time_records(employee_id, date);
CREATE INDEX idx_dtr_status ON daily_time_records(company_id, status);

ALTER TABLE daily_time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY dtr_select ON daily_time_records
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY dtr_insert ON daily_time_records
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY dtr_update ON daily_time_records
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY dtr_delete ON daily_time_records
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 4. HOLIDAYS (Philippine holiday calendar)
-- ============================================================================

CREATE TABLE IF NOT EXISTS holidays (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id),
    date date NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('regular', 'special_non_working', 'special_working')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(company_id, date)
);

CREATE INDEX idx_holidays_company ON holidays(company_id);
CREATE INDEX idx_holidays_date ON holidays(company_id, date);
CREATE INDEX idx_holidays_type ON holidays(company_id, type);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY holidays_select ON holidays
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY holidays_insert ON holidays
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY holidays_update ON holidays
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY holidays_delete ON holidays
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- ============================================================================
-- 5. SEED FUNCTION: 2026 Philippine Holidays (DOLE)
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_holidays_2026(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Regular Holidays (per DOLE)
    INSERT INTO holidays (company_id, date, name, type) VALUES
        (p_company_id, '2026-01-01', 'New Year''s Day', 'regular'),
        (p_company_id, '2026-04-02', 'Maundy Thursday', 'regular'),
        (p_company_id, '2026-04-03', 'Good Friday', 'regular'),
        (p_company_id, '2026-04-09', 'Araw ng Kagitingan (Day of Valor)', 'regular'),
        (p_company_id, '2026-05-01', 'Labor Day', 'regular'),
        (p_company_id, '2026-06-12', 'Independence Day', 'regular'),
        (p_company_id, '2026-08-31', 'National Heroes Day', 'regular'),
        (p_company_id, '2026-11-30', 'Bonifacio Day', 'regular'),
        (p_company_id, '2026-12-25', 'Christmas Day', 'regular'),
        (p_company_id, '2026-12-30', 'Rizal Day', 'regular'),
        -- Eid'l Fitr (estimated — moves annually based on Islamic calendar)
        (p_company_id, '2026-03-20', 'Eid''l Fitr (Feast of Ramadan)', 'regular'),
        -- Eid'l Adha (estimated — moves annually based on Islamic calendar)
        (p_company_id, '2026-05-27', 'Eid''l Adha (Feast of Sacrifice)', 'regular')
    ON CONFLICT (company_id, date) DO NOTHING;

    -- Special Non-Working Holidays
    INSERT INTO holidays (company_id, date, name, type) VALUES
        (p_company_id, '2026-02-01', 'Chinese New Year', 'special_non_working'),
        (p_company_id, '2026-02-25', 'EDSA People Power Revolution Anniversary', 'special_non_working'),
        (p_company_id, '2026-04-04', 'Black Saturday', 'special_non_working'),
        (p_company_id, '2026-08-21', 'Ninoy Aquino Day', 'special_non_working'),
        (p_company_id, '2026-11-01', 'All Saints'' Day', 'special_non_working'),
        (p_company_id, '2026-11-02', 'All Souls'' Day', 'special_non_working'),
        (p_company_id, '2026-12-08', 'Feast of the Immaculate Conception of Mary', 'special_non_working'),
        (p_company_id, '2026-12-24', 'Christmas Eve', 'special_non_working'),
        (p_company_id, '2026-12-31', 'Last Day of the Year', 'special_non_working')
    ON CONFLICT (company_id, date) DO NOTHING;
END;
$$;

-- ============================================================
-- migrations/030_phase4_leave_management.sql
-- ============================================================
-- ============================================================================
-- Phase 4: Leave Management
-- Philippine HRIS — configurable leave types, balances, and requests
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. leave_types — configurable leave types per company
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    name            text        NOT NULL,
    code            text        NOT NULL,
    description     text,
    days_per_year   numeric(5,2) NOT NULL,
    is_paid         boolean     DEFAULT true,
    is_convertible  boolean     DEFAULT false,
    requires_attachment boolean DEFAULT false,
    gender_specific text        CHECK (gender_specific IN ('male', 'female')),
    min_service_months integer  DEFAULT 0,
    allow_half_day  boolean     DEFAULT true,
    carry_over_max  numeric(5,2) DEFAULT 0,
    prorate_on_hire boolean     DEFAULT true,
    active          boolean     DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

-- --------------------------------------------------------------------------
-- 2. leave_balances — per employee per leave type per year
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_balances (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    employee_id     uuid        NOT NULL REFERENCES employees(id),
    leave_type_id   uuid        NOT NULL REFERENCES leave_types(id),
    year            integer     NOT NULL,
    entitled_days   numeric(5,2) NOT NULL,
    used_days       numeric(5,2) DEFAULT 0,
    pending_days    numeric(5,2) DEFAULT 0,
    carried_over    numeric(5,2) DEFAULT 0,
    adjusted_days   numeric(5,2) DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, leave_type_id, year)
);

-- Note: available_days = entitled_days + carried_over + adjusted_days - used_days - pending_days (computed, not stored)

-- --------------------------------------------------------------------------
-- 3. leave_requests — individual leave applications
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    employee_id     uuid        NOT NULL REFERENCES employees(id),
    leave_type_id   uuid        NOT NULL REFERENCES leave_types(id),
    start_date      date        NOT NULL,
    end_date        date        NOT NULL,
    total_days      numeric(4,2) NOT NULL,
    is_half_day     boolean     DEFAULT false,
    half_day_period text        CHECK (half_day_period IN ('morning', 'afternoon')),
    reason          text,
    attachment_path text,
    status          text        DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    filed_by        uuid        NOT NULL,
    approved_by     uuid,
    approved_at     timestamptz,
    rejection_reason text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 4. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX idx_leave_types_company       ON leave_types(company_id);
CREATE INDEX idx_leave_types_company_active ON leave_types(company_id, active);

CREATE INDEX idx_leave_balances_company         ON leave_balances(company_id);
CREATE INDEX idx_leave_balances_employee        ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_employee_year   ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_type_year       ON leave_balances(leave_type_id, year);

CREATE INDEX idx_leave_requests_company        ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_employee       ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status         ON leave_requests(status);
CREATE INDEX idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);
CREATE INDEX idx_leave_requests_company_status ON leave_requests(company_id, status);

-- --------------------------------------------------------------------------
-- 5. Row Level Security
-- --------------------------------------------------------------------------

-- leave_types
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_types_select ON leave_types
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY leave_types_insert ON leave_types
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager', 'employee')
    );

CREATE POLICY leave_types_update ON leave_types
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY leave_types_delete ON leave_types
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- leave_balances
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_balances_select ON leave_balances
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY leave_balances_insert ON leave_balances
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager', 'employee')
    );

CREATE POLICY leave_balances_update ON leave_balances
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY leave_balances_delete ON leave_balances
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_requests_select ON leave_requests
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY leave_requests_insert ON leave_requests
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager', 'employee')
    );

CREATE POLICY leave_requests_update ON leave_requests
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

CREATE POLICY leave_requests_delete ON leave_requests
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'admin', 'hr_manager')
    );

-- --------------------------------------------------------------------------
-- 6. Seed function — standard Philippine leave types
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_ph_leave_types(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO leave_types (company_id, code, name, description, days_per_year, is_paid, is_convertible, requires_attachment, gender_specific, min_service_months, allow_half_day, carry_over_max, prorate_on_hire)
    VALUES
        -- Vacation Leave (SIL minimum)
        (p_company_id, 'VL',   'Vacation Leave',              'Annual vacation leave (SIL minimum)',                            5,   true,  true,  false, NULL,     0, true,  0, true),
        -- Sick Leave
        (p_company_id, 'SL',   'Sick Leave',                  'Sick leave — medical certificate required if >3 consecutive days', 5,   true,  false, true,  NULL,     0, true,  0, true),
        -- Maternity Leave (RA 11210 — 105 days)
        (p_company_id, 'ML',   'Maternity Leave',             'Expanded Maternity Leave (RA 11210) — 105 days',                105, true,  false, false, 'female', 0, false, 0, false),
        -- Paternity Leave (RA 8187 — 7 days)
        (p_company_id, 'PL',   'Paternity Leave',             'Paternity Leave (RA 8187) — 7 days',                              7,  true,  false, false, 'male',   0, false, 0, false),
        -- Solo Parent Leave (RA 8972 — 7 days)
        (p_company_id, 'SPL',  'Solo Parent Leave',           'Solo Parent Leave (RA 8972) — 7 working days',                    7,  true,  false, false, NULL,     0, true,  0, true),
        -- Service Incentive Leave (DOLE minimum)
        (p_company_id, 'SIL',  'Service Incentive Leave',     'DOLE-mandated Service Incentive Leave — 5 days (often merged with VL)', 5, true, true, false, NULL, 0, true, 0, true),
        -- VAWC Leave (RA 9262 — 10 days)
        (p_company_id, 'VAWC', 'VAWC Leave',                  'Leave for victims of violence against women and children (RA 9262)', 10, true, false, false, 'female', 0, true, 0, false),
        -- Special Leave for Women (RA 9710 — 60 days)
        (p_company_id, 'SLW',  'Special Leave for Women',     'Special Leave for Women (RA 9710) — gynecological surgery',       60,  true,  false, false, 'female', 0, false, 0, false)
    ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================
-- migrations/040_phase5_payroll.sql
-- ============================================================
-- ============================================================================
-- Phase 5: Payroll Engine
-- Philippine HRIS — salary records, allowances, loans, payroll runs & items
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. salary_records — base salary per employee with effective dates
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_records (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    employee_id     uuid        NOT NULL REFERENCES employees(id),
    basic_salary    numeric(12,2) NOT NULL,
    daily_rate      numeric(10,2) NOT NULL,
    hourly_rate     numeric(10,2) NOT NULL,
    effective_from  date        NOT NULL,
    effective_to    date,
    pay_basis       text        NOT NULL DEFAULT 'monthly' CHECK (pay_basis IN ('monthly', 'daily')),
    days_per_month  integer     NOT NULL DEFAULT 22,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, effective_from)
);

CREATE INDEX idx_salary_records_company ON salary_records(company_id);
CREATE INDEX idx_salary_records_employee ON salary_records(employee_id);
CREATE INDEX idx_salary_records_effective ON salary_records(employee_id, effective_from);

ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_records_select ON salary_records FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY salary_records_insert ON salary_records FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY salary_records_update ON salary_records FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY salary_records_delete ON salary_records FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 2. allowance_types — configurable allowance categories per company
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allowance_types (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    name            text        NOT NULL,
    code            text        NOT NULL,
    is_taxable      boolean     DEFAULT false,
    is_de_minimis   boolean     DEFAULT false,
    de_minimis_limit numeric(10,2),
    active          boolean     DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_allowance_types_company ON allowance_types(company_id);

ALTER TABLE allowance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY allowance_types_select ON allowance_types FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY allowance_types_insert ON allowance_types FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY allowance_types_update ON allowance_types FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY allowance_types_delete ON allowance_types FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 3. employee_allowances — recurring allowances assigned to employees
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_allowances (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    allowance_type_id   uuid        NOT NULL REFERENCES allowance_types(id),
    amount              numeric(10,2) NOT NULL,
    frequency           text        NOT NULL DEFAULT 'per_cutoff' CHECK (frequency IN ('per_cutoff', 'monthly')),
    active              boolean     DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, allowance_type_id)
);

CREATE INDEX idx_employee_allowances_company ON employee_allowances(company_id);
CREATE INDEX idx_employee_allowances_employee ON employee_allowances(employee_id);

ALTER TABLE employee_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_allowances_select ON employee_allowances FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY employee_allowances_insert ON employee_allowances FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_allowances_update ON employee_allowances FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_allowances_delete ON employee_allowances FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 4. loan_types — SSS, Pag-IBIG, company loans
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loan_types (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    name            text        NOT NULL,
    code            text        NOT NULL,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, code)
);

CREATE INDEX idx_loan_types_company ON loan_types(company_id);

ALTER TABLE loan_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY loan_types_select ON loan_types FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY loan_types_insert ON loan_types FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY loan_types_update ON loan_types FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY loan_types_delete ON loan_types FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 5. employee_loans — active loan deductions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_loans (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    loan_type_id        uuid        NOT NULL REFERENCES loan_types(id),
    total_amount        numeric(12,2) NOT NULL,
    monthly_deduction   numeric(10,2) NOT NULL,
    remaining_balance   numeric(12,2) NOT NULL,
    start_date          date        NOT NULL,
    active              boolean     DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_employee_loans_company ON employee_loans(company_id);
CREATE INDEX idx_employee_loans_employee ON employee_loans(employee_id);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_loans_select ON employee_loans FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY employee_loans_insert ON employee_loans FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_loans_update ON employee_loans FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

CREATE POLICY employee_loans_delete ON employee_loans FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 6. payroll_runs — a single payroll batch
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      uuid        NOT NULL REFERENCES companies(id),
    period_start    date        NOT NULL,
    period_end      date        NOT NULL,
    pay_date        date        NOT NULL,
    cycle           text        NOT NULL CHECK (cycle IN ('semi_monthly_1', 'semi_monthly_2', 'monthly')),
    status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'computed', 'approved', 'paid')),
    total_gross     numeric(14,2) DEFAULT 0,
    total_deductions numeric(14,2) DEFAULT 0,
    total_net       numeric(14,2) DEFAULT 0,
    employee_count  integer     DEFAULT 0,
    computed_by     uuid,
    approved_by     uuid,
    approved_at     timestamptz,
    created_at      timestamptz DEFAULT now(),
    UNIQUE(company_id, period_start, period_end, cycle)
);

CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(company_id, status);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_runs_select ON payroll_runs FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY payroll_runs_insert ON payroll_runs FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_runs_update ON payroll_runs FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_runs_delete ON payroll_runs FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

-- --------------------------------------------------------------------------
-- 7. payroll_items — one row per employee per payroll run (the payslip)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_items (
    id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              uuid        NOT NULL REFERENCES companies(id),
    payroll_run_id          uuid        NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id             uuid        NOT NULL REFERENCES employees(id),
    basic_pay               numeric(10,2) DEFAULT 0,
    days_worked             numeric(5,2) DEFAULT 0,
    hours_worked            numeric(6,2) DEFAULT 0,
    regular_pay             numeric(10,2) DEFAULT 0,
    holiday_pay             numeric(10,2) DEFAULT 0,
    rest_day_pay            numeric(10,2) DEFAULT 0,
    night_diff_pay          numeric(10,2) DEFAULT 0,
    overtime_pay            numeric(10,2) DEFAULT 0,
    gross_pay               numeric(12,2) DEFAULT 0,
    sss_employee            numeric(8,2) DEFAULT 0,
    sss_employer            numeric(8,2) DEFAULT 0,
    philhealth_employee     numeric(8,2) DEFAULT 0,
    philhealth_employer     numeric(8,2) DEFAULT 0,
    pagibig_employee        numeric(8,2) DEFAULT 0,
    pagibig_employer        numeric(8,2) DEFAULT 0,
    withholding_tax         numeric(10,2) DEFAULT 0,
    total_allowances        numeric(10,2) DEFAULT 0,
    total_deductions        numeric(10,2) DEFAULT 0,
    loan_deductions         numeric(10,2) DEFAULT 0,
    other_deductions        numeric(10,2) DEFAULT 0,
    late_undertime_deductions numeric(10,2) DEFAULT 0,
    net_pay                 numeric(12,2) DEFAULT 0,
    adjustments             jsonb       DEFAULT '{}',
    breakdown               jsonb       DEFAULT '{}',
    created_at              timestamptz DEFAULT now(),
    UNIQUE(payroll_run_id, employee_id)
);

CREATE INDEX idx_payroll_items_company ON payroll_items(company_id);
CREATE INDEX idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_employee ON payroll_items(employee_id);

ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_items_select ON payroll_items FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY payroll_items_insert ON payroll_items FOR INSERT
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_items_update ON payroll_items FOR UPDATE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

CREATE POLICY payroll_items_delete ON payroll_items FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'payroll_officer')
    );

-- ============================================================
-- migrations/050_phase6_overtime.sql
-- ============================================================
-- ============================================================================
-- Phase 6: Overtime Filing & Approval
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. overtime_requests — employee OT filing with approval workflow
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS overtime_requests (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    date                date        NOT NULL,
    start_time          time        NOT NULL,
    end_time            time        NOT NULL,
    ot_hours            numeric(4,2) NOT NULL,
    reason              text,
    status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    filed_by            uuid        NOT NULL,
    approved_by         uuid,
    approved_at         timestamptz,
    rejection_reason    text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, date, start_time)
);

CREATE INDEX idx_overtime_requests_company ON overtime_requests(company_id);
CREATE INDEX idx_overtime_requests_employee ON overtime_requests(employee_id);
CREATE INDEX idx_overtime_requests_date ON overtime_requests(company_id, date);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(company_id, status);

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- All company users can read
CREATE POLICY overtime_requests_select ON overtime_requests FOR SELECT
    USING (company_id = public.get_my_company_id());

-- Employees and admins can create OT requests
CREATE POLICY overtime_requests_insert ON overtime_requests FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());

-- HR/admin/department_manager can update (approve/reject); employee can cancel own
CREATE POLICY overtime_requests_update ON overtime_requests FOR UPDATE
    USING (company_id = public.get_my_company_id());

-- Only HR+ can delete
CREATE POLICY overtime_requests_delete ON overtime_requests FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );

-- ============================================================
-- migrations/055_time_declarations.sql
-- ============================================================
-- ============================================================================
-- Phase 6B: Time Declarations (Manual Clock-In/Out for Field Employees)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. time_declarations — manual time entry with approval workflow
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_declarations (
    id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          uuid        NOT NULL REFERENCES companies(id),
    employee_id         uuid        NOT NULL REFERENCES employees(id),
    date                date        NOT NULL,
    clock_in            time        NOT NULL,
    clock_out           time        NOT NULL,
    hours_worked        numeric(4,2) NOT NULL,
    location            text,
    reason              text        NOT NULL,
    status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    filed_by            uuid        NOT NULL,
    approved_by         uuid,
    approved_at         timestamptz,
    rejection_reason    text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(company_id, employee_id, date)
);

CREATE INDEX idx_time_declarations_company ON time_declarations(company_id);
CREATE INDEX idx_time_declarations_employee ON time_declarations(employee_id);
CREATE INDEX idx_time_declarations_date ON time_declarations(company_id, date);
CREATE INDEX idx_time_declarations_status ON time_declarations(company_id, status);

ALTER TABLE time_declarations ENABLE ROW LEVEL SECURITY;

-- All company users can read
CREATE POLICY time_declarations_select ON time_declarations FOR SELECT
    USING (company_id = public.get_my_company_id());

-- Employees and admins can create declarations
CREATE POLICY time_declarations_insert ON time_declarations FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());

-- HR/admin/department_manager can update (approve/reject); employee can cancel own
CREATE POLICY time_declarations_update ON time_declarations FOR UPDATE
    USING (company_id = public.get_my_company_id());

-- Only HR+ can delete
CREATE POLICY time_declarations_delete ON time_declarations FOR DELETE
    USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
    );
