"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import TabNav from "@/components/TabNav";
import DocumentUpload from "@/components/DocumentUpload";
import { cachedFetch, invalidateCachePrefix } from "@/lib/swr-fetcher";
import type {
  Employee,
  EmergencyContact,
  Dependent,
  Education,
  WorkHistory,
  EmployeeDocument,
  Department,
} from "@/lib/types/database";

const TABS = [
  { key: "personal", label: "Personal" },
  { key: "employment", label: "Employment" },
  { key: "government", label: "Gov IDs" },
  { key: "documents", label: "Documents" },
];

const inputClass =
  "w-full h-10 px-3 bg-sw-cream-50 border border-sw-ink-200 rounded-xl text-sm text-sw-ink-900 placeholder:text-sw-ink-500 focus:outline-none focus:ring-2 focus:ring-[rgba(201, 151, 46, 0.22)] focus:border-sw-gold-500 transition-colors duration-150";

const labelClass = "block text-xs font-medium text-sw-ink-500 mb-1";

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkHistory[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [accountChecked, setAccountChecked] = useState(false);
  const [hasAccount, setHasAccount] = useState<string | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState("employee");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");

  // Expandable sections state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    contacts: false,
    dependents: false,
    education: false,
    history: false,
  });

  const toggleSection = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const fetchEmployee = useCallback(async () => {
    const res = await fetch(`/api/employees/${id}`);
    if (res.ok) setEmployee(await res.json());
  }, [id]);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await cachedFetch<Department[]>("/api/departments", { ttl: 300_000 });
      setDepartments(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  const fetchSubData = useCallback(async () => {
    const [c, d, e, w, doc] = await Promise.all([
      fetch(`/api/employees/${id}/contacts`).then((r) => r.json()),
      fetch(`/api/employees/${id}/dependents`).then((r) => r.json()),
      fetch(`/api/employees/${id}/education`).then((r) => r.json()),
      fetch(`/api/employees/${id}/work-history`).then((r) => r.json()),
      fetch(`/api/employees/${id}/documents`).then((r) => r.json()),
    ]);
    const contactsArr = Array.isArray(c) ? c : [];
    const dependentsArr = Array.isArray(d) ? d : [];
    const educationArr = Array.isArray(e) ? e : [];
    const workArr = Array.isArray(w) ? w : [];
    setContacts(contactsArr);
    setDependents(dependentsArr);
    setEducation(educationArr);
    setWorkHistory(workArr);
    setDocuments(Array.isArray(doc) ? doc : []);

    // Auto-expand any sub-section that has records on first load.
    setExpanded((prev) => ({
      contacts: prev.contacts || contactsArr.length > 0,
      dependents: prev.dependents || dependentsArr.length > 0,
      education: prev.education || educationArr.length > 0,
      history: prev.history || workArr.length > 0,
    }));
  }, [id]);

  const checkAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees/${id}/account-status`);
      if (res.ok) {
        const data = await res.json();
        setHasAccount(data.email || null);
      }
    } catch {
      // silently fail
    } finally {
      setAccountChecked(true);
    }
  }, [id]);

  const createAccount = async () => {
    setAccountLoading(true);
    setAccountMsg("");
    try {
      const res = await fetch(`/api/employees/${id}/create-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, password: accountPassword, role: accountRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccountMsg(`Account created for ${data.email}`);
      setShowCreateAccount(false);
      setHasAccount(data.email);
      setAccountEmail("");
      setAccountPassword("");
      setAccountRole("employee");
    } catch (err) {
      setAccountMsg(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
    fetchDepartments();
    fetchSubData();
    checkAccount();
  }, [fetchEmployee, fetchDepartments, fetchSubData, checkAccount]);

  const updateField = (field: string, value: string | null) => {
    if (!employee) return;
    setEmployee({ ...employee, [field]: value });
  };

  const saveEmployee = async () => {
    if (!employee) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      // Invalidate caches that depend on this employee so other pages
      // (employees list, dashboard) re-fetch instead of showing stale data.
      invalidateCachePrefix("/api/employees");
      setSuccess("Saved successfully");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sw-gold-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/employees")}
            className="text-sm font-medium text-sw-ink-500 hover:text-sw-ink-900"
          >
            ← Employees
          </button>
          <div>
            <h1 className="t-display">
              {employee.first_name ? `${employee.first_name} ${employee.last_name ?? ""}`.trim() : employee.name}
            </h1>
            <p className="text-sm text-sw-ink-500">
              {employee.position_title || employee.role || "No position"} ·{" "}
              {employee.employee_number || "No ID"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {accountMsg && (
            <span className={`text-sm font-medium ${accountMsg.startsWith("Account created") ? "text-sw-gold-600" : "text-sw-danger-500"}`}>{accountMsg}</span>
          )}
          {success && (
            <span className="text-sm font-medium text-sw-gold-600">{success}</span>
          )}
          {error && (
            <span className="text-sm font-medium text-sw-danger-500">{error}</span>
          )}
          {accountChecked && (
            hasAccount ? (
              <span className="text-xs text-sw-ink-500 border border-sw-ink-100 rounded-full px-3 py-1.5">
                Login: {hasAccount}
              </span>
            ) : (
              <button
                onClick={() => {
                  setShowCreateAccount(true);
                  setAccountEmail(employee.work_email || employee.personal_email || "");
                }}
                className="h-10 px-4 rounded-full text-sm font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-[var(--color-sw-ink-100)] transition-colors"
              >
                Create Account
              </button>
            )
          )}
          <button
            onClick={saveEmployee}
            disabled={saving}
            className="h-10 px-6 rounded-full text-sm font-medium text-[#ffffff] disabled:opacity-50"
            style={{ background: "var(--color-sw-gold-500)" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Personal Info */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="First Name" value={employee.first_name} onChange={(v) => updateField("first_name", v)} />
            <Field label="Middle Name" value={employee.middle_name} onChange={(v) => updateField("middle_name", v)} />
            <Field label="Last Name" value={employee.last_name} onChange={(v) => updateField("last_name", v)} />
            <Field label="Suffix" value={employee.suffix} onChange={(v) => updateField("suffix", v)} />
            <SelectField
              label="Gender"
              value={employee.gender}
              onChange={(v) => updateField("gender", v)}
              options={[
                { value: "", label: "—" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
            <Field label="Date of Birth" value={employee.date_of_birth} onChange={(v) => updateField("date_of_birth", v)} type="date" />
            <SelectField
              label="Civil Status"
              value={employee.civil_status}
              onChange={(v) => updateField("civil_status", v)}
              options={[
                { value: "", label: "—" },
                { value: "single", label: "Single" },
                { value: "married", label: "Married" },
                { value: "widowed", label: "Widowed" },
                { value: "separated", label: "Separated" },
              ]}
            />
            <Field label="Nationality" value={employee.nationality} onChange={(v) => updateField("nationality", v)} />
            <Field label="Phone" value={employee.phone} onChange={(v) => updateField("phone", v)} />
            <Field label="Personal Email" value={employee.personal_email} onChange={(v) => updateField("personal_email", v)} type="email" />
            <Field label="Work Email" value={employee.work_email} onChange={(v) => updateField("work_email", v)} type="email" />
          </div>

          {/* Address */}
          <ExpandableSection title="Address" defaultOpen>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Address Line 1" value={employee.address_line1} onChange={(v) => updateField("address_line1", v)} />
              <Field label="Address Line 2" value={employee.address_line2} onChange={(v) => updateField("address_line2", v)} />
              <Field label="City" value={employee.city} onChange={(v) => updateField("city", v)} />
              <Field label="Province" value={employee.province} onChange={(v) => updateField("province", v)} />
              <Field label="Zip Code" value={employee.zip_code} onChange={(v) => updateField("zip_code", v)} />
            </div>
          </ExpandableSection>

          {/* Emergency Contacts */}
          <ExpandableSection
            title="Emergency Contacts"
            count={contacts.length}
            open={expanded.contacts}
            onToggle={() => toggleSection("contacts")}
          >
            <SubTableSection
              items={contacts}
              fields={[
                { key: "name", label: "Name", required: true },
                { key: "relationship", label: "Relationship", required: true },
                { key: "phone", label: "Phone", required: true },
                { key: "address", label: "Address" },
              ]}
              onAdd={async (item) => {
                await fetch(`/api/employees/${id}/contacts`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(item),
                });
                fetchSubData();
              }}
              onDelete={async (itemId) => {
                await fetch(`/api/employees/${id}/contacts?contactId=${itemId}`, { method: "DELETE" });
                fetchSubData();
              }}
              emptyText="No emergency contacts"
            />
          </ExpandableSection>

          {/* Dependents */}
          <ExpandableSection
            title="Dependents"
            count={dependents.length}
            open={expanded.dependents}
            onToggle={() => toggleSection("dependents")}
          >
            <SubTableSection
              items={dependents}
              fields={[
                { key: "name", label: "Name", required: true },
                { key: "relationship", label: "Relationship", required: true, options: ["Spouse", "Child", "Parent", "Sibling", "Other"] },
                { key: "date_of_birth", label: "Date of Birth", type: "date" },
              ]}
              onAdd={async (item) => {
                await fetch(`/api/employees/${id}/dependents`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(item),
                });
                fetchSubData();
              }}
              onDelete={async (itemId) => {
                await fetch(`/api/employees/${id}/dependents?dependentId=${itemId}`, { method: "DELETE" });
                fetchSubData();
              }}
              emptyText="No dependents"
            />
          </ExpandableSection>

          {/* Education */}
          <ExpandableSection
            title="Education"
            count={education.length}
            open={expanded.education}
            onToggle={() => toggleSection("education")}
          >
            <SubTableSection
              items={education}
              fields={[
                { key: "level", label: "Level", required: true, options: ["Elementary", "High School", "Vocational", "College", "Post Graduate"] },
                { key: "school_name", label: "School", required: true },
                { key: "degree", label: "Degree" },
                { key: "field_of_study", label: "Field of Study" },
                { key: "year_graduated", label: "Year Graduated", type: "number" },
              ]}
              onAdd={async (item) => {
                await fetch(`/api/employees/${id}/education`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(item),
                });
                fetchSubData();
              }}
              onDelete={async (itemId) => {
                await fetch(`/api/employees/${id}/education?educationId=${itemId}`, { method: "DELETE" });
                fetchSubData();
              }}
              emptyText="No education records"
            />
          </ExpandableSection>

          {/* Work History */}
          <ExpandableSection
            title="Work History"
            count={workHistory.length}
            open={expanded.history}
            onToggle={() => toggleSection("history")}
          >
            <SubTableSection
              items={workHistory}
              fields={[
                { key: "company_name", label: "Company", required: true },
                { key: "position", label: "Position", required: true },
                { key: "start_date", label: "Start Date", type: "date" },
                { key: "end_date", label: "End Date", type: "date" },
                { key: "reason_for_leaving", label: "Reason for Leaving" },
              ]}
              onAdd={async (item) => {
                await fetch(`/api/employees/${id}/work-history`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(item),
                });
                fetchSubData();
              }}
              onDelete={async (itemId) => {
                await fetch(`/api/employees/${id}/work-history?historyId=${itemId}`, { method: "DELETE" });
                fetchSubData();
              }}
              emptyText="No work history"
            />
          </ExpandableSection>
        </div>
      )}

      {/* Employment */}
      {activeTab === "employment" && (
        <div className="grid grid-cols-3 gap-4">
          <Field label="Employee Number" value={employee.employee_number} onChange={(v) => updateField("employee_number", v)} />
          <Field label="Position Title" value={employee.position_title} onChange={(v) => updateField("position_title", v)} />
          <SelectField
            label="Department"
            value={employee.department_id}
            onChange={(v) => updateField("department_id", v)}
            options={[{ value: "", label: "None" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
          />
          <SelectField
            label="Employment Status"
            value={employee.employment_status}
            onChange={(v) => updateField("employment_status", v)}
            options={[
              { value: "", label: "—" },
              { value: "probationary", label: "Probationary" },
              { value: "extended_proby", label: "Extended Probationary" },
              { value: "regular", label: "Regular" },
              { value: "contractual", label: "Contractual" },
              { value: "consultant", label: "Consultant" },
              { value: "intern", label: "Intern" },
              { value: "ic", label: "Independent Contractor" },
            ]}
          />
          <SelectField
            label="Pay Frequency"
            value={employee.pay_frequency}
            onChange={(v) => updateField("pay_frequency", v)}
            options={["", "monthly", "semi_monthly", "weekly", "daily"]}
          />
          <Field label="Work Location" value={employee.work_location} onChange={(v) => updateField("work_location", v)} />
          <Field label="Hire Date" value={employee.hire_date} onChange={(v) => updateField("hire_date", v)} type="date" />
          <Field label="Regularization Date" value={employee.regularization_date} onChange={(v) => updateField("regularization_date", v)} type="date" />
        </div>
      )}

      {/* Government IDs */}
      {activeTab === "government" && (
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <Field label="SSS Number" value={employee.sss_number} onChange={(v) => updateField("sss_number", v)} placeholder="00-0000000-0" />
          <Field label="TIN" value={employee.tin_number} onChange={(v) => updateField("tin_number", v)} placeholder="000-000-000-000" />
          <Field label="PhilHealth Number" value={employee.philhealth_number} onChange={(v) => updateField("philhealth_number", v)} placeholder="00-000000000-0" />
          <Field label="Pag-IBIG / HDMF" value={employee.pagibig_number} onChange={(v) => updateField("pagibig_number", v)} placeholder="0000-0000-0000" />
        </div>
      )}

      {/* Documents */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <DocumentUpload employeeId={id} onUploadComplete={fetchSubData} />
          {documents.length === 0 ? (
            <p className="text-sm text-sw-ink-500 text-center py-8">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-sw-ink-100"
                >
                  <div>
                    <p className="text-sm font-medium text-sw-ink-900">{doc.document_name}</p>
                    <p className="text-xs text-sw-ink-500">
                      {doc.document_type.replace("_", " ")} · {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ""} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/employees/${id}/documents/download?path=${encodeURIComponent(doc.file_path)}`);
                        if (res.ok) {
                          const { url } = await res.json();
                          window.open(url, "_blank");
                        }
                      }}
                      className="text-xs font-medium text-sw-gold-600 hover:text-[rgba(154,109,42,0.7)]"
                    >
                      View
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`/api/employees/${id}/documents?docId=${doc.id}`, { method: "DELETE" });
                        fetchSubData();
                      }}
                      className="text-xs font-medium text-sw-danger-500 hover:text-[rgba(138,58,52,0.7)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="glass-modal rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-sw-ink-900 mb-1">Create Login Account</h3>
            <p className="text-sm text-sw-ink-500 mb-5">
              Create a login for {employee.first_name ? `${employee.first_name} ${employee.last_name ?? ""}`.trim() : employee.name}
            </p>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="employee@company.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="text"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={accountRole}
                  onChange={(e) => setAccountRole(e.target.value)}
                  className={inputClass}
                >
                  <option value="employee">Employee</option>
                  <option value="department_manager">Department Manager</option>
                  <option value="payroll_officer">Payroll Officer</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="company_admin">Company Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateAccount(false); setAccountMsg(""); }}
                className="h-10 px-4 rounded-full text-sm font-medium text-sw-ink-500 border border-sw-ink-200"
              >
                Cancel
              </button>
              <button
                onClick={createAccount}
                disabled={accountLoading || !accountEmail || !accountPassword}
                className="h-10 px-5 rounded-full text-sm font-medium text-[#ffffff] disabled:opacity-50"
                style={{ background: "var(--color-sw-gold-500)" }}
              >
                {accountLoading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Expandable Section ---

function ExpandableSection({
  title,
  count,
  open,
  onToggle,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  open?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const isOpen = open !== undefined ? open : internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen((p) => !p));

  return (
    <div className="border border-sw-ink-100 rounded-2xl bg-white overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-sw-cream-25 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-sw-ink-900">{title}</span>
          {count !== undefined && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-semibold bg-[var(--color-sw-gold-50)] text-sw-gold-600">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-sw-ink-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-sw-ink-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// --- Reusable field components ---

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string | null | undefined; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.value;
          const l = typeof opt === "string" ? (opt || "\u2014") : opt.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

// --- Generic sub-table section ---

type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
  options?: string[];
};

function SubTableSection({
  items,
  fields,
  onAdd,
  onDelete,
  emptyText,
}: {
  items: Record<string, unknown>[];
  fields: FieldDef[];
  onAdd: (item: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyText: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    await onAdd(formData);
    setFormData({});
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div>
      {items.length === 0 && !showForm && (
        <p className="text-sm text-sw-ink-500 text-center py-4">{emptyText}</p>
      )}

      {items.map((item) => (
        <div
          key={item.id as string}
          className="flex items-center justify-between p-3 rounded-xl bg-sw-cream-50 border border-sw-ink-100 mb-2"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {fields.map((f) => (
              <div key={f.key}>
                <span className="text-xs text-sw-ink-500">{f.label}: </span>
                <span className="text-sm text-sw-ink-900">
                  {(item[f.key] as string) || "\u2014"}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onDelete(item.id as string)}
            className="text-xs font-medium text-sw-danger-500 hover:text-[rgba(138,58,52,0.7)] ml-4 shrink-0"
          >
            Delete
          </button>
        </div>
      ))}

      {showForm ? (
        <div className="p-4 rounded-2xl bg-sw-cream-50 border border-sw-ink-100 mt-3">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {fields.map((f) =>
              f.options ? (
                <div key={f.key}>
                  <label className={labelClass}>{f.label}</label>
                  <select
                    value={formData[f.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div key={f.key}>
                  <label className={labelClass}>{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={formData[f.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="h-9 px-4 rounded-lg text-sm font-medium text-[#ffffff] disabled:opacity-50"
              style={{ background: "var(--color-sw-gold-500)" }}
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormData({}); }}
              className="h-9 px-4 rounded-lg text-sm font-medium text-sw-ink-500 border border-sw-ink-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 h-9 px-4 rounded-lg text-sm font-medium text-sw-gold-600 border border-[var(--color-sw-gold-100)] hover:bg-[rgba(255,198,113,0.1)] transition-colors duration-150"
        >
          + Add
        </button>
      )}
    </div>
  );
}
