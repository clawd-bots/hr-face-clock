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
  remote_clock_in_enabled?: boolean;
  needs_face_reenroll?: boolean;
  face_reenroll_reason?: string | null;
  pin_set_at?: string | null;
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

// ---------------------------------------------------------------------------
// Phase 5: Payroll Engine
// ---------------------------------------------------------------------------

export type PayrollRunStatus = 'draft' | 'computed' | 'approved' | 'paid';
export type PayrollCycle = 'semi_monthly_1' | 'semi_monthly_2' | 'monthly';
export type PayBasis = 'monthly' | 'daily';
export type AllowanceFrequency = 'per_cutoff' | 'monthly';

export type SalaryRecord = {
  id: string;
  company_id: string;
  employee_id: string;
  basic_salary: number;
  daily_rate: number;
  hourly_rate: number;
  effective_from: string;
  effective_to: string | null;
  pay_basis: PayBasis;
  days_per_month: number;
  created_at: string;
  employee?: Employee;
};

export type AllowanceType = {
  id: string;
  company_id: string;
  name: string;
  code: string;
  is_taxable: boolean;
  is_de_minimis: boolean;
  de_minimis_limit: number | null;
  active: boolean;
  created_at: string;
};

export type EmployeeAllowance = {
  id: string;
  company_id: string;
  employee_id: string;
  allowance_type_id: string;
  amount: number;
  frequency: AllowanceFrequency;
  active: boolean;
  created_at: string;
  allowance_type?: AllowanceType;
};

export type LoanType = {
  id: string;
  company_id: string;
  name: string;
  code: string;
  created_at: string;
};

export type EmployeeLoan = {
  id: string;
  company_id: string;
  employee_id: string;
  loan_type_id: string;
  total_amount: number;
  monthly_deduction: number;
  remaining_balance: number;
  start_date: string;
  active: boolean;
  created_at: string;
  loan_type?: LoanType;
};

export type PayrollRun = {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  cycle: PayrollCycle;
  status: PayrollRunStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  computed_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  items?: PayrollItem[];
};

export type PayrollItem = {
  id: string;
  company_id: string;
  payroll_run_id: string;
  employee_id: string;
  basic_pay: number;
  days_worked: number;
  hours_worked: number;
  regular_pay: number;
  holiday_pay: number;
  rest_day_pay: number;
  night_diff_pay: number;
  overtime_pay: number;
  gross_pay: number;
  sss_employee: number;
  sss_employer: number;
  philhealth_employee: number;
  philhealth_employer: number;
  pagibig_employee: number;
  pagibig_employer: number;
  withholding_tax: number;
  total_allowances: number;
  total_deductions: number;
  loan_deductions: number;
  other_deductions: number;
  late_undertime_deductions: number;
  net_pay: number;
  adjustments: Record<string, unknown>;
  breakdown: Record<string, unknown>;
  created_at: string;
  employee?: Employee;
};

// ---------------------------------------------------------------------------
// Phase 6: Overtime Requests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Phase 6B: Time Declarations (Manual Clock-In/Out)
// ---------------------------------------------------------------------------

export type TimeDeclarationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type TimeDeclaration = {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  clock_in: string;       // HH:MM
  clock_out: string;       // HH:MM
  hours_worked: number;
  location: string | null;
  reason: string;
  status: TimeDeclarationStatus;
  filed_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
};

// ---------------------------------------------------------------------------
// Kiosk Devices
// ---------------------------------------------------------------------------

export type KioskDevice = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  ip_allowlist: string[] | null;
  paired_at: string | null;
  last_seen_at: string | null;
  last_seen_ip: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OvertimeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type OvertimeRequest = {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  start_time: string;       // HH:MM
  end_time: string;          // HH:MM
  ot_hours: number;
  reason: string | null;
  status: OvertimeRequestStatus;
  filed_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
};
