"use client";

import { useEffect, useState, useCallback } from "react";

type WhoamiResponse = {
  enabled: boolean;
  open_log: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    remote: boolean;
    clock_in_lat: number | null;
    clock_in_lng: number | null;
  } | null;
};

type Coords = { lat: number; lng: number; accuracy: number | null };

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser doesn't support location services."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location access denied. Please allow location in your browser settings to clock in remotely.",
          2: "Couldn't determine your location. Try moving to an area with better signal.",
          3: "Location request timed out. Please try again.",
        };
        reject(new Error(messages[err.code] ?? err.message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function RemoteClockCard() {
  const [state, setState] = useState<WhoamiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/me/remote-clock");
      if (res.ok) setState(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function clockAction(action: "clock_in" | "clock_out") {
    setError("");
    setSuccess("");
    setSubmitting(action === "clock_in" ? "in" : "out");
    try {
      const coords = await getPosition();
      const res = await fetch("/api/employee/me/remote-clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clock action failed");

      const time = fmtTime(
        action === "clock_in" ? data.log.clock_in : data.log.clock_out
      );
      setSuccess(
        action === "clock_in"
          ? `Clocked in at ${time}`
          : `Clocked out at ${time}${
              data.log.hours_worked
                ? ` · ${data.log.hours_worked.toFixed(1)}h worked`
                : ""
            }`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="sw-panel p-5">
        <div className="h-4 w-32 bg-sw-ink-100 rounded mb-3 animate-pulse" />
        <div className="h-10 w-full bg-sw-ink-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!state) return null;

  // Not enabled — keep the card hidden so it doesn't clutter the dashboard
  // for office-only employees.
  if (!state.enabled) return null;

  const isClockedIn = !!state.open_log;

  return (
    <div className="sw-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-sw-ink-900 mb-0.5">
            Remote Clock-In
          </h2>
          <p className="text-xs text-sw-ink-500">
            For field work or off-site days. Your location is recorded.
          </p>
        </div>
        {isClockedIn && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-[rgba(76,175,80,0.12)] text-sw-success-500">
              <span className="w-1.5 h-1.5 rounded-full bg-sw-success-500 animate-pulse" />
              Clocked in
            </span>
            <p className="text-[11px] text-sw-ink-500 mt-1 tabular-nums">
              Since {fmtTime(state.open_log!.clock_in)}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-medium bg-[rgba(244,67,54,0.08)] text-sw-danger-500 border border-[rgba(244,67,54,0.2)]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-medium bg-[rgba(76,175,80,0.1)] text-sw-success-500 border border-[rgba(76,175,80,0.2)]">
          ✓ {success}
        </div>
      )}

      <button
        onClick={() => clockAction(isClockedIn ? "clock_out" : "clock_in")}
        disabled={submitting !== null}
        className="w-full h-11 rounded-full text-sm font-medium text-white disabled:opacity-50 transition-opacity"
        style={{
          background: isClockedIn
            ? "var(--color-sw-danger-500)"
            : "var(--color-sw-gold-500)",
          color: isClockedIn ? "#fff" : "var(--color-sw-ink-900)",
        }}
      >
        {submitting === "in" && "Getting location..."}
        {submitting === "out" && "Clocking out..."}
        {!submitting && (isClockedIn ? "Clock Out" : "Clock In")}
      </button>

      <p className="text-[10px] text-sw-ink-500 mt-3 text-center">
        Allow location access when prompted
      </p>
    </div>
  );
}
