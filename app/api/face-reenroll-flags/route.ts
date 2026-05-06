/**
 * Telemetry-driven re-enrollment flagging.
 *
 * GET — list employees currently flagged needs_face_reenroll = true
 *       (with reason). HR-side surface for "who should we ask to
 *       re-capture their face?".
 *
 * POST — re-runs the flagging pass:
 *   - For each employee with face_descriptors, look at their last 30
 *     days of clock-ins.
 *   - If their average match_distance is creeping high (>= 0.40),
 *     OR they had >= 2 close-call matches (margin < 0.10),
 *     OR they had a Not Me correction in the last 30 days,
 *     mark needs_face_reenroll = true with the reason.
 *   - Idempotent: re-running with no degrading data clears the flag.
 *
 * Triggered manually from /admin/employees by HR; could also be
 * scheduled (cron) later.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id, system_role")
        .eq("id", user.id)
        .single();
      return {
        userId: user.id,
        companyId: profile?.company_id ?? null,
        role: profile?.system_role ?? null,
      };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null, role: null };
}

export async function GET() {
  const ctx = await getContext();
  if (!ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, name, face_reenroll_reason")
    .eq("company_id", ctx.companyId)
    .eq("needs_face_reenroll", true)
    .eq("active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const HIGH_DISTANCE = 0.40;
const TIGHT_MARGIN = 0.10;
const RECENT_DAYS = 30;
const MIN_RECENT_LOGS = 5; // Need enough data to be confident

export async function POST() {
  const ctx = await getContext();
  if (!ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseService();
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Pull all active employees with face data
  const { data: employees } = await supabase
    .from("employees")
    .select("id, face_descriptors")
    .eq("company_id", ctx.companyId)
    .eq("active", true);

  if (!employees) return NextResponse.json({ flagged: 0, cleared: 0 });

  // Telemetry per employee
  const { data: logs } = await supabase
    .from("time_logs")
    .select("employee_id, match_distance, match_margin")
    .eq("company_id", ctx.companyId)
    .gte("clock_in", since)
    .not("match_distance", "is", null);

  // Recent corrections
  const { data: corrections } = await supabase
    .from("face_match_corrections")
    .select("correct_employee_id, matcher_employee_id")
    .eq("company_id", ctx.companyId)
    .gte("created_at", since);

  type Stats = { avg: number; count: number; closeCalls: number };
  const statsByEmp = new Map<string, Stats>();
  for (const log of logs ?? []) {
    if (!log.employee_id || log.match_distance === null) continue;
    const cur = statsByEmp.get(log.employee_id) ?? { avg: 0, count: 0, closeCalls: 0 };
    cur.avg = (cur.avg * cur.count + log.match_distance) / (cur.count + 1);
    cur.count += 1;
    if ((log.match_margin ?? 1) < TIGHT_MARGIN) cur.closeCalls += 1;
    statsByEmp.set(log.employee_id, cur);
  }

  const correctionEmps = new Set<string>();
  for (const c of corrections ?? []) {
    if (c.correct_employee_id) correctionEmps.add(c.correct_employee_id);
    if (c.matcher_employee_id) correctionEmps.add(c.matcher_employee_id);
  }

  let flagged = 0;
  let cleared = 0;

  for (const emp of employees) {
    const hasFace = Array.isArray(emp.face_descriptors) && emp.face_descriptors.length > 0;
    if (!hasFace) continue;

    const s = statsByEmp.get(emp.id);
    let reason: string | null = null;

    if (correctionEmps.has(emp.id)) {
      reason = "Mis-identified at kiosk recently — re-enroll to refresh profile";
    } else if (s && s.count >= MIN_RECENT_LOGS && s.avg >= HIGH_DISTANCE) {
      reason = `Average match distance over last ${RECENT_DAYS} days is ${s.avg.toFixed(2)} (threshold ${HIGH_DISTANCE}). Profile drifting.`;
    } else if (s && s.closeCalls >= 2) {
      reason = `Had ${s.closeCalls} ambiguous matches in last ${RECENT_DAYS} days. Re-enroll to widen profile.`;
    }

    if (reason) {
      const { error } = await supabase
        .from("employees")
        .update({ needs_face_reenroll: true, face_reenroll_reason: reason })
        .eq("id", emp.id);
      if (!error) flagged += 1;
    } else {
      // Auto-clear stale flags when telemetry now looks fine
      const { data: emp2 } = await supabase
        .from("employees")
        .select("needs_face_reenroll")
        .eq("id", emp.id)
        .single();
      if (emp2?.needs_face_reenroll) {
        const { error } = await supabase
          .from("employees")
          .update({ needs_face_reenroll: false, face_reenroll_reason: null })
          .eq("id", emp.id);
        if (!error) cleared += 1;
      }
    }
  }

  return NextResponse.json({ flagged, cleared });
}
