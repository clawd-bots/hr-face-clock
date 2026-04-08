/**
 * Shared auth context helper for employee "me" API endpoints.
 * Resolves the authenticated user's employee_id from user_profiles.
 */

import { getSupabaseServer } from "@/lib/supabase-server";

export type EmployeeContext = {
  userId: string;
  companyId: string;
  employeeId: string;
};

/**
 * Get the authenticated employee context.
 * Returns null if not authenticated or no linked employee record.
 */
export async function getEmployeeContext(): Promise<EmployeeContext | null> {
  try {
    const serverClient = await getSupabaseServer();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) return null;

    const { data: profile } = await serverClient
      .from("user_profiles")
      .select("company_id, employee_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id || !profile?.employee_id) return null;

    return {
      userId: user.id,
      companyId: profile.company_id,
      employeeId: profile.employee_id,
    };
  } catch {
    return null;
  }
}
