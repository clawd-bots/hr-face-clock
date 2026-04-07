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

export async function GET(req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  let query = supabase
    .from("work_schedules")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (!showAll) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    start_time,
    end_time,
    break_minutes,
    is_flexible,
    grace_period_minutes,
    work_days,
    is_night_diff,
  } = body;

  if (!name || !start_time || !end_time) {
    return NextResponse.json(
      { error: "name, start_time, and end_time are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("work_schedules")
    .insert({
      company_id: companyId,
      name,
      start_time,
      end_time,
      break_minutes: break_minutes ?? 60,
      is_flexible: is_flexible ?? false,
      grace_period_minutes: grace_period_minutes ?? 15,
      work_days: work_days ?? [1, 2, 3, 4, 5],
      is_night_diff: is_night_diff ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId,
    userId,
    action: "create",
    entityType: "work_schedule",
    entityId: data.id,
    changes: null,
  });

  return NextResponse.json(data, { status: 201 });
}
