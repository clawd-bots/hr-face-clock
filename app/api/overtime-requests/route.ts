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

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  const supabase = getSupabaseService();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employee_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("overtime_requests")
    .select("*, employee:employees(id, name, first_name, last_name, employee_number)")
    .order("created_at", { ascending: false });

  if (ctx.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }
  if (from) {
    query = query.gte("date", from);
  }
  if (to) {
    query = query.lte("date", to);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employee_id, date, start_time, end_time, ot_hours, reason } = body;

  if (!employee_id || !date || !start_time || !end_time || !ot_hours) {
    return NextResponse.json(
      { error: "Missing required fields: employee_id, date, start_time, end_time, ot_hours" },
      { status: 400 }
    );
  }

  if (ot_hours <= 0) {
    return NextResponse.json(
      { error: "ot_hours must be greater than 0" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  const { data: request, error: reqErr } = await supabase
    .from("overtime_requests")
    .insert({
      company_id: ctx.companyId,
      employee_id,
      date,
      start_time,
      end_time,
      ot_hours,
      reason: reason ?? null,
      status: "pending",
      filed_by: ctx.userId,
    })
    .select()
    .single();

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "overtime_request",
    entityId: request.id,
    changes: {
      status: { old: null, new: "pending" },
      ot_hours: { old: null, new: ot_hours },
    },
  });

  return NextResponse.json(request);
}
