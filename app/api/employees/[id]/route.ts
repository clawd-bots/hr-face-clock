import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { logAudit } from "@/lib/audit";
import { getSupabaseServer } from "@/lib/supabase-server";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseService();

  // Try with department join first, fall back to without
  let { data, error } = await supabase
    .from("employees")
    .select("*, department:departments(id, name, code)")
    .eq("id", id)
    .single();

  if (error) {
    // If join fails (e.g., FK not set up yet), try without department join
    const fallback = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = getSupabaseService();

  // Get old values for audit
  const { data: oldData } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("employees")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log changes
  if (ctx.companyId && oldData) {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(body)) {
      if (oldData[key] !== body[key]) {
        changes[key] = { old: oldData[key], new: body[key] };
      }
    }
    if (Object.keys(changes).length > 0) {
      await logAudit({
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "update",
        entityType: "employee",
        entityId: id,
        changes,
      });
    }
  }

  return NextResponse.json(data);
}
