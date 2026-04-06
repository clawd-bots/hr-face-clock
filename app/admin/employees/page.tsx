"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Employee } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this employee?")) return;
    await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffc671]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
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

      {employees.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-16 text-center">
          <p className="text-base text-[rgba(0,0,0,0.4)] mb-4">No employees registered yet.</p>
          <Link
            href="/admin/employees/register"
            className="text-sm font-medium text-[#9a6d2a] hover:underline"
          >
            Register your first employee
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-[#f4f1e6] border-b border-[rgba(0,0,0,0.06)]">
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Name</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Role</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Department</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Face Data</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Registered</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wide text-[rgba(0,0,0,0.4)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[#fafaf2] transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-sm font-medium text-[rgba(0,0,0,0.88)]">
                    {emp.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[rgba(0,0,0,0.65)]">
                    {emp.role}
                  </td>
                  <td className="px-6 py-4 text-sm text-[rgba(0,0,0,0.65)]">
                    {emp.department}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block text-xs font-medium px-3 py-1 rounded-full"
                      style={
                        emp.face_descriptors?.length > 0
                          ? { background: "rgba(207,147,88,0.12)", color: "#9a6d2a" }
                          : { background: "rgba(138,58,52,0.08)", color: "#8a3a34" }
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
                      onClick={() => handleDeactivate(emp.id)}
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
