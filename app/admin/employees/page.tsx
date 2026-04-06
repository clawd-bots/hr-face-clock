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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-andyou-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-spacing-andyou-6">
        <h1 className="text-andyou-heading-h1-primary text-andyou-text-primary">Employees</h1>
        <Link
          href="/admin/employees/register"
          className="px-spacing-andyou-5 py-spacing-andyou-3 rounded-andyou-full text-andyou-ui-label text-andyou-accent-on transition-all duration-andyou-fast hover:shadow-andyou-card-md"
          style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
        >
          + Register Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-16 text-center">
          <p className="text-andyou-body text-andyou-text-muted mb-spacing-andyou-4">No employees registered yet.</p>
          <Link
            href="/admin/employees/register"
            className="text-andyou-body-sm hover:underline"
            style={{ color: "#9a6d2a" }}
          >
            Register your first employee
          </Link>
        </div>
      ) : (
        <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-andyou-warm-light border-b border-andyou-border-default">
                <th className="px-spacing-andyou-6 py-spacing-andyou-3 text-andyou-ui-label text-andyou-text-muted">Name</th>
                <th className="px-spacing-andyou-6 py-spacing-andyou-3 text-andyou-ui-label text-andyou-text-muted">Role</th>
                <th className="px-spacing-andyou-6 py-spacing-andyou-3 text-andyou-ui-label text-andyou-text-muted">Department</th>
                <th className="px-spacing-andyou-6 py-spacing-andyou-3 text-andyou-ui-label text-andyou-text-muted">Face Data</th>
                <th className="px-spacing-andyou-6 py-spacing-andyou-3 text-andyou-ui-label text-andyou-text-muted">Registered</th>
                <th className="px-spacing-andyou-6 py-spacing-andyou-3 text-andyou-ui-label text-andyou-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-andyou-border-default last:border-0 hover:bg-andyou-warm-light/50 transition-colors duration-andyou-fast"
                >
                  <td className="px-spacing-andyou-6 py-spacing-andyou-4 text-andyou-body-sm text-andyou-text-primary">
                    {emp.name}
                  </td>
                  <td className="px-spacing-andyou-6 py-spacing-andyou-4 text-andyou-body text-andyou-text-secondary">
                    {emp.role}
                  </td>
                  <td className="px-spacing-andyou-6 py-spacing-andyou-4 text-andyou-body text-andyou-text-secondary">
                    {emp.department}
                  </td>
                  <td className="px-spacing-andyou-6 py-spacing-andyou-4">
                    <span
                      className="inline-flex items-center gap-spacing-andyou-1 px-spacing-andyou-3 py-spacing-andyou-1 rounded-andyou-badge text-andyou-ui-badge"
                      style={
                        emp.face_descriptors?.length > 0
                          ? { background: "rgba(207, 147, 88, 0.15)", color: "#9a6d2a" }
                          : { background: "rgba(138, 58, 52, 0.1)", color: "#8a3a34" }
                      }
                    >
                      {emp.face_descriptors?.length || 0} captures
                    </span>
                  </td>
                  <td className="px-spacing-andyou-6 py-spacing-andyou-4 text-andyou-body text-andyou-text-muted">
                    {formatDate(emp.created_at)}
                  </td>
                  <td className="px-spacing-andyou-6 py-spacing-andyou-4">
                    <button
                      onClick={() => handleDeactivate(emp.id)}
                      className="text-andyou-ui-label transition-colors duration-andyou-fast hover:underline"
                      style={{ color: "#8a3a34" }}
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
