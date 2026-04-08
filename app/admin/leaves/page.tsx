"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TabNav from "@/components/TabNav";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Employee = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
};

type LeaveType = {
  id: string;
  name: string;
  code?: string;
  days_per_year?: number;
  is_paid?: boolean;
  is_convertible?: boolean;
  requires_attachment?: boolean;
  allow_half_day?: boolean;
  gender_specific?: string;
  min_service_months?: number;
  carry_over_max?: number;
  prorate_on_hire?: boolean;
  active?: boolean;
};

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejection_reason?: string;
  employee?: Employee;
  leave_type?: LeaveType;
};

type LeaveBalance = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  carried_over: number;
  adjusted_days: number;
  used_days: number;
  pending_days: number;
  employee?: Employee;
  leave_type?: LeaveType;
};

type LeaveTypeForm = {
  name: string;
  code: string;
  days_per_year: number;
  is_paid: boolean;
  is_convertible: boolean;
  requires_attachment: boolean;
  allow_half_day: boolean;
  gender_specific: string;
  min_service_months: number;
  carry_over_max: number;
  prorate_on_hire: boolean;
};

const EMPTY_LT_FORM: LeaveTypeForm = {
  name: "",
  code: "",
  days_per_year: 0,
  is_paid: true,
  is_convertible: false,
  requires_attachment: false,
  allow_half_day: false,
  gender_specific: "both",
  min_service_months: 0,
  carry_over_max: 0,
  prorate_on_hire: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function employeeName(e?: Employee | null): string {
  if (!e) return "\u2014";
  return e.first_name && e.last_name
    ? `${e.first_name} ${e.last_name}`
    : e.name ?? "\u2014";
}

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function diffDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

const INPUT_CLASS =
  "w-full h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150";

const LABEL_CLASS = "block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "balances", label: "Balances" },
];

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors duration-150 ${value ? "bg-[#ffc671]" : "bg-[rgba(0,0,0,0.1)]"}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${value ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState("requests");

  // ---- Shared data ----
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // ---- Requests tab state ----
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [empSearch, setEmpSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ---- File leave modal ----
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileForm, setFileForm] = useState({
    employee_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    total_days: 0,
    half_day: false,
    half_day_period: "morning" as "morning" | "afternoon",
    reason: "",
  });
  const [fileBalance, setFileBalance] = useState<number | null>(null);
  const [fileSubmitting, setFileSubmitting] = useState(false);
  const [fileError, setFileError] = useState("");

  // ---- Reject modal ----
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // ---- Balances tab state ----
  const currentYear = new Date().getFullYear();
  const [balYear, setBalYear] = useState(currentYear);
  const [balEmpSearch, setBalEmpSearch] = useState("");
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState("");
  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState("");

  // ---- Leave Types popup state ----
  const [showLTPopup, setShowLTPopup] = useState(false);
  const [allLeaveTypes, setAllLeaveTypes] = useState<LeaveType[]>([]);
  const [ltLoading, setLtLoading] = useState(false);
  const [ltError, setLtError] = useState("");
  const [ltSeedLoading, setLtSeedLoading] = useState(false);
  const [ltFormMode, setLtFormMode] = useState<"none" | "add" | "edit">("none");
  const [ltEditId, setLtEditId] = useState<string | null>(null);
  const [ltForm, setLtForm] = useState<LeaveTypeForm>(EMPTY_LT_FORM);
  const [ltFormSubmitting, setLtFormSubmitting] = useState(false);
  const [ltFormError, setLtFormError] = useState("");

  // -----------------------------------------------------------------------
  // Fetch helpers
  // -----------------------------------------------------------------------

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/leave-types");
      if (res.ok) setLeaveTypes(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  const fetchAllLeaveTypes = useCallback(async () => {
    setLtLoading(true);
    setLtError("");
    try {
      const res = await fetch("/api/leave-types?all=true");
      if (!res.ok) throw new Error("Failed to fetch leave types");
      setAllLeaveTypes(await res.json());
    } catch (err: unknown) {
      setLtError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLtLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    setReqError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (empSearch) params.set("employee_id", empSearch);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/leave-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      setRequests(await res.json());
    } catch (err: unknown) {
      setReqError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setReqLoading(false);
    }
  }, [statusFilter, empSearch, fromDate, toDate]);

  const fetchBalances = useCallback(async () => {
    setBalLoading(true);
    setBalError("");
    try {
      const params = new URLSearchParams({ year: String(balYear) });
      if (balEmpSearch) params.set("employee_id", balEmpSearch);
      const res = await fetch(`/api/leave-balances?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leave balances");
      setBalances(await res.json());
    } catch (err: unknown) {
      setBalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBalLoading(false);
    }
  }, [balYear, balEmpSearch]);

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchEmployees();
    fetchLeaveTypes();
  }, [fetchEmployees, fetchLeaveTypes]);

  useEffect(() => {
    if (activeTab === "requests") fetchRequests();
  }, [activeTab, fetchRequests]);

  useEffect(() => {
    if (activeTab === "balances") fetchBalances();
  }, [activeTab, fetchBalances]);

  // Fetch all leave types when popup opens
  useEffect(() => {
    if (showLTPopup) fetchAllLeaveTypes();
  }, [showLTPopup, fetchAllLeaveTypes]);

  // Fetch balance for file-leave modal when employee + leave type selected
  useEffect(() => {
    if (!fileForm.employee_id || !fileForm.leave_type_id) {
      setFileBalance(null);
      return;
    }
    (async () => {
      try {
        const params = new URLSearchParams({
          employee_id: fileForm.employee_id,
          year: String(currentYear),
        });
        const res = await fetch(`/api/leave-balances?${params.toString()}`);
        if (!res.ok) return;
        const data: LeaveBalance[] = await res.json();
        const match = data.find(
          (b) => b.leave_type_id === fileForm.leave_type_id
        );
        if (match) {
          setFileBalance(
            match.entitled_days +
              match.carried_over +
              match.adjusted_days -
              match.used_days -
              match.pending_days
          );
        } else {
          setFileBalance(null);
        }
      } catch {
        setFileBalance(null);
      }
    })();
  }, [fileForm.employee_id, fileForm.leave_type_id, currentYear]);

  // Auto-compute total_days
  useEffect(() => {
    if (fileForm.half_day) {
      setFileForm((p) => ({ ...p, total_days: 0.5 }));
    } else if (fileForm.start_date && fileForm.end_date) {
      setFileForm((p) => ({
        ...p,
        total_days: diffDays(fileForm.start_date, fileForm.end_date),
      }));
    }
  }, [fileForm.start_date, fileForm.end_date, fileForm.half_day]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  async function handleFileLeave() {
    setFileSubmitting(true);
    setFileError("");
    try {
      const body: Record<string, unknown> = {
        employee_id: fileForm.employee_id,
        leave_type_id: fileForm.leave_type_id,
        start_date: fileForm.start_date,
        end_date: fileForm.end_date,
        total_days: fileForm.total_days,
        reason: fileForm.reason,
      };
      if (fileForm.half_day) {
        body.half_day = true;
        body.half_day_period = fileForm.half_day_period;
      }
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to file leave");
      }
      setShowFileModal(false);
      setFileForm({
        employee_id: "",
        leave_type_id: "",
        start_date: "",
        end_date: "",
        total_days: 0,
        half_day: false,
        half_day_period: "morning",
        reason: "",
      });
      fetchRequests();
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFileSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error();
      fetchRequests();
    } catch {
      /* silent */
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      const res = await fetch(`/api/leave-requests/${rejectTarget}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejection_reason: rejectReason,
        }),
      });
      if (!res.ok) throw new Error();
      setRejectTarget(null);
      setRejectReason("");
      fetchRequests();
    } catch {
      /* silent */
    } finally {
      setRejectSubmitting(false);
    }
  }

  async function handleInitialize() {
    setInitLoading(true);
    setInitResult("");
    try {
      const res = await fetch("/api/leave-balances/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: balYear }),
      });
      if (!res.ok) throw new Error("Failed to initialize balances");
      const data = await res.json();
      setInitResult(
        `Initialized ${data.count ?? "all"} balance${data.count === 1 ? "" : "s"} for ${balYear}.`
      );
      fetchBalances();
    } catch (err: unknown) {
      setInitResult(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setInitLoading(false);
    }
  }

  // ---- Leave Types popup actions ----

  async function handleSeedDefaults() {
    setLtSeedLoading(true);
    setLtError("");
    try {
      const res = await fetch("/api/leave-types/seed", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to seed defaults");
      }
      await fetchAllLeaveTypes();
      fetchLeaveTypes();
    } catch (err: unknown) {
      setLtError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLtSeedLoading(false);
    }
  }

  function openLtAdd() {
    setLtFormMode("add");
    setLtEditId(null);
    setLtForm(EMPTY_LT_FORM);
    setLtFormError("");
  }

  function openLtEdit(lt: LeaveType) {
    setLtFormMode("edit");
    setLtEditId(lt.id);
    setLtForm({
      name: lt.name ?? "",
      code: lt.code ?? "",
      days_per_year: lt.days_per_year ?? 0,
      is_paid: lt.is_paid ?? true,
      is_convertible: lt.is_convertible ?? false,
      requires_attachment: lt.requires_attachment ?? false,
      allow_half_day: lt.allow_half_day ?? false,
      gender_specific: lt.gender_specific ?? "both",
      min_service_months: lt.min_service_months ?? 0,
      carry_over_max: lt.carry_over_max ?? 0,
      prorate_on_hire: lt.prorate_on_hire ?? false,
    });
    setLtFormError("");
  }

  function cancelLtForm() {
    setLtFormMode("none");
    setLtEditId(null);
    setLtForm(EMPTY_LT_FORM);
    setLtFormError("");
  }

  async function handleLtFormSubmit() {
    setLtFormSubmitting(true);
    setLtFormError("");
    try {
      if (!ltForm.name || !ltForm.code || !ltForm.days_per_year) {
        throw new Error("Name, Code, and Days Per Year are required");
      }
      if (ltFormMode === "add") {
        const res = await fetch("/api/leave-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ltForm),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to create leave type");
        }
      } else if (ltFormMode === "edit" && ltEditId) {
        const res = await fetch(`/api/leave-types/${ltEditId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ltForm),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to update leave type");
        }
      }
      cancelLtForm();
      await fetchAllLeaveTypes();
      fetchLeaveTypes();
    } catch (err: unknown) {
      setLtFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLtFormSubmitting(false);
    }
  }

  async function handleLtDeactivate(id: string) {
    try {
      const res = await fetch(`/api/leave-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchAllLeaveTypes();
      fetchLeaveTypes();
    } catch {
      /* silent */
    }
  }

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const groupedBalances = useMemo(() => {
    const map = new Map<string, LeaveBalance[]>();
    for (const b of balances) {
      const key = b.employee_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries());
  }, [balances]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);
    return years;
  }, [currentYear]);

  // -----------------------------------------------------------------------
  // Status badge
  // -----------------------------------------------------------------------

  function statusBadge(status: string) {
    const base = "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";
    switch (status) {
      case "pending":
        return (
          <span className={`${base} bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]`}>
            {status}
          </span>
        );
      case "approved":
        return (
          <span className={`${base} bg-[rgba(34,139,34,0.1)] text-[#1a7a1a]`}>
            {status}
          </span>
        );
      case "rejected":
        return (
          <span className={`${base} bg-[rgba(138,58,52,0.1)] text-[#8a3a34]`}>
            {status}
          </span>
        );
      case "cancelled":
        return (
          <span className={`${base} bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.4)]`}>
            {status}
          </span>
        );
      default:
        return <span className={base}>{status}</span>;
    }
  }

  // -----------------------------------------------------------------------
  // Leave type inline form (rendered inside popup)
  // -----------------------------------------------------------------------

  function renderLtForm() {
    return (
      <div className="bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-[rgba(0,0,0,0.88)] mb-3">
          {ltFormMode === "add" ? "Add Leave Type" : "Edit Leave Type"}
        </h3>

        {ltFormError && (
          <div className="bg-white border border-[rgba(138,58,52,0.2)] rounded-xl text-sm font-medium text-[#8a3a34] p-3 mb-3">
            {ltFormError}
          </div>
        )}

        <div className="space-y-3">
          {/* Row: Name, Code, Days */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL_CLASS}>Name *</label>
              <input
                type="text"
                value={ltForm.name}
                onChange={(e) => setLtForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Vacation Leave"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Code *</label>
              <input
                type="text"
                value={ltForm.code}
                onChange={(e) => setLtForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="VL"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Days Per Year *</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={ltForm.days_per_year}
                onChange={(e) => setLtForm((p) => ({ ...p, days_per_year: parseFloat(e.target.value) || 0 }))}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Toggle row 1 */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-[rgba(0,0,0,0.65)]">
              <Toggle value={ltForm.is_paid} onChange={(v) => setLtForm((p) => ({ ...p, is_paid: v }))} />
              Is Paid
            </label>
            <label className="flex items-center gap-2 text-sm text-[rgba(0,0,0,0.65)]">
              <Toggle value={ltForm.is_convertible} onChange={(v) => setLtForm((p) => ({ ...p, is_convertible: v }))} />
              Is Convertible
            </label>
            <label className="flex items-center gap-2 text-sm text-[rgba(0,0,0,0.65)]">
              <Toggle value={ltForm.requires_attachment} onChange={(v) => setLtForm((p) => ({ ...p, requires_attachment: v }))} />
              Requires Attachment
            </label>
            <label className="flex items-center gap-2 text-sm text-[rgba(0,0,0,0.65)]">
              <Toggle value={ltForm.allow_half_day} onChange={(v) => setLtForm((p) => ({ ...p, allow_half_day: v }))} />
              Allow Half Day
            </label>
          </div>

          {/* Row: Gender, Min Service, Carry Over, Prorate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL_CLASS}>Gender Specific</label>
              <select
                value={ltForm.gender_specific}
                onChange={(e) => setLtForm((p) => ({ ...p, gender_specific: e.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="both">Both</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Min Service Months</label>
              <input
                type="number"
                min="0"
                value={ltForm.min_service_months}
                onChange={(e) => setLtForm((p) => ({ ...p, min_service_months: parseInt(e.target.value) || 0 }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Carry Over Max</label>
              <input
                type="number"
                min="0"
                value={ltForm.carry_over_max}
                onChange={(e) => setLtForm((p) => ({ ...p, carry_over_max: parseInt(e.target.value) || 0 }))}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Prorate toggle */}
          <label className="flex items-center gap-2 text-sm text-[rgba(0,0,0,0.65)]">
            <Toggle value={ltForm.prorate_on_hire} onChange={(v) => setLtForm((p) => ({ ...p, prorate_on_hire: v }))} />
            Pro-rate on Hire
          </label>

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleLtFormSubmit}
              disabled={ltFormSubmitting}
              className="h-9 px-4 rounded-xl text-sm font-medium text-[#61474c] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              {ltFormSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelLtForm}
              className="h-9 px-4 rounded-xl text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.03)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-medium tracking-[-1.75px] text-[rgba(0,0,0,0.88)]">
          Leave Management
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLTPopup(true)}
            className="h-10 px-5 rounded-xl text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.03)] transition-colors"
          >
            Leave Types
          </button>
          {activeTab === "requests" && (
            <button
              onClick={() => setShowFileModal(true)}
              className="h-10 px-5 rounded-xl text-sm font-medium text-[#61474c] transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              File Leave
            </button>
          )}
        </div>
      </div>

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ================================================================= */}
      {/* TAB: Requests                                                      */}
      {/* ================================================================= */}
      {activeTab === "requests" && (
        <>
          {/* Filters */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Status */}
              <div className="w-44">
                <label className={LABEL_CLASS}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee search */}
              <div className="w-56">
                <label className={LABEL_CLASS}>Employee</label>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              {/* Date range */}
              <div className="w-40">
                <label className={LABEL_CLASS}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="w-40">
                <label className={LABEL_CLASS}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {reqError && (
            <div className="bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34] p-4 mb-6">
              {reqError}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    {["Employee", "Leave Type", "Dates", "Days", "Reason", "Status", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-medium text-[rgba(0,0,0,0.5)] uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reqLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-[rgba(0,0,0,0.4)]"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-[rgba(0,0,0,0.4)]"
                      >
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.01)]"
                      >
                        <td className="px-4 py-3 text-[rgba(0,0,0,0.88)]">
                          {employeeName(r.employee)}
                        </td>
                        <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                          {r.leave_type?.name ?? "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-[rgba(0,0,0,0.65)] whitespace-nowrap">
                          {dateFmt(r.start_date)} \u2014 {dateFmt(r.end_date)}
                        </td>
                        <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                          {r.total_days}
                        </td>
                        <td className="px-4 py-3 text-[rgba(0,0,0,0.65)] max-w-[200px] truncate">
                          {r.reason || "\u2014"}
                        </td>
                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleApprove(r.id)}
                                className="text-xs font-medium text-[#1a7a1a] hover:underline"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(r.id)}
                                className="text-xs font-medium text-[#8a3a34] hover:underline"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* TAB: Balances                                                      */}
      {/* ================================================================= */}
      {activeTab === "balances" && (
        <>
          {/* Filters + Initialize */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-32">
                <label className={LABEL_CLASS}>Year</label>
                <select
                  value={balYear}
                  onChange={(e) => setBalYear(Number(e.target.value))}
                  className={INPUT_CLASS}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-56">
                <label className={LABEL_CLASS}>Employee</label>
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={balEmpSearch}
                  onChange={(e) => setBalEmpSearch(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={handleInitialize}
                disabled={initLoading}
                className="h-10 px-5 rounded-xl text-sm font-medium text-[#61474c] transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
              >
                {initLoading ? "Initializing..." : "Initialize Balances"}
              </button>
            </div>
            {initResult && (
              <p className="mt-3 text-sm text-[rgba(0,0,0,0.65)]">{initResult}</p>
            )}
          </div>

          {/* Error */}
          {balError && (
            <div className="bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34] p-4 mb-6">
              {balError}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    {[
                      "Employee",
                      "Leave Type",
                      "Entitled",
                      "Carried Over",
                      "Adjusted",
                      "Used",
                      "Pending",
                      "Available",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-[rgba(0,0,0,0.5)] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {balLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-[rgba(0,0,0,0.4)]"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : groupedBalances.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-[rgba(0,0,0,0.4)]"
                      >
                        No balance records found.
                      </td>
                    </tr>
                  ) : (
                    groupedBalances.map(([empId, rows]) =>
                      rows.map((b, idx) => {
                        const available =
                          b.entitled_days +
                          b.carried_over +
                          b.adjusted_days -
                          b.used_days -
                          b.pending_days;
                        return (
                          <tr
                            key={b.id}
                            className={`border-b border-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.01)] ${
                              idx === 0 && empId ? "border-t border-t-[rgba(0,0,0,0.08)]" : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.88)] font-medium">
                              {idx === 0 ? employeeName(b.employee) : ""}
                            </td>
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                              {b.leave_type?.name ?? "\u2014"}
                            </td>
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                              {b.entitled_days}
                            </td>
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                              {b.carried_over}
                            </td>
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                              {b.adjusted_days}
                            </td>
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                              {b.used_days}
                            </td>
                            <td className="px-4 py-3 text-[rgba(0,0,0,0.65)]">
                              {b.pending_days}
                            </td>
                            <td
                              className={`px-4 py-3 font-medium ${
                                available <= 0
                                  ? "text-[#8a3a34]"
                                  : "text-[rgba(0,0,0,0.88)]"
                              }`}
                            >
                              {available}
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* Modal: File Leave                                                  */}
      {/* ================================================================= */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-[rgba(0,0,0,0.88)] mb-5">
              File Leave
            </h2>

            {fileError && (
              <div className="bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34] p-3 mb-4">
                {fileError}
              </div>
            )}

            <div className="space-y-4">
              {/* Employee */}
              <div>
                <label className={LABEL_CLASS}>Employee</label>
                <select
                  value={fileForm.employee_id}
                  onChange={(e) =>
                    setFileForm((p) => ({ ...p, employee_id: e.target.value }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {employeeName(emp)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div>
                <label className={LABEL_CLASS}>Leave Type</label>
                <select
                  value={fileForm.leave_type_id}
                  onChange={(e) =>
                    setFileForm((p) => ({
                      ...p,
                      leave_type_id: e.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Select leave type...</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Balance */}
              {fileBalance !== null && (
                <p className="text-sm text-[rgba(0,0,0,0.65)]">
                  Available balance:{" "}
                  <span
                    className={`font-medium ${
                      fileBalance <= 0 ? "text-[#8a3a34]" : "text-[#1a7a1a]"
                    }`}
                  >
                    {fileBalance} day{fileBalance !== 1 ? "s" : ""}
                  </span>
                </p>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>Start Date</label>
                  <input
                    type="date"
                    value={fileForm.start_date}
                    onChange={(e) =>
                      setFileForm((p) => ({
                        ...p,
                        start_date: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>End Date</label>
                  <input
                    type="date"
                    value={fileForm.end_date}
                    onChange={(e) =>
                      setFileForm((p) => ({ ...p, end_date: e.target.value }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Total Days */}
              <div>
                <label className={LABEL_CLASS}>Total Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={fileForm.total_days}
                  onChange={(e) =>
                    setFileForm((p) => ({
                      ...p,
                      total_days: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={INPUT_CLASS}
                  disabled={fileForm.half_day}
                />
              </div>

              {/* Half Day */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-[rgba(0,0,0,0.65)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fileForm.half_day}
                    onChange={(e) =>
                      setFileForm((p) => ({
                        ...p,
                        half_day: e.target.checked,
                      }))
                    }
                    className="rounded border-[rgba(0,0,0,0.2)] text-[#cf9358] focus:ring-[rgba(255,198,113,0.5)]"
                  />
                  Half Day
                </label>
                {fileForm.half_day && (
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.65)] cursor-pointer">
                      <input
                        type="radio"
                        name="half_day_period"
                        value="morning"
                        checked={fileForm.half_day_period === "morning"}
                        onChange={() =>
                          setFileForm((p) => ({
                            ...p,
                            half_day_period: "morning",
                          }))
                        }
                        className="text-[#cf9358] focus:ring-[rgba(255,198,113,0.5)]"
                      />
                      Morning
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.65)] cursor-pointer">
                      <input
                        type="radio"
                        name="half_day_period"
                        value="afternoon"
                        checked={fileForm.half_day_period === "afternoon"}
                        onChange={() =>
                          setFileForm((p) => ({
                            ...p,
                            half_day_period: "afternoon",
                          }))
                        }
                        className="text-[#cf9358] focus:ring-[rgba(255,198,113,0.5)]"
                      />
                      Afternoon
                    </label>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className={LABEL_CLASS}>Reason</label>
                <textarea
                  rows={3}
                  value={fileForm.reason}
                  onChange={(e) =>
                    setFileForm((p) => ({ ...p, reason: e.target.value }))
                  }
                  placeholder="Enter reason for leave..."
                  className={`${INPUT_CLASS} h-auto py-2.5 resize-none`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFileModal(false);
                  setFileError("");
                }}
                className="h-10 px-4 rounded-xl text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.03)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFileLeave}
                disabled={
                  fileSubmitting ||
                  !fileForm.employee_id ||
                  !fileForm.leave_type_id ||
                  !fileForm.start_date ||
                  !fileForm.end_date
                }
                className="h-10 px-5 rounded-xl text-sm font-medium text-[#61474c] transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(to right, #ffc671, #cf9358)",
                }}
              >
                {fileSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Modal: Reject                                                      */}
      {/* ================================================================= */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-[rgba(0,0,0,0.88)] mb-4">
              Reject Leave Request
            </h2>
            <div>
              <label className={LABEL_CLASS}>Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className={`${INPUT_CLASS} h-auto py-2.5 resize-none`}
              />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="h-10 px-4 rounded-xl text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.03)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectSubmitting}
                className="h-10 px-5 rounded-xl text-sm font-medium text-white bg-[#8a3a34] hover:bg-[#742e29] transition-colors disabled:opacity-50"
              >
                {rejectSubmitting ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Modal: Leave Types Popup                                           */}
      {/* ================================================================= */}
      {showLTPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            {/* Popup header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-[rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-semibold text-[rgba(0,0,0,0.88)]">
                Leave Types
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSeedDefaults}
                  disabled={ltSeedLoading}
                  className="h-9 px-4 rounded-xl text-xs font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.03)] transition-colors disabled:opacity-50"
                >
                  {ltSeedLoading ? "Seeding..." : "Seed PH Defaults"}
                </button>
                {ltFormMode === "none" && (
                  <button
                    onClick={openLtAdd}
                    className="h-9 px-4 rounded-xl text-xs font-medium text-[#61474c] transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
                  >
                    + Add
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowLTPopup(false);
                    cancelLtForm();
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-xl text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.88)] hover:bg-[rgba(0,0,0,0.04)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* Popup body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {ltError && (
                <div className="bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34] p-3 mb-4">
                  {ltError}
                </div>
              )}

              {/* Inline add/edit form */}
              {ltFormMode !== "none" && renderLtForm()}

              {/* Leave types list */}
              {ltLoading ? (
                <p className="text-center text-[rgba(0,0,0,0.4)] py-8">Loading...</p>
              ) : allLeaveTypes.length === 0 ? (
                <p className="text-center text-[rgba(0,0,0,0.4)] py-8">
                  No leave types found. Seed defaults or add one.
                </p>
              ) : (
                <div className="space-y-2">
                  {allLeaveTypes.map((lt) => (
                    <div
                      key={lt.id}
                      className={`bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 flex items-center justify-between gap-3 ${
                        lt.active === false ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[rgba(0,0,0,0.88)]">
                            {lt.name}
                          </span>
                          {lt.code && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[rgba(255,198,113,0.2)] text-[#9a6d2a]">
                              {lt.code}
                            </span>
                          )}
                          {lt.days_per_year != null && (
                            <span className="text-xs text-[rgba(0,0,0,0.4)]">
                              {lt.days_per_year}d/yr
                            </span>
                          )}
                          {lt.active === false && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.4)]">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {lt.is_paid && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(34,139,34,0.08)] text-[#1a7a1a]">
                              Paid
                            </span>
                          )}
                          {lt.is_convertible && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]">
                              Convertible
                            </span>
                          )}
                          {lt.requires_attachment && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]">
                              Attachment Required
                            </span>
                          )}
                          {lt.allow_half_day && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]">
                              Half Day
                            </span>
                          )}
                          {lt.gender_specific && lt.gender_specific !== "both" && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]">
                              {lt.gender_specific === "male" ? "Male Only" : "Female Only"}
                            </span>
                          )}
                          {lt.prorate_on_hire && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]">
                              Pro-rated
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => openLtEdit(lt)}
                          className="text-xs font-medium text-[#9a6d2a] hover:underline"
                        >
                          Edit
                        </button>
                        {lt.active !== false && (
                          <button
                            onClick={() => handleLtDeactivate(lt.id)}
                            className="text-xs font-medium text-[#8a3a34] hover:underline"
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
          </div>
        </div>
      )}
    </div>
  );
}
