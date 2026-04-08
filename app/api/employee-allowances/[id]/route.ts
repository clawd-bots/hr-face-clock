import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      return { userId: user.id, companyId: profile?.company_id ?? null };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = getSupabaseService();

  const updates: Record<string, unknown> = {};
  if (body.amount != null) updates.amount = body.amount;
  if (body.frequency != null) updates.frequency = body.frequency;
  if (body.active != null) updates.active = body.active;

  const { data, error } = await supabase
    .from("employee_allowances")
    .update(updates)
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .select("*, allowance_type:allowance_types(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "employee_allowance",
    entityId: id,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseService();

  const { error } = await supabase
    .from("employee_allowances")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "delete",
    entityType: "employee_allowance",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
