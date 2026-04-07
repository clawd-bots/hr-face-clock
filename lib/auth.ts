import { getSupabaseServer } from "./supabase-server";
import type { UserProfile, SystemRole } from "./types/database";

export type AuthUser = {
  id: string;
  email: string;
  profile: UserProfile;
};

/**
 * Get the currently authenticated user and their profile.
 * Returns null if not authenticated or no profile exists.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email || "",
    profile: profile as UserProfile,
  };
}

/**
 * Require that the current user has one of the specified roles.
 * Returns the AuthUser if authorized, throws otherwise.
 */
export async function requireRole(
  allowedRoles: SystemRole[]
): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!allowedRoles.includes(user.profile.system_role)) {
    throw new Error("Insufficient permissions");
  }

  return user;
}

/**
 * Check if a role has permission for a given action.
 */
export function hasPermission(
  role: SystemRole,
  requiredRoles: SystemRole[]
): boolean {
  return requiredRoles.includes(role);
}
