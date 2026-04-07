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

// ---------------------------------------------------------------------------
// Phase 3: Time & Attendance
// ---------------------------------------------------------------------------

export type WorkSchedule = {
  id: string;
  company_id: string;
  name: string;
  start_time: string; // HH:MM format
  end_time: string;
  break_minutes: number;
  is_flexible: boolean;
  grace_period_minutes: number;
  work_days: number[]; // ISO weekday 1=Mon..7=Sun
  is_night_diff: boolean;
  created_at: string;
  active: boolean;
};

export type EmployeeSchedule = {
  id: string;
  company_id: string;
  employee_id: string;
  schedule_id: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  schedule?: WorkSchedule;
};

export type DailyTimeRecord = {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  schedule_id: string | null;
  first_in: string | null;
  last_out: string | null;
  total_hours_worked: number | null;
  regular_hours: number | null;
  night_diff_hours: number | null;
  late_minutes: number;
  undertime_minutes: number;
  is_rest_day: boolean;
  is_holiday: boolean;
  holiday_type: string | null;
  status: 'computed' | 'adjusted' | 'approved';
  remarks: string | null;
  computed_at: string;
  approved_by: string | null;
  approved_at: string | null;
  employee?: Employee;
};

export type Holiday = {
  id: string;
  company_id: string;
  date: string;
  name: string;
  type: 'regular' | 'special_non_working' | 'special_working';
  created_at: string;
};

export type DTRStatus = 'computed' | 'adjusted' | 'approved';

// ---------------------------------------------------------------------------
// Phase 4: Leave Management
// ---------------------------------------------------------------------------

export type LeaveType = {
  id: string;
  company_id: string;
  name: string;
  code: string;
  description: string | null;
  days_per_year: number;
  is_paid: boolean;
  is_convertible: boolean;
  requires_attachment: boolean;
  gender_specific: 'male' | 'female' | null;
  min_service_months: number;
  allow_half_day: boolean;
  carry_over_max: number;
  prorate_on_hire: boolean;
  active: boolean;
  created_at: string;
};

export type LeaveBalance = {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  adjusted_days: number;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  employee?: Employee;
};

export type LeaveRequest = {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_period: 'morning' | 'afternoon' | null;
  reason: string | null;
  attachment_path: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  filed_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
  employee?: Employee;
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
