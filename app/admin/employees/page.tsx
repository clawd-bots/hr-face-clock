"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Department } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { cachedFetch } from "@/lib/swr-fetcher";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Plus } from "@/components/ui/icons";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      cachedFetch<Employee[]>("/api/employees", { ttl: 120_000 }),
      cachedFetch<Department[]>("/api/departments", { ttl: 300_000 }),
    ])
      .then(([emps, depts]) => {
        setEmployees(Array.isArray(emps) ? emps : []);
        setDepartments(Array.isArray(depts) ? depts : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeactivate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Deactivate this employee?")) return;
    await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      !search ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      (emp.position_title || "").toLowerCase().includes(search.toLowerCase()) ||
      (emp.employee_number || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      !deptFilter || emp.department_id === deptFilter || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-sw-full h-8 w-8 border-b-2 border-sw-gold-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="t-display">Employees</h1>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const res = await fetch("/api/face-reenroll-flags", { method: "POST" });
              const data = await res.json().catch(() => null);
              if (res.ok && data) {
                alert(`Refreshed: ${data.flagged} flagged, ${data.cleared} cleared`);
                window.location.reload();
              } else {
                alert(data?.error ?? "Failed to refresh flags");
              }
            }}
            className="h-10 px-4 rounded-full text-sw-caption font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-[var(--color-sw-ink-100)]"
          >
            Refresh re-enroll flags
          </button>
          <Button asChild variant="primary">
            <Link href="/admin/employees/register">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Register Employee
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, position, or ID..."
          className="flex-1 h-10 px-4 bg-sw-white border border-sw-ink-200 rounded-sw-pill text-sw-caption text-sw-ink-900 placeholder:text-sw-ink-300 focus:outline-none focus:border-sw-gold-500 focus:shadow-sw-ring-accent transition-[border,box-shadow] duration-sw-fast"
        />
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-10 px-4 bg-sw-white border border-sw-ink-200 rounded-sw-pill text-sw-caption text-sw-ink-700 focus:outline-none focus:border-sw-gold-500 focus:shadow-sw-ring-accent transition-[border,box-shadow] duration-sw-fast"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-sw-lg p-16 text-center">
          <p className="t-body text-sw-ink-500 mb-4">
            {employees.length === 0
              ? "No employees registered yet."
              : "No employees match your search."}
          </p>
          {employees.length === 0 && (
            <Link
              href="/admin/employees/register"
              className="text-sw-caption font-medium text-sw-gold-600 hover:underline"
            >
              Register your first employee
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-sw-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-sw-cream-25 border-b border-sw-ink-100">
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Name</th>
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Position</th>
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Department</th>
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Status</th>
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Face Data</th>
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Registered</th>
                <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => router.push(`/admin/employees/${emp.id}`)}
                  className="border-b border-sw-ink-100 last:border-0 hover:bg-sw-cream-25 transition-colors duration-sw-fast cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-sw-caption font-medium text-sw-ink-900">
                        {emp.name}
                      </span>
                      {emp.employee_number && (
                        <span className="ml-2 text-sw-micro text-sw-ink-300">
                          #{emp.employee_number}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-700">
                    {emp.position_title || emp.role || "—"}
                  </td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-700">
                    {(() => {
                      const dept = emp.department_id
                        ? departments.find((d) => d.id === emp.department_id)
                        : null;
                      if (dept) {
                        return (
                          <span>
                            {dept.name}
                            {dept.code && (
                              <span className="ml-1 text-sw-micro text-sw-ink-300">
                                ({dept.code})
                              </span>
                            )}
                          </span>
                        );
                      }
                      // Fallback to legacy free-text department field
                      return emp.department || "—";
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    {emp.employment_status && (
                      <Chip tone="gold" className="capitalize">{emp.employment_status}</Chip>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Chip tone={emp.face_descriptors?.length > 0 ? "success" : "danger"}>
                      {emp.face_descriptors?.length || 0} captures
                    </Chip>
                    {emp.needs_face_reenroll && (
                      <div className="mt-1.5 flex items-start gap-1">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full bg-sw-danger-500 mt-1 shrink-0"
                          aria-hidden
                        />
                        <span
                          className="text-[11px] text-sw-danger-500 leading-tight"
                          title={emp.face_reenroll_reason ?? "Re-enroll recommended"}
                        >
                          Re-enroll recommended
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-500">
                    {formatDate(emp.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => handleDeactivate(e, emp.id)}
                      className="text-sw-caption font-medium text-sw-danger-500 hover:underline transition-colors duration-sw-fast"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
