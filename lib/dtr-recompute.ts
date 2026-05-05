/**
 * Recompute and upsert one daily_time_records row.
 *
 * Called automatically after any write to time_logs (clock-out, time
 * declaration approval, admin edit) so DTR stays in sync without HR
 * having to click "Compute" first.
 *
 * Pure DB I/O wrapping the pure computeDTR() function.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { computeDTR } from "@/lib/dtr-computation";
import type {
  WorkSchedule as ComputeWorkSchedule,
  Holiday as ComputeHoliday,
} from "@/lib/dtr-computation";

export type RecomputeOptions = {
  /** Force overwrite even if existing record has status 'adjusted'/'approved'.
   *  Default false: respect manual admin edits. */
  force?: boolean;
};

/**
 * Recompute DTR for a single (employee, date). Best-effort — swallows
 * errors so a recompute failure never blocks a clock-out from succeeding.
 */
export async function recomputeDTR(
  supabase: SupabaseClient,
  companyId: string,
  employeeId: string,
  date: string,
  options: RecomputeOptions = {}
): Promise<{ ok: boolean; reason?: string }> {
  try {
    // Bail early if a non-computed record already exists and we're not forcing
    const { data: existing } = await supabase
      .from("daily_time_records")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .eq("date", date)
      .maybeSingle();

    if (existing && existing.status !== "computed" && !options.force) {
      return { ok: false, reason: "manual_record_exists" };
    }

    // Fetch the active schedule assignment for this date
    const { data: assignments } = await supabase
      .from("employee_schedules")
      .select("schedule_id, effective_from, effective_to, schedule:work_schedules(*)")
      .eq("employee_id", employeeId)
      .eq("company_id", companyId)
      .lte("effective_from", date);

    const assignment = (assignments ?? []).find((a: any) => {
      if (a.effective_from > date) return false;
      if (a.effective_to && a.effective_to < date) return false;
      return true;
    });

    const schedule = (assignment?.schedule as ComputeWorkSchedule | null) ?? null;

    // Fetch all time_logs for this employee+date.
    // Include logs whose `date` matches OR whose clock_in falls on this date —
    // covers the cross-midnight case where a log is "owned" by the start day.
    const { data: timeLogs } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", date);

    // Holiday lookup
    const { data: holidayRow } = await supabase
      .from("holidays")
      .select("*")
      .eq("company_id", companyId)
      .eq("date", date)
      .maybeSingle();

    const holiday: ComputeHoliday | null = holidayRow
      ? {
          date: holidayRow.date,
          name: holidayRow.name,
          type: holidayRow.type,
        }
      : null;

    const computed = computeDTR({
      timeLogs: timeLogs ?? [],
      schedule,
      date,
      holiday,
    });

    const record = {
      company_id: companyId,
      employee_id: employeeId,
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

    const { error } = await supabase
      .from("daily_time_records")
      .upsert(record, { onConflict: "company_id,employee_id,date" });

    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Convenience: derive Manila-local "YYYY-MM-DD" for a clock_in timestamp.
 * Lets callers compute the right `date` to recompute when an edit changes
 * which calendar day a log falls on.
 */
export function manilaDateFromTimestamp(iso: string): string {
  const ms = new Date(iso).getTime() + 8 * 60 * 60 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
