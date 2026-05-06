/**
 * HR-side PIN management for an employee.
 *
 * PATCH — set or reset an employee's PIN. HR+ only (admin/HR managers
 *         set initial PINs and reset forgotten ones).
 * DELETE — clear the PIN entirely. Falls back to face-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { hashPin, isValidPinFormat } from "@/lib/pin-auth";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { pin } = body;

  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
  }

  const supabase = getSupabaseService();
  const { data: emp } = await supabase
    .from("employees")
    .select("id, company_id, pin_hash")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { error } = await supabase
    .from("employees")
    .update({
      pin_hash: hashPin(pin, emp.id),
      pin_set_at: new Date().toISOString(),
    })
    .eq("id", emp.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "employee",
    entityId: emp.id,
    changes: { pin: { old: emp.pin_hash ? "present" : null, new: "set_by_admin" } },
  });

  return NextResponse.json({ success: true });
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
    .from("employees")
    .update({ pin_hash: null, pin_set_at: null })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "delete",
    entityType: "employee",
    entityId: id,
    changes: { pin: { old: "present", new: null } },
  });

  return NextResponse.json({ success: true });
}
