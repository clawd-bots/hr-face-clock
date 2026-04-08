import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") || new Date().getFullYear().toString();
  const type = searchParams.get("type"); // "balances" | "requests"

  const supabase = getSupabaseService();

  if (type === "balances" || !type) {
    const { data: balances, error: balErr } = await supabase
      .from("leave_balances")
      .select("*, leave_type:leave_types(id, name, code, is_paid)")
      .eq("employee_id", ctx.employeeId)
      .eq("company_id", ctx.companyId)
      .eq("year", parseInt(year, 10));

    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 });

    if (type === "balances") return NextResponse.json(balances);

    // Return both balances and requests
    const { data: requests, error: reqErr } = await supabase
      .from("leave_requests")
      .select("*, leave_type:leave_types(id, name, code)")
      .eq("employee_id", ctx.employeeId)
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false });

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

    return NextResponse.json({ balances, requests });
  }

  // Just requests
  const { data: requests, error: reqErr } = await supabase
    .from("leave_requests")
    .select("*, leave_type:leave_types(id, name, code)")
    .eq("employee_id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false });

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leave_type_id, start_date, end_date, total_days, is_half_day, half_day_period, reason } = body;

  if (!leave_type_id || !start_date || !end_date || !total_days) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  // Check leave balance
  const year = new Date(start_date).getFullYear();
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", ctx.employeeId)
    .eq("leave_type_id", leave_type_id)
    .eq("year", year)
    .eq("company_id", ctx.companyId)
    .single();

  if (!balance) {
    return NextResponse.json({ error: "No leave balance found for this type" }, { status: 400 });
  }

  const available =
    (balance.entitled_days ?? 0) +
    (balance.carried_over ?? 0) +
    (balance.adjusted_days ?? 0) -
    (balance.used_days ?? 0) -
    (balance.pending_days ?? 0);

  if (total_days > available) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: ${available} days` },
      { status: 400 }
    );
  }

  // Create leave request
  const { data: request, error: reqErr } = await supabase
    .from("leave_requests")
    .insert({
      company_id: ctx.companyId,
      employee_id: ctx.employeeId,
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
    .select("*, leave_type:leave_types(id, name, code)")
    .single();

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

  // Increment pending_days
  await supabase
    .from("leave_balances")
    .update({ pending_days: (balance.pending_days ?? 0) + total_days })
    .eq("id", balance.id);

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "leave_request",
    entityId: request.id,
    changes: { status: { old: null, new: "pending" } },
  });

  return NextResponse.json(request);
}
