"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import FaceScanner from "./FaceScanner";
import { findBestMatch } from "@/lib/face-recognition";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { LogIn, LogOut } from "@/components/ui/icons";
import type { Employee } from "@/lib/supabase";

type ClockAction = "clock_in" | "clock_out";

type ClockResult = {
  action: ClockAction;
  employeeName: string;
  time: string;
  hoursWorked?: number;
};

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
      {message}
    </div>
  );
}

export default function ClockInOut() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAction, setSelectedAction] = useState<ClockAction | null>(null);
  const [result, setResult] = useState<ClockResult | null>(null);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [paired, setPaired] = useState<boolean | null>(null);
  const [deviceName, setDeviceName] = useState<string>("");
  const cooldownRef = useRef(false);

  // Verify the device is paired before loading employees.
  useEffect(() => {
    fetch("/api/kiosk/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (!data.paired) {
          router.replace("/kiosk/pair");
          return;
        }
        setPaired(true);
        setDeviceName(data.device?.name ?? "");
        return fetch("/api/employees")
          .then((r) => r.json())
          .then((emps) => {
            if (Array.isArray(emps)) setEmployees(emps);
            else setError("Failed to load employees");
          });
      })
      .catch(() => setError("Failed to verify device"));
  }, [router]);

  const handleFaceDetected = useCallback(
    async (descriptor: Float32Array) => {
      if (cooldownRef.current || processing || employees.length === 0 || !selectedAction) return;

      const mappedEmployees = employees.map((emp) => ({
        ...emp,
        name: emp.name || [emp.first_name, emp.last_name].filter(Boolean).join(" ") || "Unknown",
      }));
      const match = findBestMatch(descriptor, mappedEmployees as { id: string; name: string; face_descriptors: number[][] }[]);
      if (!match.employee) return;

      cooldownRef.current = true;
      setProcessing(true);
      setScanning(false);
      setError("");

      try {
        const res = await fetch("/api/time-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: match.employee.id,
            action: selectedAction,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setResult({
          action: selectedAction,
          employeeName: match.employee.name,
          time: formatTime(
            selectedAction === "clock_in" ? data.log.clock_in : data.log.clock_out
          ),
          hoursWorked: data.log.hours_worked,
        });

        setTimeout(() => {
          setResult(null);
          setSelectedAction(null);
          cooldownRef.current = false;
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setScanning(true);
        setTimeout(() => {
          cooldownRef.current = false;
        }, 3000);
      } finally {
        setProcessing(false);
      }
    },
    [employees, processing, selectedAction]
  );

  const handleSelectAction = (action: ClockAction) => {
    setSelectedAction(action);
    setScanning(true);
    setError("");
  };

  const handleBack = () => {
    setSelectedAction(null);
    setScanning(false);
    setError("");
  };

  if (result) {
    const isIn = result.action === "clock_in";
    const tone = isIn ? "bg-sw-gold-500 text-sw-white" : "bg-sw-lilac-500 text-sw-white";
    return (
      <div className="min-h-screen flex items-center justify-center bg-sw-cream-50 p-6">
        <div className={`text-center p-12 rounded-sw-xl max-w-lg w-full shadow-sw-2 ${tone}`}>
          <div className="t-h3 mb-2 opacity-90">{isIn ? "Welcome" : "Goodbye"}</div>
          <h2 className="t-display mb-2 text-current">{result.employeeName}</h2>
          <p className="text-sw-body-lg font-medium mb-6 opacity-90">
            {isIn ? "Clocked In" : "Clocked Out"}
          </p>
          <p className="t-display text-current my-6" style={{ fontVariantNumeric: "tabular-nums" }}>
            {result.time}
          </p>
          {result.hoursWorked && (
            <p className="t-body opacity-80">
              Hours today: {result.hoursWorked.toFixed(1)}h
            </p>
          )}
          <div className="mt-6 text-sw-caption font-medium opacity-70">
            Returning to home...
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sw-cream-50 p-6">
        <h1 className="t-display mb-2">Sweldo HR</h1>
        <p className="t-body text-sw-ink-500 mb-10">Select an action to begin</p>
        {error && <div className="mb-6"><ErrorBanner message={error} /></div>}
        <div className="flex gap-4">
          <button
            onClick={() => handleSelectAction("clock_in")}
            className="group w-56 h-56 rounded-sw-xl bg-sw-gold-500 text-sw-white shadow-sw-1 hover:shadow-sw-2 transition-shadow duration-sw-fast flex flex-col items-center justify-center gap-4"
          >
            <LogIn className="w-12 h-12 stroke-[1.5]" strokeWidth={1.5} />
            <span className="t-h3 text-sw-white">Clock In</span>
          </button>
          <button
            onClick={() => handleSelectAction("clock_out")}
            className="group w-56 h-56 rounded-sw-xl bg-sw-cream-50 text-sw-ink-900 border border-sw-ink-200 shadow-sw-1 hover:shadow-sw-2 transition-shadow duration-sw-fast flex flex-col items-center justify-center gap-4"
          >
            <LogOut className="w-12 h-12" strokeWidth={1.5} />
            <span className="t-h3">Clock Out</span>
          </button>
        </div>
      </div>
    );
  }

  const isIn = selectedAction === "clock_in";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sw-cream-50 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" size="sm" onClick={handleBack}>
          Back
        </Button>
        <h1 className={`t-h3 ${isIn ? "text-sw-gold-600" : "text-sw-lilac-500"}`}>
          {isIn ? "Clock In" : "Clock Out"}
        </h1>
      </div>
      <p className="t-body text-sw-ink-500 mb-6">Look at the camera to scan your face</p>
      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      <div className="w-full max-w-xl">
        <FaceScanner
          onFaceDetected={handleFaceDetected}
          autoDetect={scanning}
          detectInterval={2000}
        />
      </div>
      {processing && (
        <div className="mt-4 flex items-center gap-2 text-sw-gold-600">
          <div className="animate-spin rounded-sw-full h-4 w-4 border-b-2 border-sw-gold-500" />
          <span className="text-sw-caption font-medium">Processing...</span>
        </div>
      )}
    </div>
  );
}
