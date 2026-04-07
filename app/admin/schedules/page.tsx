"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- types ---------- */

interface Schedule {
  id: string;
  name: string;
  start_time: string; // "HH:mm:ss"
  end_time: string;
  break_minutes: number;
  grace_period_minutes: number;
  work_days: number[]; // 1=Mon … 7=Sun
  is_flexible: boolean;
  is_night_diff: boolean;
  active: boolean;
}

interface Employee {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
}

interface Assignment {
  id: string;
  employee_id: string;
  schedule_id: string;
  effective_from: string;
  effective_to: string | null;
  work_schedules?: Schedule;
}

/* ---------- helpers ---------- */

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function formatTime12(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr.padStart(2, "0")} ${ampm}`;
}

function toTimeInput(t: string): string {
  // "HH:mm:ss" → "HH:mm"
  return t.slice(0, 5);
}

const inputClass =
  "w-full h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150";

/* ---------- component ---------- */

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnd, setFormEnd] = useState("17:00");
  const [formBreak, setFormBreak] = useState(60);
  const [formGrace, setFormGrace] = useState(15);
  const [formDays, setFormDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formFlexible, setFormFlexible] = useState(false);
  const [formNight, setFormNight] = useState(false);
  const [saving, setSaving] = useState(false);

  // assign state
  const [assignEmployee, setAssignEmployee] = useState("");
  const [assignSchedule, setAssignSchedule] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [recentAssignments, setRecentAssignments] = useState<
    (Assignment & { employeeName?: string })[]
  >([]);

  /* ---------- data fetching ---------- */

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules");
      if (res.ok) setSchedules(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        // API may return { data: [...] } or [...]
        setEmployees(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSchedules(), fetchEmployees()]).finally(() =>
      setLoading(false),
    );
  }, [fetchSchedules, fetchEmployees]);

  /* ---------- form handlers ---------- */

  const resetForm = () => {
    setFormName("");
    setFormStart("08:00");
    setFormEnd("17:00");
    setFormBreak(60);
    setFormGrace(15);
    setFormDays([1, 2, 3, 4, 5]);
    setFormFlexible(false);
    setFormNight(false);
    setEditId(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    setEditId(s.id);
    setFormName(s.name);
    setFormStart(toTimeInput(s.start_time));
    setFormEnd(toTimeInput(s.end_time));
    setFormBreak(s.break_minutes);
    setFormGrace(s.grace_period_minutes);
    setFormDays([...s.work_days]);
    setFormFlexible(s.is_flexible);
    setFormNight(s.is_night_diff);
    setShowForm(true);
    setError("");
  };

  const toggleDay = (d: number) => {
    setFormDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formStart || !formEnd) return;
    setSaving(true);
    setError("");

    const payload = {
      name: formName.trim(),
      start_time: formStart + ":00",
      end_time: formEnd + ":00",
      break_minutes: formBreak,
      grace_period_minutes: formGrace,
      work_days: formDays,
      is_flexible: formFlexible,
      is_night_diff: formNight,
    };

    try {
      const url = editId ? `/api/schedules/${editId}` : "/api/schedules";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");

      setShowForm(false);
      resetForm();
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this schedule?")) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    }
  };

  /* ---------- assign handler ---------- */

  const handleAssign = async () => {
    if (!assignEmployee || !assignSchedule || !assignDate) return;
    setAssigning(true);
    setError("");

    try {
      const res = await fetch(`/api/employees/${assignEmployee}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: assignSchedule,
          effective_from: assignDate,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Assign failed");
      const data: Assignment = await res.json();
      const emp = employees.find((e) => e.id === assignEmployee);
      setRecentAssignments((prev) => [
        {
          ...data,
          employeeName: emp
            ? (emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.name)
            : assignEmployee,
        },
        ...prev,
      ]);
      setAssignEmployee("");
      setAssignSchedule("");
      setAssignDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setAssigning(false);
    }
  };

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[rgba(0,0,0,0.4)]">
        Loading schedules...
      </div>
    );
  }

  return (
    <div>
      {/* ---- header ---- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-medium tracking-[-1.75px] text-[rgba(0,0,0,0.88)]">
          Schedules
        </h1>
        <button
          onClick={openCreate}
          className="h-10 px-5 rounded-full text-sm font-medium text-[#61474c]"
          style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
        >
          + New Schedule
        </button>
      </div>

      {/* ---- error ---- */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
          {error}
        </div>
      )}

      {/* ---- modal overlay for create / edit ---- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg mx-4 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-6">
            <h2 className="text-lg font-medium text-[rgba(0,0,0,0.88)] mb-5">
              {editId ? "Edit Schedule" : "New Schedule"}
            </h2>

            {/* name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Regular Day Shift"
                className={inputClass}
              />
            </div>

            {/* times row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* break + grace */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                  Break Duration (min)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formBreak}
                  onChange={(e) => setFormBreak(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                  Grace Period (min)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formGrace}
                  onChange={(e) => setFormGrace(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>

            {/* work days */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-2">
                Work Days
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`h-9 w-11 rounded-lg text-xs font-medium transition-colors duration-150 ${
                      formDays.includes(d)
                        ? "bg-[#ffc671] text-[#61474c]"
                        : "bg-[#fafaf2] text-[rgba(0,0,0,0.4)] border border-[rgba(0,0,0,0.1)]"
                    }`}
                  >
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* toggles */}
            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formFlexible}
                  onClick={() => setFormFlexible(!formFlexible)}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-150 ${
                    formFlexible ? "bg-[#ffc671]" : "bg-[rgba(0,0,0,0.1)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
                      formFlexible ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="text-sm text-[rgba(0,0,0,0.65)]">
                  Flexible
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formNight}
                  onClick={() => setFormNight(!formNight)}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-150 ${
                    formNight ? "bg-[#ffc671]" : "bg-[rgba(0,0,0,0.1)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
                      formNight ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="text-sm text-[rgba(0,0,0,0.65)]">
                  Night Diff
                </span>
              </label>
            </div>

            {/* actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="h-10 px-5 rounded-xl text-sm font-medium text-[rgba(0,0,0,0.5)] border border-[rgba(0,0,0,0.1)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="h-10 px-6 rounded-xl text-sm font-medium text-[#61474c] disabled:opacity-50"
                style={{
                  background: "linear-gradient(to right, #ffc671, #cf9358)",
                }}
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- schedule cards grid ---- */}
      {schedules.length === 0 ? (
        <div className="text-center py-16 text-sm text-[rgba(0,0,0,0.4)]">
          No schedules yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4"
            >
              {/* name */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-[rgba(0,0,0,0.88)] leading-tight">
                  {s.name}
                </h3>
                <div className="flex gap-1 shrink-0 ml-2">
                  {s.is_flexible && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]">
                      Flexible
                    </span>
                  )}
                  {s.is_night_diff && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(88,80,150,0.1)] text-[#585096]">
                      Night Diff
                    </span>
                  )}
                </div>
              </div>

              {/* time + break + grace */}
              <div className="text-sm text-[rgba(0,0,0,0.65)] mb-1">
                {formatTime12(s.start_time)} &ndash; {formatTime12(s.end_time)}
              </div>
              <div className="text-xs text-[rgba(0,0,0,0.4)] mb-3">
                {s.break_minutes} min break &middot; {s.grace_period_minutes}{" "}
                min grace
              </div>

              {/* work days */}
              <div className="flex gap-1.5 mb-4">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <span
                    key={d}
                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      s.work_days.includes(d)
                        ? "bg-[rgba(255,198,113,0.25)] text-[#9a6d2a]"
                        : "text-[rgba(0,0,0,0.2)]"
                    }`}
                  >
                    {DAY_LABELS[d]}
                  </span>
                ))}
              </div>

              {/* actions */}
              <div className="flex gap-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
                <button
                  onClick={() => openEdit(s)}
                  className="text-xs font-medium text-[#9a6d2a] hover:text-[#cf9358]"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeactivate(s.id)}
                  className="text-xs font-medium text-[#8a3a34] hover:text-[rgba(138,58,52,0.7)]"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- assign schedule section ---- */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-[rgba(0,0,0,0.88)] mb-4">
          Assign Schedule
        </h2>

        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            {/* employee */}
            <div>
              <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                Employee
              </label>
              <select
                value={assignEmployee}
                onChange={(e) => setAssignEmployee(e.target.value)}
                className={inputClass}
              >
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name && e.last_name ? `${e.first_name} ${e.last_name}` : e.name}
                  </option>
                ))}
              </select>
            </div>

            {/* schedule */}
            <div>
              <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                Schedule
              </label>
              <select
                value={assignSchedule}
                onChange={(e) => setAssignSchedule(e.target.value)}
                className={inputClass}
              >
                <option value="">Select schedule</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* effective from */}
            <div>
              <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
                Effective From
              </label>
              <input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* assign button */}
            <div>
              <button
                onClick={handleAssign}
                disabled={
                  assigning || !assignEmployee || !assignSchedule || !assignDate
                }
                className="w-full h-10 rounded-xl text-sm font-medium text-[#61474c] disabled:opacity-50"
                style={{
                  background: "linear-gradient(to right, #ffc671, #cf9358)",
                }}
              >
                {assigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>

          {/* recent assignments */}
          {recentAssignments.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.06)]">
              <h4 className="text-xs font-medium text-[rgba(0,0,0,0.5)] mb-3 uppercase tracking-wider">
                Recent Assignments
              </h4>
              <div className="space-y-2">
                {recentAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-3 py-2 bg-[#fafaf2] rounded-xl text-sm"
                  >
                    <span className="text-[rgba(0,0,0,0.88)] font-medium">
                      {a.employeeName}
                    </span>
                    <span className="text-[rgba(0,0,0,0.65)]">
                      {a.work_schedules?.name ?? "Schedule"} &mdash; from{" "}
                      {a.effective_from}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
