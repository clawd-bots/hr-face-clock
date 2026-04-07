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
