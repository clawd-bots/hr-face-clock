"use client";

import { useState, useEffect, useCallback } from "react";

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: "regular" | "special_non_working" | "special_working";
}

const TYPE_OPTIONS = [
  { value: "regular", label: "Regular Holiday" },
  { value: "special_non_working", label: "Special Non-Working Holiday" },
  { value: "special_working", label: "Special Working Holiday" },
] as const;

const TYPE_BADGE: Record<Holiday["type"], { label: string; className: string }> = {
  regular: {
    label: "Regular",
    className: "bg-[rgba(138,58,52,0.1)] text-sw-danger-500",
  },
  special_non_working: {
    label: "Special Non-Working",
    className: "bg-[rgba(207,147,88,0.15)] text-sw-gold-600",
  },
  special_working: {
    label: "Special Working",
    className: "bg-[rgba(59,130,186,0.1)] text-sw-lilac-500",
  },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const inputClass =
  "w-full h-10 px-3 bg-sw-cream-50 border border-sw-ink-200 rounded-xl text-sm text-sw-ink-900 placeholder:text-sw-ink-500 focus:outline-none focus:ring-2 focus:ring-[rgba(201, 151, 46, 0.22)] focus:border-sw-gold-500 transition-colors duration-150";

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Holiday["type"]>("regular");

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: Holiday, b: Holiday) => a.date.localeCompare(b.date)
        );
        setHolidays(sorted);
      }
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Auto-clear messages after 4 seconds
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSeed = async () => {
    if (!confirm(`Seed standard PH holidays for ${year}? This will insert DOLE holidays.`)) return;
    setSeeding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/holidays/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to seed holidays");
      }
      setMessage({ text: `Successfully seeded ${year} holidays`, type: "success" });
      fetchHolidays();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to seed holidays", type: "error" });
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!formDate || !formName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: formDate, name: formName.trim(), type: formType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create holiday");
      }
      setFormDate("");
      setFormName("");
      setFormType("regular");
      setShowForm(false);
      setMessage({ text: "Holiday added", type: "success" });
      fetchHolidays();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/holidays?holidayId=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      setMessage({ text: "Holiday deleted", type: "success" });
      fetchHolidays();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to delete", type: "error" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="t-display">
            Holidays
          </h1>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 px-3 bg-sw-cream-50 border border-sw-ink-200 rounded-xl text-sm text-sw-ink-900 focus:outline-none focus:ring-2 focus:ring-[rgba(201, 151, 46, 0.22)] focus:border-sw-gold-500 transition-colors duration-150"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="h-10 px-5 rounded-full text-sm font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-[rgba(28, 26, 22, 0.03)] disabled:opacity-50 transition-colors duration-150"
          >
            {seeding ? "Seeding..." : `Seed ${year} Holidays`}
          </button>
          <button
            onClick={() => {
              setFormDate("");
              setFormName("");
              setFormType("regular");
              setShowForm(true);
            }}
            className="h-10 px-5 rounded-full text-sm font-medium text-[#ffffff]"
            style={{ background: "var(--color-sw-gold-500)" }}
          >
            + Add Holiday
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium ${
            message.type === "success"
              ? "bg-[rgba(52,138,82,0.08)] border border-[rgba(52,138,82,0.2)] text-sw-success-500"
              : "bg-[var(--color-sw-ink-100)] border border-[rgba(244, 63, 94, 0.2)] text-sw-danger-500"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Holiday Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl bg-white border border-sw-ink-200 shadow-[0_2px_12px_rgba(28, 26, 22, 0.06)]">
          <h3 className="text-sm font-medium text-sw-ink-900 mb-3">New Holiday</h3>
          <div className="flex gap-3">
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className={`w-44 ${inputClass}`}
            />
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Holiday name"
              className={`flex-1 ${inputClass}`}
            />
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as Holiday["type"])}
              className={`w-56 ${inputClass}`}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving || !formDate || !formName.trim()}
              className="h-10 px-5 rounded-xl text-sm font-medium text-[#ffffff] disabled:opacity-50"
              style={{ background: "var(--color-sw-gold-500)" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="h-10 px-4 rounded-xl text-sm font-medium text-sw-ink-500 border border-sw-ink-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Holiday List */}
      <div className="sw-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-sw-cream-25 border-b border-sw-ink-100">
              <th className="text-left px-6 py-4 text-sw-micro font-medium text-sw-ink-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-6 py-4 text-sw-micro font-medium text-sw-ink-500 uppercase tracking-wider">
                Holiday
              </th>
              <th className="text-left px-6 py-4 text-sw-micro font-medium text-sw-ink-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-right px-6 py-4 text-sw-micro font-medium text-sw-ink-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sw-ink-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-sw-ink-500">
                  Loading...
                </td>
              </tr>
            ) : holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-sw-ink-500">
                  No holidays for {year}. Use &quot;Seed {year} Holidays&quot; to add standard PH holidays.
                </td>
              </tr>
            ) : (
              holidays.map((h) => {
                const badge = TYPE_BADGE[h.type] || TYPE_BADGE.regular;
                return (
                  <tr key={h.id} className="hover:bg-sw-cream-25 transition-colors duration-100">
                    <td className="px-6 py-4 text-sm text-sw-ink-700 whitespace-nowrap">
                      {formatDate(h.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-sw-ink-900">
                      {h.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(h.id, h.name)}
                        className="text-xs font-medium text-sw-danger-500 hover:text-[rgba(138,58,52,0.7)]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
