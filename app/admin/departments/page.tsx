"use client";

import { useState, useEffect, useCallback } from "react";
import type { Department } from "@/lib/types/database";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Plus } from "@/components/ui/icons";

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

  const openNew = () => {
    setEditId(null);
    setName("");
    setCode("");
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="t-display">Departments</h1>
        <Button variant="primary" onClick={openNew}>
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Department
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 sw-panel p-6">
          <h3 className="t-h5 mb-4 text-sw-ink-900">
            {editId ? "Edit Department" : "New Department"}
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <Label>Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Department name"
              />
            </div>
            <div className="w-40">
              <Label>Code</Label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button variant="primary" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-sw-cream-25 border-b border-sw-ink-100">
              <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Name</th>
              <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500">Code</th>
              <th className="px-6 py-4 text-sw-micro font-medium uppercase tracking-wide text-sw-ink-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-sw-caption text-sw-ink-500">
                  No departments yet
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr
                  key={dept.id}
                  className="border-b border-sw-ink-100 last:border-0 hover:bg-sw-cream-25 transition-colors duration-sw-fast"
                >
                  <td className="px-6 py-4 text-sw-caption font-medium text-sw-ink-900">
                    {dept.name}
                  </td>
                  <td className="px-6 py-4 text-sw-caption text-sw-ink-700">
                    {dept.code || "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="text-sw-caption font-medium text-sw-gold-600 hover:underline mr-4 transition-colors duration-sw-fast"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(dept.id)}
                      className="text-sw-caption font-medium text-sw-danger-500 hover:underline transition-colors duration-sw-fast"
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
