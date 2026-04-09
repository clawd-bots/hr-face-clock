"use client";

import { useState, useEffect } from "react";

type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  employee_number?: string;
  position_title?: string;
  gender?: string;
  date_of_birth?: string;
  civil_status?: string;
  nationality?: string;
  hire_date?: string;
  employment_status?: string;
  work_email?: string;
  phone?: string;
  personal_email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  province?: string;
  zip_code?: string;
  sss_number?: string;
  tin_number?: string;
  philhealth_number?: string;
  pagibig_number?: string;
  department?: { name: string };
};

function empName(e?: Employee | null): string {
  if (!e) return "";
  if (e.first_name) return `${e.first_name} ${e.last_name ?? ""}`.trim();
  return e.name ?? "";
}

export default function EmployeeProfilePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    phone: "",
    personal_email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    province: "",
    zip_code: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/employee/me");
        if (res.ok) {
          const data = await res.json();
          setEmployee(data);
          setForm({
            phone: data.phone ?? "",
            personal_email: data.personal_email ?? "",
            address_line1: data.address_line1 ?? "",
            address_line2: data.address_line2 ?? "",
            city: data.city ?? "",
            province: data.province ?? "",
            zip_code: data.zip_code ?? "",
          });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/employee/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setEmployee(data);
      setMessage("Saved successfully");
    } catch {
      setMessage("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-[rgba(0,0,0,0.4)] text-sm">Loading...</div>;
  }

  return (
    <div className="bg-mesh-profile">
      <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[rgba(0,0,0,0.88)] mb-8">
        My Profile
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info (read-only) */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-6">
          <h2 className="text-sm font-semibold text-[rgba(0,0,0,0.88)] mb-4">Personal Information</h2>
          <div className="space-y-3">
            {[
              ["Name", empName(employee)],
              ["Employee No.", employee?.employee_number],
              ["Position", employee?.position_title],
              ["Department", employee?.department?.name],
              ["Gender", employee?.gender],
              ["Date of Birth", employee?.date_of_birth],
              ["Civil Status", employee?.civil_status],
              ["Nationality", employee?.nationality],
              ["Hire Date", employee?.hire_date],
              ["Status", employee?.employment_status],
              ["Work Email", employee?.work_email],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-sm text-[rgba(0,0,0,0.5)]">{label}</span>
                <span className="text-sm text-[rgba(0,0,0,0.88)] font-medium">
                  {(value as string) || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Government IDs (read-only) */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-6">
          <h2 className="text-sm font-semibold text-[rgba(0,0,0,0.88)] mb-4">Government IDs</h2>
          <div className="space-y-3">
            {[
              ["SSS", employee?.sss_number],
              ["TIN", employee?.tin_number],
              ["PhilHealth", employee?.philhealth_number],
              ["Pag-IBIG", employee?.pagibig_number],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-sm text-[rgba(0,0,0,0.5)]">{label}</span>
                <span className="text-sm text-[rgba(0,0,0,0.88)] font-medium font-mono">
                  {(value as string) || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Address (editable) */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[rgba(0,0,0,0.88)] mb-4">
            Contact &amp; Address
            <span className="text-xs font-normal text-[rgba(0,0,0,0.4)] ml-2">editable</span>
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Personal Email</label>
              <input
                type="email"
                value={form.personal_email}
                onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Address Line 1</label>
              <input
                type="text"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Address Line 2</label>
              <input
                type="text"
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">Province</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1">ZIP Code</label>
              <input
                type="text"
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#ffc671]"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
