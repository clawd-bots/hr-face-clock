import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
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
      };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null, role: null };
}

/**
 * Admin-initiated password reset. Body: { password: string } (>= 6 chars).
 * Returns the new password so the admin can communicate it to the user.
 * Sessions are revoked so the user must sign in again.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { password } = body;

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Verify the target user belongs to this company
  const { data: target } = await supabase
    .from("user_profiles")
    .select("id, email, system_role")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.system_role === "super_admin" && ctx.role !== "super_admin") {
    return NextResponse.json(
      { error: "Only super_admin can reset a super_admin's password" },
      { status: 403 }
    );
  }

  const { error } = await supabase.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revoke all active sessions so the user has to sign in with the new password
  try {
    await supabase.auth.admin.signOut(id);
  } catch { /* best-effort */ }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "user_profile",
    entityId: id,
    changes: { password: { old: null, new: "reset" } },
  });

  return NextResponse.json({ success: true, email: target.email });
}
