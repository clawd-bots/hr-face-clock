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
    .from("leave_requests")
    .select("*, leave_type:leave_types(id, name, code), employee:employees(id, name)")
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
    query = query.gte("start_date", from);
  }
  if (to) {
    query = query.lte("end_date", to);
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
  const {
    employee_id,
    leave_type_id,
    start_date,
    end_date,
    total_days,
    is_half_day,
    half_day_period,
    reason,
  } = body;

  if (!employee_id || !leave_type_id || !start_date || !end_date || !total_days) {
    return NextResponse.json(
      { error: "Missing required fields: employee_id, leave_type_id, start_date, end_date, total_days" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Determine the year from start_date for balance lookup
  const year = new Date(start_date).getFullYear();

  // Fetch leave balance to validate availability
  const { data: balance, error: balErr } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employee_id)
    .eq("leave_type_id", leave_type_id)
    .eq("year", year)
    .eq("company_id", ctx.companyId)
    .single();

  if (balErr || !balance) {
    return NextResponse.json(
      { error: "No leave balance found for this employee/leave type/year. Initialize balances first." },
      { status: 400 }
    );
  }

  const available =
    balance.entitled_days +
    (balance.carried_over ?? 0) +
    (balance.adjusted ?? 0) -
    balance.used_days -
    balance.pending_days;

  if (available < total_days) {
    return NextResponse.json(
      { error: `Insufficient leave balance. Available: ${available}, Requested: ${total_days}` },
      { status: 400 }
    );
  }

  // Create the leave request
  const { data: request, error: reqErr } = await supabase
    .from("leave_requests")
    .insert({
      company_id: ctx.companyId,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      total_days,
      is_half_day: is_half_day ?? false,
      half_day_period: half_day_period ?? null,
      reason: reason ?? null,
      status: "pending",
      filed_by: ctx.userId,
    })
    .select()
    .single();

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

  // Increment pending_days in the balance
  const { error: updErr } = await supabase
    .from("leave_balances")
    .update({ pending_days: balance.pending_days + total_days })
    .eq("id", balance.id);

  if (updErr) {
    console.error("Failed to update pending_days:", updErr);
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "leave_request",
    entityId: request.id,
    changes: {
      status: { old: null, new: "pending" },
      total_days: { old: null, new: total_days },
    },
  });

  return NextResponse.json(request);
}
