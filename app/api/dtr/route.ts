import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { computeDTR } from "@/lib/dtr-computation";
import type { WorkSchedule as ComputeWorkSchedule, Holiday as ComputeHoliday } from "@/lib/dtr-computation";

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

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
  } catch {}
  return { userId: null, companyId: null };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate an array of "YYYY-MM-DD" strings from `from` to `to` inclusive. */
function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// GET  /api/dtr — Query DTR records
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { companyId } = await getContext();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const employeeId = searchParams.get("employee_id");
  const departmentId = searchParams.get("department_id");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseService();

  let query = supabase
    .from("daily_time_records")
    .select(
      "*, employee:employees(id, first_name, last_name, name, department_id)",
    )
    .eq("company_id", companyId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (departmentId) {
    // Filter via the joined employee's department_id
    query = query.eq("employee.department_id", departmentId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// POST /api/dtr — Batch compute DTR records
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!companyId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { from, to, employee_id } = body as {
    from: string;
    to: string;
    employee_id?: string;
  };

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseService();
  const dates = dateRange(from, to);

  // 1. Resolve employees ──────────────────────────────────────────────────
  let employeeIds: string[];
  if (employee_id) {
    employeeIds = [employee_id];
  } else {
    const { data: employees, error } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", companyId)
      .eq("active", true);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    employeeIds = (employees ?? []).map((e) => e.id);
  }

  // 2. Pre-fetch holidays for the date range ──────────────────────────────
  const { data: holidays } = await supabase
    .from("holidays")
    .select("*")
    .eq("company_id", companyId)
    .gte("date", from)
    .lte("date", to);

  const holidayMap = new Map<string, ComputeHoliday>();
  for (const h of holidays ?? []) {
    holidayMap.set(h.date, { date: h.date, name: h.name, type: h.type });
  }

  // 3. Process each employee x date ───────────────────────────────────────
  let computedCount = 0;

  for (const empId of employeeIds) {
    // Fetch all active schedule assignments that overlap the date range
    const { data: scheduleAssignments } = await supabase
      .from("employee_schedules")
      .select("*, schedule:work_schedules(*)")
      .eq("employee_id", empId)
      .eq("company_id", companyId)
      .lte("effective_from", to)
      .or(`effective_to.is.null,effective_to.gte.${from}`);

    // Fetch all time logs in the date range for this employee
    const { data: allTimeLogs } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", empId)
      .gte("date", from)
      .lte("date", to);

    for (const date of dates) {
      // Find the active schedule for this date
      const assignment = (scheduleAssignments ?? []).find((a) => {
        if (a.effective_from > date) return false;
        if (a.effective_to && a.effective_to < date) return false;
        return true;
      });

      const schedule = assignment?.schedule as ComputeWorkSchedule | null ?? null;

      // Filter time logs for this date
      const timeLogs = (allTimeLogs ?? []).filter((l) => l.date === date);

      // Get holiday for this date
      const holiday = holidayMap.get(date) ?? null;

      // Compute DTR
      const computed = computeDTR({
        timeLogs,
        schedule,
        date,
        holiday,
      });

      // Upsert — only overwrite if existing status is 'computed'
      // First check if a non-computed record exists
      const { data: existing } = await supabase
        .from("daily_time_records")
        .select("id, status")
        .eq("company_id", companyId)
        .eq("employee_id", empId)
        .eq("date", date)
        .single();

      if (existing && existing.status !== "computed") {
        // Don't overwrite adjusted or approved records
        continue;
      }

      const record = {
        company_id: companyId,
        employee_id: empId,
        date,
        schedule_id: assignment?.schedule_id ?? null,
        first_in: computed.first_in,
        last_out: computed.last_out,
        total_hours_worked: computed.total_hours_worked,
        regular_hours: computed.regular_hours,
        night_diff_hours: computed.night_diff_hours,
        late_minutes: computed.late_minutes,
        undertime_minutes: computed.undertime_minutes,
        is_rest_day: computed.is_rest_day,
        is_holiday: computed.is_holiday,
        holiday_type: computed.holiday_type,
        status: "computed" as const,
        computed_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("daily_time_records")
        .upsert(record, {
          onConflict: "company_id,employee_id,date",
        });

      if (!upsertError) {
        computedCount++;
      }
    }
  }

  return NextResponse.json({ computed: computedCount });
}
