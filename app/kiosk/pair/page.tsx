"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KioskPairPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Pairing code must be 6 digits");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/kiosk/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairing_code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pairing failed");
      setSuccess(data.device?.name ?? "Device");
      setTimeout(() => router.replace("/"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pairing failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-sw-cream-50 flex items-center justify-center px-4 py-6 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.5px] text-sw-ink-900 mb-1">
          Pair this Kiosk
        </h1>
        <p className="text-sm text-sw-ink-500 mb-6">
          Ask an admin to generate a 6-digit pairing code from{" "}
          <span className="font-medium text-sw-ink-700">Admin → Devices</span>, then enter it below.
        </p>

        {success ? (
          <div className="px-4 py-3 bg-[rgba(76,175,80,0.12)] text-sw-success-500 rounded-xl text-sm font-medium">
            ✓ Paired as &ldquo;{success}&rdquo;. Redirecting...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-sw-ink-700 mb-1">
                Pairing code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full h-14 px-4 rounded-xl border border-sw-ink-200 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[var(--color-sw-gold-500)]"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full h-12 rounded-full text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-sw-gold-500)" }}
            >
              {submitting ? "Pairing..." : "Pair Device"}
            </button>
          </form>
        )}

        <p className="text-xs text-sw-ink-500 mt-6 text-center">
          Once paired, this device stays signed in until an admin revokes it.
        </p>
      </div>
    </div>
  );
}
