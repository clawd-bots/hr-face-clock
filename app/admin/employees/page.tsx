"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Department } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import { cachedFetch } from "@/lib/swr-fetcher";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffc671]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)]">
          Employees
        </h1>
        <Link
          href="/admin/employees/register"
          className="px-5 py-3 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
          style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
        >
          + Register Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, position, or ID..."
          className="flex-1 h-10 px-4 bg-white border border-[rgba(0,0,0,0.1)] rounded-full text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.35)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
        />
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-10 px-4 bg-white border border-[rgba(0,0,0,0.1)] rounded-full text-sm text-[rgba(0,0,0,0.65)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
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
        <div className="glass-card rounded-3xl p-16 text-center">
          <p className="text-base text-[rgba(0,0,0,0.4)] mb-4">
            {employees.length === 0
              ? "No employees registered yet."
              : "No employees match your search."}
          </p>
          {employees.length === 0 && (
            <Link
              href="/admin/employees/register"
              className="text-sm font-medium text-[#9a6d2a] hover:underline"
            >
              Register your first employee
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-[#f4f1e6] border-b border-[rgba(0,0,0,0.06)]">
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Name
                </th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Position
                </th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Department
                </th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Face Data
                </th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Registered
                </th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => router.push(`/admin/employees/${emp.id}`)}
                  className="border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[#fafaf2] transition-colors duration-150 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-sm font-medium text-[rgba(0,0,0,0.88)]">
                        {emp.name}
                      </span>
                      {emp.employee_number && (
                        <span className="ml-2 text-xs text-[rgba(0,0,0,0.35)]">
                          #{emp.employee_number}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[rgba(0,0,0,0.65)]">
                    {emp.position_title || emp.role || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[rgba(0,0,0,0.65)]">
                    {emp.department || "—"}
                  </td>
                  <td className="px-6 py-4">
                    {emp.employment_status && (
                      <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-[rgba(207,147,88,0.12)] text-[#9a6d2a] capitalize">
                        {emp.employment_status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block text-xs font-medium px-3 py-1 rounded-full"
                      style={
                        emp.face_descriptors?.length > 0
                          ? {
                              background: "rgba(207,147,88,0.12)",
                              color: "#9a6d2a",
                            }
                          : {
                              background: "rgba(138,58,52,0.08)",
                              color: "#8a3a34",
                            }
                      }
                    >
                      {emp.face_descriptors?.length || 0} captures
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[rgba(0,0,0,0.4)]">
                    {formatDate(emp.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => handleDeactivate(e, emp.id)}
                      className="text-sm font-medium text-[#8a3a34] hover:underline transition-colors duration-150"
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
