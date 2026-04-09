import { getSupabaseServer } from "./supabase-server";

/**
 * Cached auth context for API routes.
 * Resolves userId + companyId in a single query using a join,
 * instead of 2 separate queries (getUser + profile lookup).
 */
export async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id, system_role")
        .eq("id", user.id)
        .single();

      return {
        userId: user.id,
        companyId: profile?.company_id ?? null,
        role: profile?.system_role ?? null,
        authenticated: true,
      };
    }
  } catch {
    // not authenticated
  }

  return { userId: null, companyId: null, role: null, authenticated: false };
}
