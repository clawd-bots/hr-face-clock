/**
 * Approval authorization helper.
 *
 * Used by leave / overtime / time-declaration PATCH endpoints to decide
 * whether the requesting user is allowed to approve, reject, or cancel
 * a request for a given employee.
 *
 * Rules:
 *   - super_admin / company_admin / hr_manager → always yes (HR_PLUS)
 *   - department_manager → yes iff they manage the employee's department
 *   - everyone else → no
 */

import { getSupabaseService } from "@/lib/supabase-service";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];

export async function canApproveForEmployee(
  userId: string,
  role: string | null,
  employeeId: string
): Promise<boolean> {
  if (!role) return false;
  if (HR_PLUS.includes(role)) return true;
  if (role !== "department_manager") return false;

  const supabase = getSupabaseService();
  const { data: emp } = await supabase
    .from("employees")
    .select("department_id")
    .eq("id", employeeId)
    .single();

  if (!emp?.department_id) return false;

  const { data: link } = await supabase
    .from("user_managed_departments")
    .select("user_id")
    .eq("user_id", userId)
    .eq("department_id", emp.department_id)
    .maybeSingle();

  return !!link;
}
