import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PATCH /api/dtr/[id] — Manual adjustment
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId, companyId } = await getContext();

  if (!companyId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();

  // Fetch existing record to validate ownership and capture old values
  const { data: existing, error: fetchError } = await supabase
    .from("daily_time_records")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const body = await req.json();

  // Only allow certain fields to be adjusted
  const allowedFields = [
    "first_in",
    "last_out",
    "total_hours_worked",
    "regular_hours",
    "night_diff_hours",
    "late_minutes",
    "undertime_minutes",
    "remarks",
  ] as const;

  const updates: Record<string, unknown> = {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
      changes[field] = {
        old: existing[field as keyof typeof existing],
        new: body[field],
      };
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  // Mark as adjusted
  updates.status = "adjusted";
  changes.status = { old: existing.status, new: "adjusted" };

  const { data, error } = await supabase
    .from("daily_time_records")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    companyId,
    userId,
    action: "update",
    entityType: "daily_time_record",
    entityId: id,
    changes,
  });

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// POST /api/dtr/[id] — Approve DTR
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId, companyId } = await getContext();

  if (!companyId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.action !== "approve") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  // Validate the record exists and belongs to the company
  const { data: existing, error: fetchError } = await supabase
    .from("daily_time_records")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  if (existing.status === "approved") {
    return NextResponse.json(
      { error: "Record is already approved" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("daily_time_records")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: now,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    companyId,
    userId,
    action: "approve",
    entityType: "daily_time_record",
    entityId: id,
    changes: {
      status: { old: existing.status, new: "approved" },
      approved_by: { old: null, new: userId },
      approved_at: { old: null, new: now },
    },
  });

  return NextResponse.json(data);
}
