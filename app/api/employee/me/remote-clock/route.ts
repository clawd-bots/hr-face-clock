/**
 * Remote clock-in / clock-out for the authenticated employee.
 *
 * POST /api/employee/me/remote-clock
 *   body: { action: "clock_in" | "clock_out", lat, lng, accuracy }
 *
 * Requires:
 *   - Authenticated user with a linked employee record
 *   - employee.remote_clock_in_enabled = true (HR opt-in)
 *
 * Stores GPS coordinates on the resulting time_log so admins can audit.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";
import { logAudit } from "@/lib/audit";
import { recomputeDTR } from "@/lib/dtr-recompute";

type Coords = { lat: number; lng: number; accuracy: number | null };

function parseCoords(body: Record<string, unknown>): Coords | { error: string } {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const accuracy =
    body.accuracy === null || body.accuracy === undefined
      ? null
      : Number(body.accuracy);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Invalid latitude" };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Invalid longitude" };
  }
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    return { error: "Invalid accuracy" };
  }
  return { lat, lng, accuracy };
}

export async function POST(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action !== "clock_in" && action !== "clock_out") {
    return NextResponse.json(
      { error: "action must be 'clock_in' or 'clock_out'" },
      { status: 400 }
    );
  }

  const coords = parseCoords(body);
  if ("error" in coords) {
    return NextResponse.json({ error: coords.error }, { status: 400 });
  }

  const supabase = getSupabaseService();

  // Verify the employee is opted in for remote clock-in
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("id, company_id, remote_clock_in_enabled, first_name, last_name, name")
    .eq("id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .single();

  if (empErr || !emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  if (!emp.remote_clock_in_enabled) {
    return NextResponse.json(
      {
        error:
          "Remote clock-in is not enabled for your account. Ask HR to turn it on if you need to clock in from the field.",
      },
      { status: 403 }
    );
  }

  const today = new Date().toISOString().split("T")[0];

  if (action === "clock_in") {
    // Block double clock-in only for today.
    const { data: open } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("date", today)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (open) {
      return NextResponse.json(
        { error: "You're already clocked in", log: open },
        { status: 400 }
      );
    }

    // Auto-close any stale open logs from previous days (forgot to clock out).
    // Same +12h capped at end-of-day rule as the kiosk.
    const { data: staleOpen } = await supabase
      .from("time_logs")
      .select("id, clock_in, date")
      .eq("employee_id", emp.id)
      .lt("date", today)
      .is("clock_out", null);

    if (staleOpen && staleOpen.length > 0) {
      for (const stale of staleOpen) {
        const clockInMs = new Date(stale.clock_in).getTime();
        const twelveHoursLater = clockInMs + 12 * 60 * 60 * 1000;
        const eod = new Date(`${stale.date}T23:59:59Z`).getTime();
        const closeMs = Math.min(twelveHoursLater, eod);
        const closeIso = new Date(closeMs).toISOString();
        const hoursWorked = Math.round(((closeMs - clockInMs) / 3_600_000) * 100) / 100;

        await supabase
          .from("time_logs")
          .update({
            clock_out: closeIso,
            hours_worked: hoursWorked,
          })
          .eq("id", stale.id);

        void recomputeDTR(supabase, emp.company_id, emp.id, stale.date);
        await supabase
          .from("daily_time_records")
          .update({
            remarks:
              "Auto-closed at +12h: employee did not clock out and has clocked in for the next day. Please verify the actual clock-out time.",
          })
          .eq("company_id", emp.company_id)
          .eq("employee_id", emp.id)
          .eq("date", stale.date);
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_logs")
      .insert({
        employee_id: emp.id,
        clock_in: now,
        date: today,
        company_id: emp.company_id,
        remote: true,
        clock_in_lat: coords.lat,
        clock_in_lng: coords.lng,
        clock_in_accuracy: coords.accuracy,
      })
      .select(
        "*, employee:employees(id, employee_number, first_name, last_name, name, position_title)"
      )
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({
      companyId: emp.company_id,
      userId: ctx.userId,
      action: "create",
      entityType: "time_log",
      entityId: data.id,
      changes: {
        type: { old: null, new: "remote_clock_in" },
        lat: { old: null, new: coords.lat },
        lng: { old: null, new: coords.lng },
      },
    });

    void recomputeDTR(supabase, emp.company_id, emp.id, today);
    return NextResponse.json({ action: "clock_in", log: data });
  }

  // clock_out — find the most recent open log within the last 36 hours,
  // NOT restricted to today. A clock-in at 11pm yesterday must close
  // cleanly when the user clocks out at 7am today.
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data: openLog } = await supabase
    .from("time_logs")
    .select("*")
    .eq("employee_id", emp.id)
    .is("clock_out", null)
    .gte("clock_in", cutoff)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openLog) {
    return NextResponse.json(
      { error: "You don't have an open clock-in to close" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const sessionMs = new Date(now).getTime() - new Date(openLog.clock_in).getTime();

  // Same minimum-session guard as kiosk: prevent accidental rapid clock-out
  // immediately after clock-in.
  const MIN_SESSION_MS = 60 * 1000;
  if (sessionMs < MIN_SESSION_MS) {
    const seconds = Math.max(1, Math.round((MIN_SESSION_MS - sessionMs) / 1000));
    return NextResponse.json(
      {
        error: `You just clocked in. Wait ${seconds}s before clocking out.`,
        log: openLog,
      },
      { status: 400 }
    );
  }

  const hoursWorked = sessionMs / (1000 * 60 * 60);

  const { data, error } = await supabase
    .from("time_logs")
    .update({
      clock_out: now,
      hours_worked: Math.round(hoursWorked * 100) / 100,
      clock_out_lat: coords.lat,
      clock_out_lng: coords.lng,
      clock_out_accuracy: coords.accuracy,
    })
    .eq("id", openLog.id)
    .select(
      "*, employee:employees(id, employee_number, first_name, last_name, name, position_title)"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: emp.company_id,
    userId: ctx.userId,
    action: "update",
    entityType: "time_log",
    entityId: data.id,
    changes: {
      type: { old: null, new: "remote_clock_out" },
      lat: { old: null, new: coords.lat },
      lng: { old: null, new: coords.lng },
    },
  });

  void recomputeDTR(supabase, emp.company_id, emp.id, openLog.date);
  return NextResponse.json({ action: "clock_out", log: data });
}

export async function GET() {
  // Convenience endpoint: returns whether the user is opted in + their
  // current open log (if any) so the dashboard card knows what to render.
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseService();

  const { data: emp } = await supabase
    .from("employees")
    .select("remote_clock_in_enabled")
    .eq("id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const { data: open } = await supabase
    .from("time_logs")
    .select("id, clock_in, clock_out, remote, clock_in_lat, clock_in_lng")
    .eq("employee_id", ctx.employeeId)
    .eq("date", today)
    .is("clock_out", null)
    .maybeSingle();

  return NextResponse.json({
    enabled: !!emp?.remote_clock_in_enabled,
    open_log: open ?? null,
  });
}
