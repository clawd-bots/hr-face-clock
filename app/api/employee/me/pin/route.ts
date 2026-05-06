/**
 * Employee self-service PIN management.
 *
 * GET — returns whether the current employee has a PIN set
 * PATCH — sets or changes the PIN. If a PIN already exists, the request
 *         must include current_pin. New PINs require no auth challenge
 *         beyond the session (employees only manage their own).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";
import { logAudit } from "@/lib/audit";
import { hashPin, verifyPin, isValidPinFormat } from "@/lib/pin-auth";

export async function GET() {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseService();
  const { data } = await supabase
    .from("employees")
    .select("pin_set_at")
    .eq("id", ctx.employeeId)
    .single();

  return NextResponse.json({
    has_pin: !!data?.pin_set_at,
    pin_set_at: data?.pin_set_at ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { current_pin, new_pin } = body;

  if (!isValidPinFormat(new_pin)) {
    return NextResponse.json(
      { error: "PIN must be 4-6 digits" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();
  const { data: emp } = await supabase
    .from("employees")
    .select("id, pin_hash")
    .eq("id", ctx.employeeId)
    .single();

  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // If a PIN exists, require the current one to change it.
  if (emp.pin_hash) {
    if (!isValidPinFormat(current_pin)) {
      return NextResponse.json(
        { error: "Current PIN is required" },
        { status: 400 }
      );
    }
    if (!verifyPin(current_pin, emp.id, emp.pin_hash)) {
      return NextResponse.json(
        { error: "Current PIN is incorrect" },
        { status: 403 }
      );
    }
  }

  const newHash = hashPin(new_pin, emp.id);
  const { error } = await supabase
    .from("employees")
    .update({ pin_hash: newHash, pin_set_at: new Date().toISOString() })
    .eq("id", emp.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "employee",
    entityId: emp.id,
    changes: { pin: { old: emp.pin_hash ? "present" : null, new: "present" } },
  });

  return NextResponse.json({ success: true });
}
