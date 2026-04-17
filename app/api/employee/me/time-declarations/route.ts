import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const ctx = await getEmployeeContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("time_declarations")
    .select("*")
    .eq("employee_id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, clock_in, clock_out, hours_worked, location, reason } = body;

  if (!date || !clock_in || !clock_out || !hours_worked || !reason) {
    return NextResponse.json(
      { error: "Missing required fields: date, clock_in, clock_out, hours_worked, reason" },
      { status: 400 }
    );
  }

  const parsedHours = parseFloat(hours_worked);
  if (isNaN(parsedHours) || parsedHours <= 0) {
    return NextResponse.json(
      { error: "hours_worked must be a positive number" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Check for existing declaration on the same date
  const { data: existing } = await supabase
    .from("time_declarations")
    .select("id, status")
    .eq("employee_id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .eq("date", date)
    .in("status", ["pending", "approved"])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You already have a pending or approved declaration for this date" },
      { status: 400 }
    );
  }

  const { data: declaration, error: declErr } = await supabase
    .from("time_declarations")
    .insert({
      company_id: ctx.companyId,
      employee_id: ctx.employeeId,
      date,
      clock_in,
      clock_out,
      hours_worked: parsedHours,
      location: location ?? null,
      reason,
      status: "pending",
      filed_by: ctx.userId,
    })
    .select()
    .single();

  if (declErr) return NextResponse.json({ error: declErr.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "time_declaration",
    entityId: declaration.id,
    changes: {
      status: { old: null, new: "pending" },
      hours_worked: { old: null, new: parsedHours },
    },
  });

  return NextResponse.json(declaration);
}
