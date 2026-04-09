"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- types ---------- */

interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  days_per_year: number;
  is_paid: boolean;
  is_convertible: boolean;
  requires_attachment: boolean;
  allow_half_day: boolean;
  gender_specific: string | null; // null | "male" | "female"
  min_service_months: number;
  carry_over_max_days: number;
  prorate_on_hire: boolean;
  active: boolean;
}

/* ---------- helpers ---------- */

const inputClass =
  "w-full h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150";

const labelClass = "block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1";

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-150 ${
        value ? "bg-[#ffc671]" : "bg-[rgba(0,0,0,0.1)]"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
          value ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

/* ---------- component ---------- */

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // form fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDaysPerYear, setFormDaysPerYear] = useState(5);
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formIsConvertible, setFormIsConvertible] = useState(false);
  const [formRequiresAttachment, setFormRequiresAttachment] = useState(false);
  const [formAllowHalfDay, setFormAllowHalfDay] = useState(true);
  const [formGenderSpecific, setFormGenderSpecific] = useState<string>("both");
  const [formMinServiceMonths, setFormMinServiceMonths] = useState(0);
  const [formCarryOverMaxDays, setFormCarryOverMaxDays] = useState(0);
  const [formProrateOnHire, setFormProrateOnHire] = useState(true);

  /* ---------- fetch ---------- */

  const fetchLeaveTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leave-types?all=true");
      if (!res.ok) throw new Error("Failed to fetch leave types");
      const data = await res.json();
      setLeaveTypes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  /* ---------- seed ---------- */

  async function handleSeed() {
    if (!confirm("This will insert standard Philippine leave types. Continue?"))
      return;
    try {
      setSeeding(true);
      const res = await fetch("/api/leave-types/seed", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Seed failed");
      }
      await fetchLeaveTypes();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  /* ---------- form helpers ---------- */

  function resetForm() {
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormDaysPerYear(5);
    setFormIsPaid(true);
    setFormIsConvertible(false);
    setFormRequiresAttachment(false);
    setFormAllowHalfDay(true);
    setFormGenderSpecific("both");
    setFormMinServiceMonths(0);
    setFormCarryOverMaxDays(0);
    setFormProrateOnHire(true);
  }

  function openCreate() {
    resetForm();
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(lt: LeaveType) {
    setEditId(lt.id);
    setFormName(lt.name);
    setFormCode(lt.code);
    setFormDescription(lt.description ?? "");
    setFormDaysPerYear(lt.days_per_year);
    setFormIsPaid(lt.is_paid);
    setFormIsConvertible(lt.is_convertible);
    setFormRequiresAttachment(lt.requires_attachment);
    setFormAllowHalfDay(lt.allow_half_day);
    setFormGenderSpecific(lt.gender_specific ?? "both");
    setFormMinServiceMonths(lt.min_service_months);
    setFormCarryOverMaxDays(lt.carry_over_max_days);
    setFormProrateOnHire(lt.prorate_on_hire);
    setShowModal(true);
  }

  /* ---------- save ---------- */

  async function handleSave() {
    if (!formName.trim() || !formCode.trim()) {
      alert("Name and Code are required.");
      return;
    }

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim() || null,
      days_per_year: formDaysPerYear,
      is_paid: formIsPaid,
      is_convertible: formIsConvertible,
      requires_attachment: formRequiresAttachment,
      allow_half_day: formAllowHalfDay,
      gender_specific: formGenderSpecific === "both" ? null : formGenderSpecific,
      min_service_months: formMinServiceMonths,
      carry_over_max_days: formCarryOverMaxDays,
      prorate_on_hire: formProrateOnHire,
    };

    try {
      setSaving(true);
      const url = editId
        ? `/api/leave-types/${editId}`
        : "/api/leave-types";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Save failed");
      }

      setShowModal(false);
      await fetchLeaveTypes();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- deactivate ---------- */

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try {
      const res = await fetch(`/api/leave-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Deactivate failed");
      }
      await fetchLeaveTypes();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Deactivate failed");
    }
  }

  /* ---------- render ---------- */

  return (
    <div className="bg-mesh-leave-types min-h-screen bg-[#fafaf2]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[rgba(0,0,0,0.88)]">
            Leave Types
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="h-10 px-4 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm font-medium text-[rgba(0,0,0,0.65)] hover:bg-[rgba(0,0,0,0.03)] transition-colors duration-150 disabled:opacity-50"
            >
              {seeding ? "Seeding..." : "Seed PH Defaults"}
            </button>
            <button
              onClick={openCreate}
              className="h-10 px-5 rounded-xl text-sm font-semibold text-[#61474c] shadow-sm hover:opacity-90 transition-opacity duration-150"
              style={{
                background: "linear-gradient(to right, #ffc671, #cf9358)",
              }}
            >
              + Add Leave Type
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <p className="text-sm text-[rgba(0,0,0,0.4)]">Loading...</p>
        ) : leaveTypes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[rgba(0,0,0,0.4)] mb-2">
              No leave types configured yet.
            </p>
            <p className="text-xs text-[rgba(0,0,0,0.3)]">
              Click &quot;Seed PH Defaults&quot; to get started with standard
              Philippine leave types, or add your own.
            </p>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveTypes.map((lt) => (
              <div
                key={lt.id}
                className={`bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 ${
                  !lt.active ? "opacity-50" : ""
                }`}
              >
                {/* Top row: name + code */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[rgba(0,0,0,0.88)]">
                      {lt.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[rgba(255,198,113,0.2)] text-xs font-medium text-[#cf9358]">
                      {lt.code}
                    </span>
                    {!lt.active && (
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-xs font-medium text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[rgba(0,0,0,0.65)]">
                    {lt.days_per_year} days/year
                  </span>
                </div>

                {/* Description */}
                {lt.description && (
                  <p className="text-xs text-[rgba(0,0,0,0.4)] mb-2 line-clamp-2">
                    {lt.description}
                  </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {lt.is_paid && (
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-xs text-green-600">
                      Paid
                    </span>
                  )}
                  {!lt.is_paid && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 text-xs text-gray-500">
                      Unpaid
                    </span>
                  )}
                  {lt.is_convertible && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-xs text-blue-600">
                      Convertible
                    </span>
                  )}
                  {lt.allow_half_day && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-xs text-purple-600">
                      Half Day OK
                    </span>
                  )}
                  {lt.requires_attachment && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 text-xs text-orange-600">
                      Requires Attachment
                    </span>
                  )}
                  {lt.prorate_on_hire && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-xs text-teal-600">
                      Pro-rated
                    </span>
                  )}
                  {lt.gender_specific === "female" && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-50 text-xs text-pink-600">
                      Female only
                    </span>
                  )}
                  {lt.gender_specific === "male" && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-50 text-xs text-sky-600">
                      Male only
                    </span>
                  )}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-3 text-xs text-[rgba(0,0,0,0.4)] mb-3">
                  {lt.min_service_months > 0 && (
                    <span>After {lt.min_service_months} months</span>
                  )}
                  {lt.carry_over_max_days > 0 && (
                    <span>
                      Up to {lt.carry_over_max_days} days carry over
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[rgba(0,0,0,0.05)]">
                  <button
                    onClick={() => openEdit(lt)}
                    className="text-xs font-medium text-[#cf9358] hover:text-[#b07a40] transition-colors duration-150"
                  >
                    Edit
                  </button>
                  {lt.active && (
                    <button
                      onClick={() => handleDeactivate(lt.id, lt.name)}
                      className="text-xs font-medium text-red-400 hover:text-red-500 transition-colors duration-150"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Modal ---------- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowModal(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-[rgba(0,0,0,0.88)] mb-5">
                {editId ? "Edit Leave Type" : "Add Leave Type"}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vacation Leave"
                    className={inputClass}
                  />
                </div>

                {/* Code */}
                <div>
                  <label className={labelClass}>Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. VL"
                    className={inputClass}
                    maxLength={10}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={labelClass}>Description (optional)</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={2}
                    className={`${inputClass} h-auto py-2 resize-none`}
                  />
                </div>

                {/* Days Per Year */}
                <div>
                  <label className={labelClass}>Days Per Year</label>
                  <input
                    type="number"
                    min={0}
                    value={formDaysPerYear}
                    onChange={(e) =>
                      setFormDaysPerYear(Number(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[rgba(0,0,0,0.65)]">
                      Is Paid
                    </label>
                    <Toggle value={formIsPaid} onChange={setFormIsPaid} />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[rgba(0,0,0,0.65)]">
                      Is Convertible
                    </label>
                    <Toggle
                      value={formIsConvertible}
                      onChange={setFormIsConvertible}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[rgba(0,0,0,0.65)]">
                      Requires Attachment
                    </label>
                    <Toggle
                      value={formRequiresAttachment}
                      onChange={setFormRequiresAttachment}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[rgba(0,0,0,0.65)]">
                      Allow Half Day
                    </label>
                    <Toggle
                      value={formAllowHalfDay}
                      onChange={setFormAllowHalfDay}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[rgba(0,0,0,0.65)]">
                      Pro-rate on Hire
                    </label>
                    <Toggle
                      value={formProrateOnHire}
                      onChange={setFormProrateOnHire}
                    />
                  </div>
                </div>

                {/* Gender Specific */}
                <div>
                  <label className={labelClass}>Gender Specific</label>
                  <select
                    value={formGenderSpecific}
                    onChange={(e) => setFormGenderSpecific(e.target.value)}
                    className={inputClass}
                  >
                    <option value="both">Both</option>
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                </div>

                {/* Min Service Months */}
                <div>
                  <label className={labelClass}>Min Service Months</label>
                  <input
                    type="number"
                    min={0}
                    value={formMinServiceMonths}
                    onChange={(e) =>
                      setFormMinServiceMonths(Number(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>

                {/* Carry Over Max Days */}
                <div>
                  <label className={labelClass}>
                    Carry Over Max Days{" "}
                    <span className="text-[rgba(0,0,0,0.3)]">
                      (0 = no carry over)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formCarryOverMaxDays}
                    onChange={(e) =>
                      setFormCarryOverMaxDays(Number(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                <button
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-sm font-medium text-[rgba(0,0,0,0.65)] hover:bg-[rgba(0,0,0,0.03)] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 px-5 rounded-xl text-sm font-semibold text-[#61474c] shadow-sm hover:opacity-90 transition-opacity duration-150 disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(to right, #ffc671, #cf9358)",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
