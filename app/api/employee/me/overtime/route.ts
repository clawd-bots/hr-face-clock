import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseService();

  const { data: requests, error: reqErr } = await supabase
    .from("overtime_requests")
    .select("*")
    .eq("employee_id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .order("date", { ascending: false });

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, start_time, end_time, ot_hours, reason } = body;

  if (!date || !start_time || !end_time || !ot_hours) {
    return NextResponse.json(
      { error: "Missing required fields: date, start_time, end_time, ot_hours" },
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
      employee_id: ctx.employeeId,
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
    changes: { status: { old: null, new: "pending" } },
  });

  return NextResponse.json(request);
}
