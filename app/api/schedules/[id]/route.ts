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
  } catch {}
  return { userId: null, companyId: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const body = await req.json();

  // Fetch current record for audit diff
  const { data: existing, error: fetchError } = await supabase
    .from("work_schedules")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const allowedFields = [
    "name",
    "start_time",
    "end_time",
    "break_minutes",
    "is_flexible",
    "grace_period_minutes",
    "work_days",
    "is_night_diff",
    "active",
  ];

  const updates: Record<string, unknown> = {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of allowedFields) {
    if (field in body && body[field] !== existing[field]) {
      updates[field] = body[field];
      changes[field] = { old: existing[field], new: body[field] };
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  const { data, error } = await supabase
    .from("work_schedules")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId,
    userId,
    action: "update",
    entityType: "work_schedule",
    entityId: id,
    changes,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("work_schedules")
    .update({ active: false })
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId,
    userId,
    action: "delete",
    entityType: "work_schedule",
    entityId: id,
    changes: { active: { old: true, new: false } },
  });

  return NextResponse.json(data);
}
