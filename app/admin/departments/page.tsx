"use client";

import { useState, useEffect, useCallback } from "react";
import type { Department } from "@/lib/types/database";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    const res = await fetch("/api/departments");
    if (res.ok) setDepartments(await res.json());
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    try {
      if (editId) {
        const res = await fetch("/api/departments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, name, code }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, code }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }

      setName("");
      setCode("");
      setEditId(null);
      setShowForm(false);
      fetchDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditId(dept.id);
    setName(dept.name);
    setCode(dept.code || "");
    setShowForm(true);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this department?")) return;
    await fetch(`/api/departments?id=${id}`, { method: "DELETE" });
    fetchDepartments();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-medium tracking-[-1.75px] text-[rgba(0,0,0,0.88)]">
          Departments
        </h1>
        <button
          onClick={() => {
            setEditId(null);
            setName("");
            setCode("");
            setShowForm(true);
          }}
          className="h-10 px-5 rounded-full text-sm font-medium text-[#61474c]"
          style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
        >
          + New Department
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-5 rounded-2xl bg-white border border-[rgba(0,0,0,0.1)] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-medium text-[rgba(0,0,0,0.88)] mb-3">
            {editId ? "Edit Department" : "New Department"}
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Department name"
              className="flex-1 h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
            />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code (optional)"
              className="w-32 h-10 px-3 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)]"
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="h-10 px-5 rounded-xl text-sm font-medium text-[#61474c] disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="h-10 px-4 rounded-xl text-sm font-medium text-[rgba(0,0,0,0.5)] border border-[rgba(0,0,0,0.1)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[rgba(0,0,0,0.1)] overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f4f1e6]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[rgba(0,0,0,0.5)] uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-[rgba(0,0,0,0.5)] uppercase tracking-wider">
                Code
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-[rgba(0,0,0,0.5)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,0,0,0.06)]">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-sm text-[rgba(0,0,0,0.4)]">
                  No departments yet
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-[#fafaf2] transition-colors duration-100">
                  <td className="px-5 py-3 text-sm font-medium text-[rgba(0,0,0,0.88)]">
                    {dept.name}
                  </td>
                  <td className="px-5 py-3 text-sm text-[rgba(0,0,0,0.5)]">
                    {dept.code || "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="text-xs font-medium text-[#9a6d2a] hover:text-[#cf9358] mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(dept.id)}
                      className="text-xs font-medium text-[#8a3a34] hover:text-[rgba(138,58,52,0.7)]"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
