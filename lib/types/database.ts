// Database types for the HRIS system
// These will eventually be auto-generated via `supabase gen types`

export type SystemRole =
  | "super_admin"
  | "company_admin"
  | "hr_manager"
  | "payroll_officer"
  | "department_manager"
  | "employee";

export type Company = {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  active: boolean;
};

export type UserProfile = {
  id: string;
  company_id: string;
  employee_id: string | null;
  system_role: SystemRole;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  active: boolean;
};

export type EmploymentStatus =
  | "probationary"
  | "regular"
  | "contractual"
  | "consultant"
  | "intern";

export type PayFrequency = "monthly" | "semi_monthly" | "weekly" | "daily";

export type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  face_descriptors: number[][];
  photo_url: string | null;
  created_at: string;
  active: boolean;
  company_id: string | null;
  // 201 File fields
  employee_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  gender: string | null;
  date_of_birth: string | null;
  civil_status: string | null;
  nationality: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province: string | null;
  zip_code: string | null;
  phone: string | null;
  personal_email: string | null;
  work_email: string | null;
  // Government IDs
  sss_number: string | null;
  tin_number: string | null;
  philhealth_number: string | null;
  pagibig_number: string | null;
  // Employment
  employment_status: EmploymentStatus | null;
  hire_date: string | null;
  regularization_date: string | null;
  separation_date: string | null;
  separation_reason: string | null;
  position_title: string | null;
  department_id: string | null;
  reporting_to: string | null;
  work_location: string | null;
  pay_frequency: PayFrequency | null;
};

export type Department = {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  head_employee_id: string | null;
  parent_department_id: string | null;
  created_at: string;
  active: boolean;
};

export type EmergencyContact = {
  id: string;
  employee_id: string;
  name: string;
  relationship: string;
  phone: string;
  address: string | null;
  is_primary: boolean;
  created_at: string;
};

export type Dependent = {
  id: string;
  employee_id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  is_pwd: boolean;
  is_senior: boolean;
  created_at: string;
};

export type Education = {
  id: string;
  employee_id: string;
  level: string;
  school_name: string;
  degree: string | null;
  field_of_study: string | null;
  year_graduated: number | null;
  created_at: string;
};

export type WorkHistory = {
  id: string;
  employee_id: string;
  company_name: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  reason_for_leaving: string | null;
  created_at: string;
};

export type EmployeeDocument = {
  id: string;
  company_id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type TimeLog = {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number | null;
  date: string;
  created_at: string;
  company_id: string | null;
  employee?: Employee;
};

export type AuditLog = {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  ip_address: string | null;
  created_at: string;
};

// Admin roles that can access /admin
export const ADMIN_ROLES: SystemRole[] = [
  "super_admin",
  "company_admin",
  "hr_manager",
  "payroll_officer",
  "department_manager",
];

// Roles that can manage employees
export const HR_PLUS_ROLES: SystemRole[] = [
  "super_admin",
  "company_admin",
  "hr_manager",
];

// Roles that can manage payroll
export const PAYROLL_ROLES: SystemRole[] = [
  "super_admin",
  "company_admin",
  "payroll_officer",
];
