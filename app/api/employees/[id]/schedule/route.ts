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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("employee_schedules")
    .select("*, work_schedules(*)")
    .eq("employee_id", id)
    .order("effective_from", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { schedule_id, effective_from } = body;

  if (!schedule_id || !effective_from) {
    return NextResponse.json(
      { error: "schedule_id and effective_from are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Find the most recent assignment without an end date and close it
  const { data: previous } = await supabase
    .from("employee_schedules")
    .select("id")
    .eq("employee_id", employeeId)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .single();

  if (previous) {
    await supabase
      .from("employee_schedules")
      .update({ effective_to: effective_from })
      .eq("id", previous.id);
  }

  // Insert new assignment
  const { data, error } = await supabase
    .from("employee_schedules")
    .insert({
      employee_id: employeeId,
      schedule_id,
      effective_from,
      company_id: companyId,
    })
    .select("*, work_schedules(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId,
    userId,
    action: "create",
    entityType: "employee_schedule",
    entityId: data.id,
    changes: {
      schedule_id: { old: null, new: schedule_id },
      effective_from: { old: null, new: effective_from },
    },
  });

  return NextResponse.json(data, { status: 201 });
}
