"use client";

import { useEffect, useState, useCallback } from "react";

type EmployeeRef = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
} | null;

type ShadowRow = {
  id: string;
  created_at: string;
  time_log_id: string | null;
  v1_employee_id: string | null;
  v1_distance: number | null;
  v1_runner_up_distance: number | null;
  v1_margin: number | null;
  v1_reason: string | null;
  v2_employee_id: string | null;
  v2_score: number | null;
  v2_runner_up_score: number | null;
  v2_margin: number | null;
  v2_reason: string | null;
  agreed: boolean;
  v1_employee?: EmployeeRef;
  v2_employee?: EmployeeRef;
};

type Stats = {
  total: number;
  agreed: number;
  disagreed: number;
  v2_no_match: number;
  agreement_rate: number;
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function empName(e?: EmployeeRef): string {
  if (!e) return "—";
  return e.first_name ? `${e.first_name} ${e.last_name ?? ""}`.trim() : e.name;
}

function fmtNum(v: number | null, digits = 4): string {
  if (v === null) return "—";
  return v.toFixed(digits);
}

export default function FaceMatchAuditPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<ShadowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "agreed" | "disagreed">(
    "disagreed"
  );

  // Default to last 7 days
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, filter });
      const res = await fetch(`/api/face-match-shadow/audit?${params}`);
      if (!res.ok) {
        setRows([]);
        setStats(null);
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [from, to, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="t-display">Face Match Audit</h1>
        <p className="text-sm text-sw-ink-500 mt-1 max-w-2xl">
          Comparison of the live (v1) face matcher and the experimental
          cluster-aware (v2) matcher. v2 runs in shadow mode — it doesn&apos;t
          affect clock events. Use this view to validate v2&apos;s accuracy
          before flipping it on as primary.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs text-sw-ink-500 uppercase tracking-wide">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 px-3 bg-sw-cream-50 border border-sw-ink-200 rounded-xl text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-sw-ink-500 uppercase tracking-wide">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 px-3 bg-sw-cream-50 border border-sw-ink-200 rounded-xl text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-10 px-3 bg-sw-cream-50 border border-sw-ink-200 rounded-xl text-sm"
        >
          <option value="disagreed">Disagreements only</option>
          <option value="agreed">Agreements only</option>
          <option value="all">All matches</option>
        </select>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="sw-panel p-5">
            <p className="text-xs text-sw-ink-500 uppercase tracking-wide mb-1">
              Total matches
            </p>
            <p className="text-2xl font-semibold text-sw-ink-900">{stats.total}</p>
          </div>
          <div className="sw-panel p-5">
            <p className="text-xs text-sw-ink-500 uppercase tracking-wide mb-1">
              Agreement rate
            </p>
            <p
              className="text-2xl font-semibold"
              style={{
                color:
                  stats.agreement_rate >= 0.95
                    ? "var(--color-sw-success-500)"
                    : stats.agreement_rate >= 0.8
                    ? "var(--color-sw-gold-600)"
                    : "var(--color-sw-danger-500)",
              }}
            >
              {(stats.agreement_rate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="sw-panel p-5">
            <p className="text-xs text-sw-ink-500 uppercase tracking-wide mb-1">
              Disagreements
            </p>
            <p className="text-2xl font-semibold text-sw-ink-900">
              {stats.disagreed}
            </p>
          </div>
          <div className="sw-panel p-5">
            <p className="text-xs text-sw-ink-500 uppercase tracking-wide mb-1">
              v2 returned no match
            </p>
            <p className="text-2xl font-semibold text-sw-ink-900">
              {stats.v2_no_match}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sw-gold-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="sw-panel p-12 text-center text-sm text-sw-ink-500">
          No shadow log entries for this period. Make sure migration
          081_face_match_shadow_log.sql has been run and the kiosk has been
          used since the deploy.
        </div>
      ) : (
        <div className="sw-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    When
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    v1 picked
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    v1 dist
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    v1 margin
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    v2 picked
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    v2 score
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    v2 margin
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-sw-ink-500">
                    Agreed
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-sw-ink-100 ${
                      !r.agreed ? "bg-[rgba(244,67,54,0.04)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-sw-ink-500 whitespace-nowrap">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sw-ink-900 font-medium whitespace-nowrap">
                      {empName(r.v1_employee)}
                    </td>
                    <td className="px-4 py-3 text-right text-sw-ink-700 tabular-nums">
                      {fmtNum(r.v1_distance)}
                    </td>
                    <td className="px-4 py-3 text-right text-sw-ink-700 tabular-nums">
                      {fmtNum(r.v1_margin)}
                    </td>
                    <td className="px-4 py-3 text-sw-ink-900 font-medium whitespace-nowrap">
                      {r.v2_employee_id
                        ? empName(r.v2_employee)
                        : (
                          <span className="text-sw-ink-300 italic">
                            no match ({r.v2_reason ?? "—"})
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-right text-sw-ink-700 tabular-nums">
                      {fmtNum(r.v2_score, 3)}
                    </td>
                    <td className="px-4 py-3 text-right text-sw-ink-700 tabular-nums">
                      {fmtNum(r.v2_margin, 3)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${
                          r.agreed
                            ? "bg-[rgba(76,175,80,0.12)] text-sw-success-500"
                            : "bg-[rgba(244,67,54,0.12)] text-sw-danger-500"
                        }`}
                      >
                        {r.agreed ? "Agreed" : "Disagreed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
