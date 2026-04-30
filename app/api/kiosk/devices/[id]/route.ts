import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { generatePairingCode } from "@/lib/kiosk-auth";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];
const PAIRING_TTL_MIN = 15;

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, name, description, ip_allowlist } = body;

  const supabase = getSupabaseService();

  // Verify the device belongs to the user's company
  const { data: device } = await supabase
    .from("kiosk_devices")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  let updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let auditAction: "update" | "revoke" | "regenerate" = "update";
  let auditChanges: Record<string, unknown> = {};

  if (action === "revoke") {
    updateData = {
      ...updateData,
      revoked_at: new Date().toISOString(),
      token_hash: null,
    };
    auditAction = "revoke";
    auditChanges = { revoked_at: { old: null, new: updateData.revoked_at } };
  } else if (action === "regenerate_code") {
    // Issue a fresh pairing code (e.g. if the old one expired or device needs re-pair)
    const code = generatePairingCode();
    const expires = new Date(Date.now() + PAIRING_TTL_MIN * 60_000).toISOString();
    updateData = {
      ...updateData,
      pairing_code: code,
      pairing_code_expires_at: expires,
      token_hash: null,
      paired_at: null,
      revoked_at: null,
    };
    auditAction = "regenerate";
    auditChanges = { pairing_code: { old: null, new: "regenerated" } };
  } else {
    // Plain update: name / description / ip_allowlist
    if (name !== undefined) {
      updateData.name = name;
      auditChanges.name = { old: device.name, new: name };
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (ip_allowlist !== undefined) {
      updateData.ip_allowlist = Array.isArray(ip_allowlist) ? ip_allowlist : [];
      auditChanges.ip_allowlist = { old: device.ip_allowlist, new: updateData.ip_allowlist };
    }
  }

  const { data, error } = await supabase
    .from("kiosk_devices")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: auditAction === "revoke" ? "delete" : "update",
    entityType: "kiosk_device",
    entityId: id,
    changes: auditChanges,
  });

  // Don't leak token_hash
  const { token_hash: _omit, ...rest } = data;
  return NextResponse.json(rest);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = getSupabaseService();

  const { error } = await supabase
    .from("kiosk_devices")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "delete",
    entityType: "kiosk_device",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
