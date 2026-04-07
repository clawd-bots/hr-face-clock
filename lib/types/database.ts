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
