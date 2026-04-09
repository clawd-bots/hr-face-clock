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

  // Only allow updating these fields
  const allowedFields = ["entitled_days", "carried_over", "adjusted_days"];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = Number(body[key]);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  // Get old values for audit
  const { data: oldData } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!oldData) {
    return NextResponse.json({ error: "Balance not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("leave_balances")
    .update(updates)
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(updates)) {
    if (key === "updated_at") continue;
    if (oldData[key] !== updates[key]) {
      changes[key] = { old: oldData[key], new: updates[key] };
    }
  }
  if (Object.keys(changes).length > 0) {
    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "update",
      entityType: "leave_balance",
      entityId: id,
      changes,
    });
  }

  return NextResponse.json(data);
}
