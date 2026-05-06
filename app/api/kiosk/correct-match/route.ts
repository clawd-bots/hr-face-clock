/**
 * "Not Me" correction flow on the kiosk.
 *
 * After the kiosk thinks it matched person X, but the actual person at
 * the kiosk says "that's not me", they enter their employee number and
 * PIN. We verify the PIN, fix the time_log to point to the correct
 * employee, log the correction, and flag both employees as needing
 * re-enrollment.
 *
 * Auth: requires a paired kiosk device (no logged-in user expected).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getKioskDevice } from "@/lib/kiosk-auth";
import { verifyPin, isValidPinFormat } from "@/lib/pin-auth";
import { logAudit } from "@/lib/audit";
import { recomputeDTR } from "@/lib/dtr-recompute";

export async function POST(req: NextRequest) {
  // Kiosk-only: must have a paired device token
  const device = await getKioskDevice(req);
  if (!device) {
    return NextResponse.json({ error: "Kiosk not paired" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { time_log_id, employee_number, pin } = body;

  if (!time_log_id || typeof time_log_id !== "string") {
    return NextResponse.json({ error: "time_log_id is required" }, { status: 400 });
  }
  if (!employee_number || typeof employee_number !== "string") {
    return NextResponse.json({ error: "Employee number is required" }, { status: 400 });
  }
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  // Fetch the original log + the matcher's pick
  const { data: originalLog } = await supabase
    .from("time_logs")
    .select("*, employee:employees(id, name, first_name, last_name)")
    .eq("id", time_log_id)
    .eq("company_id", device.company_id)
    .single();

  if (!originalLog) {
    return NextResponse.json({ error: "Time log not found" }, { status: 404 });
  }

  // Find the actual employee by employee_number
  const { data: realEmployee } = await supabase
    .from("employees")
    .select("id, company_id, pin_hash, name, first_name, last_name")
    .eq("company_id", device.company_id)
    .eq("employee_number", employee_number.trim())
    .maybeSingle();

  if (!realEmployee) {
    return NextResponse.json(
      { error: "No employee with that number" },
      { status: 404 }
    );
  }

  if (!verifyPin(pin, realEmployee.id, realEmployee.pin_hash)) {
    return NextResponse.json(
      {
        error:
          "PIN doesn't match. Ask HR to set or reset your PIN if you forgot it.",
      },
      { status: 403 }
    );
  }

  // Re-attribute the log: change employee_id, mark as remote=false (still
  // kiosk), keep clock_in/clock_out untouched.
  const { error: updErr } = await supabase
    .from("time_logs")
    .update({ employee_id: realEmployee.id })
    .eq("id", originalLog.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Log the correction
  await supabase.from("face_match_corrections").insert({
    company_id: device.company_id,
    original_time_log_id: originalLog.id,
    matcher_employee_id: originalLog.employee_id,
    correct_employee_id: realEmployee.id,
    matcher_distance: originalLog.match_distance,
    matcher_runner_up: originalLog.match_runner_up_distance,
    matcher_margin: originalLog.match_margin,
    corrected_time_log_id: originalLog.id,
  });

  // Flag both employees for re-enrollment review.
  // Only flag the wrongly-matched employee if they have face data — otherwise
  // there's nothing to fix on their side.
  await supabase
    .from("employees")
    .update({
      needs_face_reenroll: true,
      face_reenroll_reason: "Mis-identified at kiosk",
    })
    .eq("id", realEmployee.id);

  if (originalLog.employee_id) {
    await supabase
      .from("employees")
      .update({
        needs_face_reenroll: true,
        face_reenroll_reason: "Confused with another employee at kiosk",
      })
      .eq("id", originalLog.employee_id);
  }

  // Recompute DTRs for both employees on the affected date
  void recomputeDTR(supabase, device.company_id, realEmployee.id, originalLog.date);
  if (originalLog.employee_id) {
    void recomputeDTR(
      supabase,
      device.company_id,
      originalLog.employee_id,
      originalLog.date
    );
  }

  // Audit log — no user_id since kiosk isn't authenticated as a user
  await logAudit({
    companyId: device.company_id,
    userId: null,
    action: "update",
    entityType: "time_log",
    entityId: originalLog.id,
    changes: {
      employee_id: { old: originalLog.employee_id, new: realEmployee.id },
      reason: { old: null, new: "kiosk_not_me_correction" },
    },
  });

  const realName = realEmployee.first_name
    ? `${realEmployee.first_name} ${realEmployee.last_name ?? ""}`.trim()
    : realEmployee.name;

  return NextResponse.json({
    success: true,
    employee_name: realName,
  });
}
