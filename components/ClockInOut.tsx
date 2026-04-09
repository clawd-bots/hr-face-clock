"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import FaceScanner from "./FaceScanner";
import { findBestMatch } from "@/lib/face-recognition";
import { formatTime } from "@/lib/utils";
import type { Employee } from "@/lib/supabase";

type ClockAction = "clock_in" | "clock_out";

type ClockResult = {
  action: ClockAction;
  employeeName: string;
  time: string;
  hoursWorked?: number;
};

export default function ClockInOut() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedAction, setSelectedAction] = useState<ClockAction | null>(null);
  const [result, setResult] = useState<ClockResult | null>(null);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => setError("Failed to load employees"));
  }, []);

  const handleFaceDetected = useCallback(
    async (descriptor: Float32Array) => {
      if (cooldownRef.current || processing || employees.length === 0 || !selectedAction) return;

      // Map employees to include name fallback for face matching
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

  // Result screen
  if (result) {
    const isIn = result.action === "clock_in";
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf2]">
        <div
          className="text-center p-12 rounded-3xl max-w-lg w-full shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
          style={{
            background: "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
            border: `2px solid ${isIn ? "#cf9358" : "#5c8cb5"}`,
          }}
        >
          <div
            className="text-[52px] font-medium tracking-[-3.5px] leading-none mb-2"
            style={{ color: isIn ? "#cf9358" : "#5c8cb5" }}
          >
            {isIn ? "Welcome" : "Goodbye"}
          </div>
          <h2 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)] mb-2">
            {result.employeeName}
          </h2>
          <p
            className="text-xl font-medium tracking-[-1px] mb-1"
            style={{ color: isIn ? "#cf9358" : "#5c8cb5" }}
          >
            {isIn ? "Clocked In" : "Clocked Out"}
          </p>
          <p className="text-[44px] font-medium tracking-[-2px] text-[rgba(0,0,0,0.88)] font-mono my-6">
            {result.time}
          </p>
          {result.hoursWorked && (
            <p className="text-base text-[rgba(0,0,0,0.65)]">
              Hours today: {result.hoursWorked.toFixed(1)}h
            </p>
          )}
          <div className="mt-6 text-sm font-medium text-[rgba(0,0,0,0.4)]">
            Returning to home...
          </div>
        </div>
      </div>
    );
  }

  // Action selection screen
  if (!selectedAction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf2] p-6">
        <h1 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)] mb-2">
          &you HR System
        </h1>
        <p className="text-base text-[rgba(0,0,0,0.65)] mb-10">
          Select an action to begin
        </p>
        {error && (
          <div className="mb-6 px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
            {error}
          </div>
        )}
        <div className="flex gap-4">
          <button
            onClick={() => handleSelectAction("clock_in")}
            className="group w-56 h-56 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-all duration-300 flex flex-col items-center justify-center gap-4 border-2"
            style={{
              background: "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
              borderColor: "rgba(207, 147, 88, 0.3)",
            }}
          >
            <span className="text-[56px] leading-none">👋</span>
            <span className="text-[28px] font-medium tracking-[-1.75px] text-[#cf9358]">
              Clock In
            </span>
          </button>
          <button
            onClick={() => handleSelectAction("clock_out")}
            className="group w-56 h-56 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-all duration-300 flex flex-col items-center justify-center gap-4 border-2"
            style={{
              background: "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
              borderColor: "rgba(92, 140, 181, 0.3)",
            }}
          >
            <span className="text-[56px] leading-none">🏠</span>
            <span className="text-[28px] font-medium tracking-[-1.75px] text-[#5c8cb5]">
              Clock Out
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Face scanning screen
  const isIn = selectedAction === "clock_in";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf2] p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="px-4 py-2 text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.2)] rounded-full transition-colors duration-150"
        >
          Back
        </button>
        <h1
          className="text-[28px] font-medium tracking-[-1.75px]"
          style={{ color: isIn ? "#cf9358" : "#5c8cb5" }}
        >
          {isIn ? "Clock In" : "Clock Out"}
        </h1>
      </div>
      <p className="text-base text-[rgba(0,0,0,0.65)] mb-6">
        Look at the camera to scan your face
      </p>
      {error && (
        <div className="mb-4 px-4 py-2 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
          {error}
        </div>
      )}
      <div className="w-full max-w-xl">
        <FaceScanner
          onFaceDetected={handleFaceDetected}
          autoDetect={scanning}
          detectInterval={2000}
        />
      </div>
      {processing && (
        <div className="mt-4 flex items-center gap-2 text-[#cf9358]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ffc671]" />
          <span className="text-sm font-medium">Processing...</span>
        </div>
      )}
    </div>
  );
}
