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

  // Fetch current values for audit diff
  const { data: existing } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("leave_types")
    .update(body)
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build audit changes
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(body)) {
    if (existing[key] !== body[key]) {
      changes[key] = { old: existing[key], new: body[key] };
    }
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "leave_type",
    entityId: id,
    changes,
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
    .from("leave_types")
    .update({ active: false })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "delete",
    entityType: "leave_type",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
