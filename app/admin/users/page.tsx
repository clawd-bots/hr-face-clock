"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

type User = {
  id: string;
  email: string;
  display_name: string;
  system_role: string;
  active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  employee_id: string | null;
  managed_department_ids?: string[];
  employee?: {
    id: string;
    employee_number?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    position_title?: string;
  } | null;
};

type Department = { id: string; name: string };

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "department_manager", label: "Department Manager" },
  { value: "payroll_officer", label: "Payroll Officer" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "company_admin", label: "Company Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label])
);

function fmtDate(d: string | null): string {
  if (!d) return "Never";
  return new Date(d).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function employeeLabel(u: User): string {
  if (!u.employee) return "—";
  const e = u.employee;
  const name = e.first_name ? `${e.first_name} ${e.last_name ?? ""}`.trim() : e.name;
  return name ? `${name}${e.employee_number ? ` · ${e.employee_number}` : ""}` : "—";
}

export default function UsersPage() {
  const { user: currentUser, role: currentRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  // Managed-departments edit modal
  const [deptTarget, setDeptTarget] = useState<User | null>(null);
  const [deptDraft, setDeptDraft] = useState<string[]>([]);
  const [deptSaving, setDeptSaving] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      setUsers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  async function handleSaveManagedDepts() {
    if (!deptTarget) return;
    setDeptSaving(true);
    try {
      const res = await fetch(`/api/users/${deptTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managed_department_ids: deptDraft }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      setDeptTarget(null);
      setDeptDraft([]);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeptSaving(false);
    }
  }

  function openDeptModal(u: User) {
    setDeptTarget(u);
    setDeptDraft(u.managed_department_ids ?? []);
  }

  async function handleRoleChange(u: User, newRole: string) {
    if (newRole === u.system_role) return;
    if (!confirm(`Change ${u.display_name}'s role to ${ROLE_LABEL[newRole]}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to change role");
      return;
    }
    fetchUsers();
  }

  async function handleToggleActive(u: User) {
    const action = u.active ? "Disable" : "Enable";
    if (!confirm(`${action} ${u.display_name}'s account?`)) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed");
      return;
    }
    fetchUsers();
  }

  async function handleDelete(u: User) {
    if (
      !confirm(
        `Delete ${u.display_name}'s account? They'll be signed out and won't be able to sign in. The employee record stays.`
      )
    )
      return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed");
      return;
    }
    fetchUsers();
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    if (resetPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      setResetSuccess(resetTarget.email);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setResetSubmitting(false);
    }
  }

  function closeResetModal() {
    setResetTarget(null);
    setResetPassword("");
    setResetSuccess(null);
  }

  // Client-side search filter
  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.employee?.employee_number ?? "").toLowerCase().includes(s)
    );
  });

  // Permission helpers
  const isSuperAdmin = currentRole === "super_admin";
  function canEdit(u: User): boolean {
    if (u.id === currentUser?.id) return false;
    if (u.system_role === "super_admin" && !isSuperAdmin) return false;
    return true;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="t-display">Users &amp; Permissions</h1>
          <p className="text-sm text-sw-ink-500 mt-1">
            Manage portal access, change roles, reset passwords, disable accounts.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, employee #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 px-4 rounded-xl border border-sw-ink-200 text-sm flex-1 min-w-[240px] focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Disabled</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">No users found.</div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="glass-table w-full text-sm">
            <thead>
              <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Name</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Email</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Linked Employee</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Role</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Manages</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Status</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Last Sign-in</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const editable = canEdit(u);
                return (
                  <tr key={u.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                    <td className="px-6 py-4 text-sw-ink-900 font-medium">
                      {u.display_name}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-sw-gold-600 font-semibold">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sw-ink-700 text-xs">{u.email}</td>
                    <td className="px-6 py-4 text-sw-ink-700 text-xs">{employeeLabel(u)}</td>
                    <td className="px-6 py-4">
                      {editable ? (
                        <select
                          value={u.system_role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="h-8 px-2 rounded-md border border-sw-ink-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                        >
                          {ROLE_OPTIONS.filter(
                            (r) => r.value !== "super_admin" || isSuperAdmin
                          ).map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-sw-ink-700">{ROLE_LABEL[u.system_role] ?? u.system_role}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {u.system_role === "department_manager" ? (
                        <button
                          onClick={() => openDeptModal(u)}
                          disabled={!editable}
                          className="text-left hover:underline disabled:no-underline disabled:cursor-default"
                        >
                          {u.managed_department_ids && u.managed_department_ids.length > 0 ? (
                            <span className="text-sw-ink-700">
                              {u.managed_department_ids
                                .map(
                                  (id) =>
                                    departments.find((d) => d.id === id)?.name ?? "?"
                                )
                                .join(", ")}
                            </span>
                          ) : (
                            <span className="text-sw-danger-500 font-medium">Not assigned</span>
                          )}
                        </button>
                      ) : (
                        <span className="text-sw-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${
                          u.active
                            ? "bg-[rgba(76,175,80,0.12)] text-sw-success-500"
                            : "bg-[rgba(28,26,22,0.06)] text-sw-ink-500"
                        }`}
                      >
                        {u.active ? "active" : "disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sw-ink-700 text-xs">
                      {fmtDate(u.last_sign_in_at)}
                    </td>
                    <td className="px-6 py-4">
                      {editable ? (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => { setResetTarget(u); setResetPassword(""); setResetSuccess(null); }}
                            className="px-3 py-1 rounded-full text-xs font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-sw-cream-25"
                          >
                            Reset PW
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="px-3 py-1 rounded-full text-xs font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-sw-cream-25"
                          >
                            {u.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="px-3 py-1 rounded-full text-xs font-medium text-sw-danger-500 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-sw-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Managed-departments modal */}
      {deptTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDeptTarget(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-1">Departments in charge of</h2>
              <p className="text-sm text-sw-ink-500 mb-4">
                <span className="font-medium">{deptTarget.display_name}</span> can approve leaves, OT, and time declarations for employees in the selected departments.
              </p>
              <div className="space-y-1 max-h-64 overflow-y-auto rounded-xl border border-sw-ink-200 p-3 bg-sw-cream-50 mb-2">
                {departments.length === 0 ? (
                  <p className="text-sm text-sw-ink-500">No departments yet.</p>
                ) : (
                  departments.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 text-sm text-sw-ink-700 cursor-pointer hover:bg-white/60 px-2 py-1 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={deptDraft.includes(d.id)}
                        onChange={(e) => {
                          setDeptDraft((prev) =>
                            e.target.checked
                              ? [...prev, d.id]
                              : prev.filter((x) => x !== d.id)
                          );
                        }}
                      />
                      {d.name}
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setDeptTarget(null)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-sw-cream-25"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveManagedDepts}
                  disabled={deptSaving}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--color-sw-gold-500)" }}
                >
                  {deptSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeResetModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-1">
                Reset Password
              </h2>
              <p className="text-sm text-sw-ink-500 mb-4">
                For <span className="font-medium">{resetTarget.display_name}</span> ({resetTarget.email})
              </p>
              {resetSuccess ? (
                <div className="px-4 py-3 bg-[rgba(76,175,80,0.12)] text-sw-success-500 rounded-xl text-sm font-medium mb-4">
                  ✓ Password reset. Share it with the user securely. Their existing sessions have been signed out.
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoFocus
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  />
                  <p className="text-xs text-sw-ink-500 mt-1">
                    The user will need to sign in again with this password.
                  </p>
                </>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeResetModal}
                  className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-sw-cream-25"
                >
                  {resetSuccess ? "Close" : "Cancel"}
                </button>
                {!resetSuccess && (
                  <button
                    onClick={handleResetPassword}
                    disabled={resetSubmitting || resetPassword.length < 6}
                    className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--color-sw-gold-500)" }}
                  >
                    {resetSubmitting ? "Resetting..." : "Reset Password"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
