/**
 * DTR (Daily Time Record) Computation Library
 *
 * Pure functions for computing daily time records per Philippine labor rules.
 * No database calls — all data is passed in as arguments.
 * All date/time handling uses Asia/Manila timezone (UTC+8).
 */

import type { TimeLog } from "@/lib/types/database";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type WorkSchedule = {
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  break_minutes: number;
  grace_period_minutes: number;
  work_days: number[]; // 0 = Sunday, 6 = Saturday
  is_flexible: boolean;
  is_night_diff: boolean;
};

export type Holiday = {
  date: string; // "YYYY-MM-DD"
  name: string;
  type: "regular" | "special_non_working" | "special_working";
};

export type ComputedDTR = {
  first_in: string | null;
  last_out: string | null;
  total_hours_worked: number;
  regular_hours: number;
  night_diff_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  is_rest_day: boolean;
  is_holiday: boolean;
  holiday_type: string | null;
};

type ComputeDTRParams = {
  timeLogs: TimeLog[];
  schedule: WorkSchedule | null;
  date: string; // "YYYY-MM-DD"
  holiday: Holiday | null;
};

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

const NIGHT_DIFF_START_HOUR = 22; // 10:00 PM
const NIGHT_DIFF_END_HOUR = 6; // 6:00 AM

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Convert a "HH:MM" time string + "YYYY-MM-DD" date string into a Date
 * object representing that moment in Asia/Manila time.
 */
export function parseTime(timeStr: string, dateStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);

  // Build the date as if it were UTC, then subtract the Manila offset
  // so that when interpreted as UTC it represents the correct Manila moment.
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return new Date(utcMs - MANILA_OFFSET_MS);
}

/**
 * Get the Manila-local day-of-week (0 = Sunday) for a "YYYY-MM-DD" string.
 */
function getManilaWeekday(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Use a date at noon Manila time to avoid any edge-case day boundary issues
  const utcMs = Date.UTC(year, month - 1, day, 12, 0, 0, 0) - MANILA_OFFSET_MS;
  return new Date(utcMs).getUTCDay();
}

/**
 * Extract the "YYYY-MM-DD" portion of a timestamp in Manila time.
 */
