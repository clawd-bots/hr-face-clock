import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];
const VALID_ROLES = [
  "super_admin",
  "company_admin",
  "hr_manager",
  "payroll_officer",
  "department_manager",
  "employee",
];

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
 * Update a user's role or active status.
 * Body: { role?: string, active?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === ctx.userId) {
    return NextResponse.json(
      { error: "You cannot modify your own account here" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { role, active, managed_department_ids } = body;

  const supabase = getSupabaseService();

  // Verify the target user belongs to this company
  const { data: target } = await supabase
    .from("user_profiles")
    .select("id, system_role, active, email")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  const auditChanges: Record<string, { old: unknown; new: unknown }> = {};

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // Only super_admin can promote anyone to super_admin
    if (role === "super_admin" && ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can grant the super_admin role" },
        { status: 403 }
      );
    }
    // Only super_admin can demote a super_admin
    if (target.system_role === "super_admin" && ctx.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin can change a super_admin's role" },
        { status: 403 }
      );
    }
    if (role !== target.system_role) {
      updateData.system_role = role;
      auditChanges.system_role = { old: target.system_role, new: role };
    }
  }

  if (active !== undefined && active !== target.active) {
    updateData.active = active;
    auditChanges.active = { old: target.active, new: active };

    // If deactivating, also revoke all active sessions for safety
    if (active === false) {
      try {
        await supabase.auth.admin.signOut(id);
      } catch { /* best-effort */ }
    }
  }

  // Sync managed-department links when explicitly provided OR when role flips
  let syncManagedDepts = false;
  if (Array.isArray(managed_department_ids)) {
    syncManagedDepts = true;
  }

  if (Object.keys(updateData).length === 0 && !syncManagedDepts) {
    return NextResponse.json({ message: "No changes" });
  }

  const { data, error } = Object.keys(updateData).length > 0
    ? await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()
    : await supabase
        .from("user_profiles")
        .select()
        .eq("id", id)
        .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Replace managed-department rows if provided, OR clear them if role changed
  // away from department_manager
  const finalRole = (updateData.system_role as string) ?? target.system_role;
  if (syncManagedDepts || (role !== undefined && role !== "department_manager")) {
    await supabase.from("user_managed_departments").delete().eq("user_id", id);
    if (
      finalRole === "department_manager" &&
      Array.isArray(managed_department_ids) &&
      managed_department_ids.length > 0
    ) {
      const rows = managed_department_ids
        .filter((dId: unknown): dId is string => typeof dId === "string" && !!dId)
        .map((department_id: string) => ({
          user_id: id,
          department_id,
          company_id: ctx.companyId,
        }));
      if (rows.length > 0) {
        await supabase.from("user_managed_departments").insert(rows);
      }
    }
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "user_profile",
    entityId: id,
    changes: auditChanges,
  });

  return NextResponse.json(data);
}

/**
 * Delete a user account: removes user_profiles row + auth user.
 * Keeps the linked employee record intact.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === ctx.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Verify ownership and get info for audit
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
      { error: "Only super_admin can delete a super_admin" },
      { status: 403 }
    );
  }

  // Delete profile first (RLS-scoped), then auth user
  const { error: profErr } = await supabase
    .from("user_profiles")
    .delete()
    .eq("id", id);

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  // auth.admin.deleteUser is idempotent enough for our purposes
  try {
    await supabase.auth.admin.deleteUser(id);
  } catch (err) {
    // Profile already deleted; log but don't fail the response
    console.error("Failed to delete auth user", err);
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "delete",
    entityType: "user_profile",
    entityId: id,
    changes: { email: { old: target.email, new: null } },
  });

  return NextResponse.json({ success: true });
}
