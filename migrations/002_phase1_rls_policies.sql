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
