"use client";

import { useState, useEffect, useCallback } from "react";

type Device = {
  id: string;
  name: string;
  description: string | null;
  ip_allowlist: string[] | null;
  paired_at: string | null;
  last_seen_at: string | null;
  last_seen_ip: string | null;
  revoked_at: string | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  created_at: string;
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusOf(d: Device): { label: string; cls: string } {
  if (d.revoked_at) return { label: "revoked", cls: "bg-[rgba(244,67,54,0.12)] text-sw-danger-500" };
  if (d.paired_at) return { label: "paired", cls: "bg-[rgba(76,175,80,0.12)] text-sw-success-500" };
  if (d.pairing_code) return { label: "awaiting pair", cls: "bg-[var(--color-sw-gold-50)] text-sw-gold-600" };
  return { label: "unknown", cls: "bg-[rgba(28,26,22,0.06)] text-sw-ink-500" };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", ip_allowlist: "" });
  const [submitting, setSubmitting] = useState(false);
  const [newDevice, setNewDevice] = useState<Device | null>(null);

  // IP edit modal
  const [editIPTarget, setEditIPTarget] = useState<Device | null>(null);
  const [editIPValue, setEditIPValue] = useState("");

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kiosk/devices");
      if (!res.ok) throw new Error("Failed to load devices");
      setDevices(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  async function handleCreate() {
    setSubmitting(true);
    setError("");
    try {
      const ipList = form.ip_allowlist
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/kiosk/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          ip_allowlist: ipList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewDevice(data);
      setShowModal(false);
      setForm({ name: "", description: "", ip_allowlist: "" });
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this device? It will need to be re-paired to be used again.")) return;
    await fetch(`/api/kiosk/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
    fetchDevices();
  }

  async function handleRegenerate(id: string) {
    const res = await fetch(`/api/kiosk/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate_code" }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewDevice(data);
      fetchDevices();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this device entry permanently?")) return;
    await fetch(`/api/kiosk/devices/${id}`, { method: "DELETE" });
    fetchDevices();
  }

  async function handleSaveIP() {
    if (!editIPTarget) return;
    const ipList = editIPValue.split(",").map((s) => s.trim()).filter(Boolean);
    await fetch(`/api/kiosk/devices/${editIPTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_allowlist: ipList }),
    });
    setEditIPTarget(null);
    setEditIPValue("");
    fetchDevices();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="t-display">Kiosk Devices</h1>
          <p className="text-sm text-sw-ink-500 mt-1">
            Pair physical devices (iPads, Macs) so they can clock employees in/out without a sign-in.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ background: "var(--color-sw-gold-500)" }}
        >
          New Device
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">Loading...</div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12 text-sw-ink-500 text-sm">
          No devices yet. Click &quot;New Device&quot; to create one.
        </div>
      ) : (
        <div className="glass-card overflow-hidden mt-6">
          <table className="glass-table w-full text-sm">
            <thead>
              <tr className="bg-sw-cream-25 border-b border-sw-ink-100">
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Name</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Status</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">IP Allowlist</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Paired</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Last Seen</th>
                <th className="text-left px-6 py-4 font-medium text-sw-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const st = statusOf(d);
                return (
                  <tr key={d.id} className="border-b border-sw-ink-100 hover:bg-sw-cream-25 transition-colors">
                    <td className="px-6 py-4 text-sw-ink-900 font-medium">
                      {d.name}
                      {d.description && <p className="text-xs text-sw-ink-500 mt-0.5">{d.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                      {d.pairing_code && !d.paired_at && (
                        <p className="text-xs font-mono text-sw-gold-600 mt-1">
                          Code: <span className="font-bold tracking-wider">{d.pairing_code}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sw-ink-700 text-xs">
                      {d.ip_allowlist && d.ip_allowlist.length > 0 ? d.ip_allowlist.join(", ") : "Any"}
                    </td>
                    <td className="px-6 py-4 text-sw-ink-700 text-xs">{fmtDate(d.paired_at)}</td>
                    <td className="px-6 py-4 text-sw-ink-700 text-xs">
                      {d.last_seen_at ? fmtDate(d.last_seen_at) : "—"}
                      {d.last_seen_ip && (
                        <p className="text-[10px] text-sw-ink-500 mt-0.5">{d.last_seen_ip}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { setEditIPTarget(d); setEditIPValue((d.ip_allowlist ?? []).join(", ")); }}
                          className="px-3 py-1 rounded-full text-xs font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-sw-cream-25"
                        >
                          IP
                        </button>
                        {!d.paired_at && !d.revoked_at && (
                          <button
                            onClick={() => handleRegenerate(d.id)}
                            className="px-3 py-1 rounded-full text-xs font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-sw-cream-25"
                          >
                            New Code
                          </button>
                        )}
                        {d.paired_at && !d.revoked_at && (
                          <button
                            onClick={() => handleRevoke(d.id)}
                            className="px-3 py-1 rounded-full text-xs font-medium text-white bg-[var(--color-sw-danger-500)]"
                          >
                            Revoke
                          </button>
                        )}
                        {d.revoked_at && (
                          <button
                            onClick={() => handleRegenerate(d.id)}
                            className="px-3 py-1 rounded-full text-xs font-medium text-sw-ink-700 border border-sw-ink-200 hover:bg-sw-cream-25"
                          >
                            Re-Pair
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="px-3 py-1 rounded-full text-xs font-medium text-sw-danger-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-4">New Kiosk Device</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Lobby iPad"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Reception, ground floor"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sw-ink-700 mb-1">IP Allowlist (optional)</label>
                  <input
                    type="text"
                    placeholder="203.0.113.42, 198.51.100.0/24"
                    value={form.ip_allowlist}
                    onChange={(e) => setForm({ ...form, ip_allowlist: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
                  />
                  <p className="text-xs text-sw-ink-500 mt-1">
                    Comma-separated IPs or CIDRs. Leave empty to allow any IP.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-sw-cream-25"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !form.name}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--color-sw-gold-500)" }}
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pairing code reveal modal */}
      {newDevice && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setNewDevice(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-1">Pairing Code</h2>
              <p className="text-sm text-sw-ink-500 mb-5">
                On the kiosk device, open <span className="font-mono">/kiosk/pair</span> and enter this code.
                It expires in 15 minutes and can only be used once.
              </p>
              <div className="bg-sw-cream-25 rounded-xl p-6 text-center mb-4">
                <p className="text-4xl font-mono font-bold tracking-[0.4em] text-sw-gold-600">
                  {newDevice.pairing_code}
                </p>
              </div>
              <button
                onClick={() => setNewDevice(null)}
                className="w-full h-10 rounded-full text-sm font-medium text-white"
                style={{ background: "var(--color-sw-gold-500)" }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit IP modal */}
      {editIPTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setEditIPTarget(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-sw-ink-900 mb-1">IP Allowlist</h2>
              <p className="text-sm text-sw-ink-500 mb-4">
                For <span className="font-medium">{editIPTarget.name}</span>. Comma-separated IPs or CIDRs. Empty = any IP.
              </p>
              <input
                type="text"
                value={editIPValue}
                onChange={(e) => setEditIPValue(e.target.value)}
                placeholder="203.0.113.42, 198.51.100.0/24"
                className="w-full h-10 px-3 rounded-xl border border-sw-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditIPTarget(null)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-sw-ink-700 hover:bg-sw-cream-25"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIP}
                  className="px-5 py-2 rounded-full text-sm font-medium text-white"
                  style={{ background: "var(--color-sw-gold-500)" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
