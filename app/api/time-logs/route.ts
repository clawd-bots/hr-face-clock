import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getKioskDevice } from "@/lib/kiosk-auth";
import { recomputeDTR } from "@/lib/dtr-recompute";

/**
 * Time logs API.
 * - GET: authenticated admin/employee dashboards (company-scoped).
 * - POST: kiosk clock in/out — requires either an authenticated user OR
 *   a valid kiosk device token (cookie). The device's company_id pins
 *   the log so kiosks can only clock in their own company's employees.
 */
async function getClientAndContext() {
  try {
    const serverClient = await getSupabaseServer();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      return {
        supabase: serverClient,
        isAuthenticated: true,
        companyId: profile?.company_id ?? null,
      };
    }
  } catch {
    // Not authenticated
  }

  return {
    supabase: getSupabaseService(),
    isAuthenticated: false,
    companyId: null,
  };
}

export async function GET(req: NextRequest) {
  const { supabase, companyId } = await getClientAndContext();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employee_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("time_logs")
    .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
    .order("clock_in", { ascending: false });

  if (companyId) query = query.eq("company_id", companyId);
  if (date) query = query.eq("date", date);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // Resolve the company that "owns" this clock event.
  // Either an authenticated user (admin/employee) or a paired kiosk device.
  const { isAuthenticated, companyId: authCompanyId } = await getClientAndContext();
  let companyId = authCompanyId;

  if (!isAuthenticated) {
    const device = await getKioskDevice(req);
    if (!device) {
      return NextResponse.json({ error: "Kiosk not paired or revoked" }, { status: 401 });
    }
    companyId = device.company_id;
  }

  if (!companyId) {
    return NextResponse.json({ error: "No company context" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const body = await req.json();
  const {
    employee_id,
    action,
    match_distance,
    match_runner_up_distance,
    match_margin,
  } = body;

  if (!employee_id) {
    return NextResponse.json({ error: "employee_id is required" }, { status: 400 });
  }

  // Verify employee belongs to the same company as the caller
  const { data: employee } = await supabase
    .from("employees")
    .select("company_id")
    .eq("id", employee_id)
    .single();

  if (!employee || employee.company_id !== companyId) {
    return NextResponse.json({ error: "Employee not in this company" }, { status: 403 });
  }

  if (action === "clock_in") {
    const today = new Date().toISOString().split("T")[0];
    // Block re-clock-in only if there's already an open log for *today*.
    const { data: existingToday } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("date", today)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingToday) {
      return NextResponse.json(
        { error: "Already clocked in", log: existingToday },
        { status: 400 }
      );
    }

    // If yesterday (or earlier) has an open log because the user forgot to
    // clock out, auto-close it at +12h after clock-in (capped at 23:59 of
    // its own day). This preserves yesterday's DTR with a reasonable
    // approximation while letting the user clock in for today.
    const { data: staleOpen } = await supabase
      .from("time_logs")
      .select("id, clock_in, date")
      .eq("employee_id", employee_id)
      .lt("date", today)
      .is("clock_out", null)
      .order("clock_in", { ascending: false });

    if (staleOpen && staleOpen.length > 0) {
      for (const stale of staleOpen) {
        const clockInMs = new Date(stale.clock_in).getTime();
        // Cap auto-clock-out at 12 hours after the clock-in
        const twelveHoursLater = clockInMs + 12 * 60 * 60 * 1000;
        // ...or end-of-day (23:59:59) of its date — whichever comes first
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

        // Mark the DTR with a remark so admins can see this was auto-closed
        // and adjust to the real time if needed.
        void recomputeDTR(supabase, companyId, employee_id, stale.date);
        await supabase
          .from("daily_time_records")
          .update({
            remarks:
              "Auto-closed at +12h: employee did not clock out and has clocked in for the next day. Please verify the actual clock-out time.",
          })
          .eq("company_id", companyId)
          .eq("employee_id", employee_id)
          .eq("date", stale.date);
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_logs")
      .insert({
        employee_id,
        clock_in: now,
        date: today,
        company_id: companyId,
        match_distance: typeof match_distance === "number" ? match_distance : null,
        match_runner_up_distance:
          typeof match_runner_up_distance === "number" ? match_runner_up_distance : null,
        match_margin: typeof match_margin === "number" ? match_margin : null,
      })
      .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    // Reflect the new clock_in into DTR immediately. Best-effort.
    void recomputeDTR(supabase, companyId, employee_id, today);
    return NextResponse.json({ action: "clock_in", log: data });
  }

  if (action === "clock_out") {
    // Find the most recent open log for this employee — NOT scoped to
    // today. A graveyard-shift clock-in at 11:50pm yesterday must close
    // cleanly when the person clocks out at 7am today.
    //
    // Cap the lookback to the last 36 hours so a forgotten week-old
    // session doesn't get accidentally closed at hours_worked = 200h.
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { data: openLog } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", employee_id)
      .is("clock_out", null)
      .gte("clock_in", cutoff)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!openLog) {
      return NextResponse.json({ error: "Not clocked in" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const sessionMs = new Date(now).getTime() - new Date(openLog.clock_in).getTime();

    // Reject clock-outs that happen too fast after clock-in. This is almost
    // always an accidental double-tap on the kiosk (the result screen clears
    // after 2s and someone — often the next person walking up — taps Clock
    // Out while the previous person's face is still in frame). 60 seconds is
    // an aggressive floor; if a real shift legitimately needs to be < 1
    // minute long, an admin can adjust the DTR.
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
      })
      .eq("id", openLog.id)
      .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    // Recompute the DTR for the day this log started — this also handles
    // cross-midnight sessions because openLog.date is the start day.
    void recomputeDTR(supabase, companyId, employee_id, openLog.date);
    return NextResponse.json({ action: "clock_out", log: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
