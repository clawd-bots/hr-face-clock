-- ============================================================
-- Department-manager assignments.
-- A user with system_role = 'department_manager' can approve leave,
-- overtime, and time declarations for employees in any department
-- listed here.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_managed_departments (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id  uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_umd_user    ON user_managed_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_umd_dept    ON user_managed_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_umd_company ON user_managed_departments(company_id);

ALTER TABLE user_managed_departments ENABLE ROW LEVEL SECURITY;

-- Read: anyone in the company can see who manages what (small surface, used in approval UI)
CREATE POLICY umd_select ON user_managed_departments FOR SELECT
  USING (company_id = public.get_my_company_id());

-- Write: only HR+ can assign managers
CREATE POLICY umd_insert ON user_managed_departments FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
  );

CREATE POLICY umd_delete ON user_managed_departments FOR DELETE
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('super_admin', 'company_admin', 'hr_manager')
  );