function toManilaDateStr(date: Date): string {
  const manilaMs = date.getTime() + MANILA_OFFSET_MS;
  const d = new Date(manilaMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Round a number to 2 decimal places.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Difference in minutes between two Dates. Returns positive if b > a.
 */
function diffMinutes(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60);
}

// ──────────────────────────────────────────────
// Core functions
// ──────────────────────────────────────────────

/**
 * Check if a date falls on a rest day according to the schedule.
 * Rest day = the weekday is NOT in schedule.work_days.
 */
export function isRestDay(dateStr: string, schedule: WorkSchedule): boolean {
  const weekday = getManilaWeekday(dateStr);
  return !schedule.work_days.includes(weekday);
}

/**
 * Calculate the number of hours within the 22:00–06:00 night differential
 * window for a given clock-in/clock-out range.
 *
 * Handles shifts that cross midnight correctly.
 */
export function computeNightDiffHours(clockIn: Date, clockOut: Date): number {
  if (clockOut <= clockIn) return 0;

  // Work in Manila-relative milliseconds so we can reason about wall-clock hours.
  const inMs = clockIn.getTime() + MANILA_OFFSET_MS;
  const outMs = clockOut.getTime() + MANILA_OFFSET_MS;

  // We need to check every night-diff window that could overlap with [inMs, outMs].
  // A night-diff window spans from 22:00 on day D to 06:00 on day D+1.
  // We iterate over each calendar day that the shift touches, checking both the
  // evening window starting that day and the morning window ending that day.

  const startDay = new Date(inMs);
  const endDay = new Date(outMs);

  // Get the date at the start (floored to midnight UTC which is midnight Manila)
  const startDayMs = Date.UTC(
    startDay.getUTCFullYear(),
    startDay.getUTCMonth(),
    startDay.getUTCDate()
  );
  const endDayMs = Date.UTC(
    endDay.getUTCFullYear(),
    endDay.getUTCMonth(),
    endDay.getUTCDate()
  );

  let totalNightMs = 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // Check from the day before startDay (in case shift starts after midnight
  // but before 06:00) to endDay.
  for (let dayMs = startDayMs - ONE_DAY; dayMs <= endDayMs; dayMs += ONE_DAY) {
    // Night window: 22:00 on this day to 06:00 next day (in Manila wall-clock)
    const windowStart = dayMs + NIGHT_DIFF_START_HOUR * 60 * 60 * 1000;
    const windowEnd = dayMs + ONE_DAY + NIGHT_DIFF_END_HOUR * 60 * 60 * 1000;

    // Overlap of [inMs, outMs] and [windowStart, windowEnd]
    const overlapStart = Math.max(inMs, windowStart);
    const overlapEnd = Math.min(outMs, windowEnd);

    if (overlapEnd > overlapStart) {
      totalNightMs += overlapEnd - overlapStart;
    }
  }

  return round2(totalNightMs / (1000 * 60 * 60));
}

/**
 * Get the DOLE pay rate multiplier based on day classification.
 * No overtime multipliers — this is base-rate only.
 */
export function getPayMultiplier(params: {
  isRestDay: boolean;
  isHoliday: boolean;
  holidayType?: string | null;
}): number {
  const { isRestDay: restDay, isHoliday, holidayType } = params;

  if (isHoliday) {
    if (holidayType === "regular") {
      return restDay ? 2.6 : 2.0;
    }
    if (holidayType === "special_non_working") {
      return restDay ? 1.5 : 1.3;
    }
    // special_working is treated as a regular working day
    if (holidayType === "special_working") {
      return restDay ? 1.3 : 1.0;
    }
  }

  return restDay ? 1.3 : 1.0;
}

/**
 * Main DTR computation function.
 *
 * Takes raw time logs, a work schedule, the target date, and an optional
 * holiday, then returns a fully computed DTR record.
 */
export function computeDTR(params: ComputeDTRParams): ComputedDTR {
  const { timeLogs, schedule, date, holiday } = params;

  const emptyResult: ComputedDTR = {
    first_in: null,
    last_out: null,
    total_hours_worked: 0,
    regular_hours: 0,
    night_diff_hours: 0,
    late_minutes: 0,
    undertime_minutes: 0,
    is_rest_day: schedule ? isRestDay(date, schedule) : false,
    is_holiday: holiday !== null,
    holiday_type: holiday?.type ?? null,
  };

  // ── 1. Filter logs for the given date ──────────────────────────────
  const dayLogs = timeLogs.filter((log) => {
    // The TimeLog type has a `date` field — prefer it when available.
    if (log.date) return log.date === date;
    // Fallback: derive the date from clock_in in Manila time.
    if (log.clock_in) return toManilaDateStr(new Date(log.clock_in)) === date;
    return false;
  });

  if (dayLogs.length === 0) return emptyResult;

  // ── 2. Find first clock-in and last clock-out ──────────────────────
  const clockIns = dayLogs
    .filter((l) => l.clock_in)
    .map((l) => new Date(l.clock_in));

  const clockOuts = dayLogs
    .filter((l) => l.clock_out)
    .map((l) => new Date(l.clock_out!));

  if (clockIns.length === 0) return emptyResult;

  const firstIn = new Date(Math.min(...clockIns.map((d) => d.getTime())));
  const lastOut =
    clockOuts.length > 0
      ? new Date(Math.max(...clockOuts.map((d) => d.getTime())))
      : null;

  if (!lastOut) {
    // Employee clocked in but never clocked out — can't compute hours.
    return {
      ...emptyResult,
      first_in: firstIn.toISOString(),
    };
  }

  // ── 3. Total hours worked ──────────────────────────────────────────
  const breakHours = schedule ? schedule.break_minutes / 60 : 0;
  const rawHours = diffMinutes(firstIn, lastOut) / 60 - breakHours;
  const totalHoursWorked = round2(Math.max(0, rawHours));

  // ── 4. Late & undertime ────────────────────────────────────────────
  let lateMinutes = 0;
  let undertimeMinutes = 0;

  if (schedule && !schedule.is_flexible) {
    const schedStart = parseTime(schedule.start_time, date);
    const schedEnd = parseTime(schedule.end_time, date);

    // Handle overnight schedules: if end_time <= start_time, the end is next day
    if (schedEnd <= schedStart) {
      schedEnd.setTime(schedEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // Late = how many minutes after (schedule_start + grace_period) did they arrive?
    const graceMs = schedule.grace_period_minutes * 60 * 1000;
    const lateCutoff = new Date(schedStart.getTime() + graceMs);
    lateMinutes = Math.max(0, Math.round(diffMinutes(lateCutoff, firstIn)));

    // Undertime = how many minutes before schedule_end did they leave?
    undertimeMinutes = Math.max(0, Math.round(diffMinutes(lastOut, schedEnd)));
  }

  // ── 5. Regular hours (capped at 8) ────────────────────────────────
  const regularHours = round2(Math.min(totalHoursWorked, 8));

  // ── 6. Night differential hours ────────────────────────────────────
  const nightDiffHours =
    schedule?.is_night_diff !== false
      ? computeNightDiffHours(firstIn, lastOut)
      : 0;

  return {
    first_in: firstIn.toISOString(),
    last_out: lastOut.toISOString(),
    total_hours_worked: totalHoursWorked,
    regular_hours: regularHours,
    night_diff_hours: nightDiffHours,
    late_minutes: lateMinutes,
    undertime_minutes: undertimeMinutes,
    is_rest_day: schedule ? isRestDay(date, schedule) : false,
    is_holiday: holiday !== null,
    holiday_type: holiday?.type ?? null,
  };
}
