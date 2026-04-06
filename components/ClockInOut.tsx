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

      const match = findBestMatch(descriptor, employees);
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
      <div className="min-h-screen flex items-center justify-center bg-andyou-cream">
        <div
          className="text-center p-spacing-andyou-12 rounded-andyou-lg max-w-lg w-full shadow-andyou-card-md"
          style={{
            background: isIn
              ? "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)"
              : "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
            border: `2px solid ${isIn ? "#cf9358" : "#5c8cb5"}`,
          }}
        >
          <div className="text-andyou-heading-display-primary mb-spacing-andyou-2" style={{ color: isIn ? "#cf9358" : "#5c8cb5" }}>
            {isIn ? "Welcome" : "Goodbye"}
          </div>
          <h2 className="text-andyou-heading-h1-primary text-andyou-text-primary mb-spacing-andyou-2">
            {result.employeeName}
          </h2>
          <p
            className="text-andyou-heading-h3-primary mb-spacing-andyou-1"
            style={{ color: isIn ? "#cf9358" : "#5c8cb5" }}
          >
            {isIn ? "Clocked In" : "Clocked Out"}
          </p>
          <p className="text-andyou-heading-h1-primary text-andyou-text-primary font-andyou-mono my-spacing-andyou-6">
            {result.time}
          </p>
          {result.hoursWorked && (
            <p className="text-andyou-body text-andyou-text-secondary">
              Hours today: {result.hoursWorked.toFixed(1)}h
            </p>
          )}
          <div className="mt-spacing-andyou-6 text-andyou-body-sm text-andyou-text-muted">
            Returning to home...
          </div>
        </div>
      </div>
    );
  }

  // Action selection screen
  if (!selectedAction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-andyou-cream p-spacing-andyou-6">
        <h1 className="text-andyou-heading-h1-primary text-andyou-text-primary mb-spacing-andyou-2">
          HR Face Clock
        </h1>
        <p className="text-andyou-body text-andyou-text-secondary mb-spacing-andyou-12">
          Select an action to begin
        </p>
        {error && (
          <div className="mb-spacing-andyou-6 px-spacing-andyou-4 py-spacing-andyou-3 bg-andyou-warm-light border border-andyou-category-hair-loss/30 rounded-andyou-md text-andyou-body-sm" style={{ color: "#8a3a34" }}>
            {error}
          </div>
        )}
        <div className="flex gap-spacing-andyou-6">
          <button
            onClick={() => handleSelectAction("clock_in")}
            className="group w-56 h-56 rounded-andyou-lg shadow-andyou-card hover:shadow-andyou-card-md transition-all duration-andyou-normal ease-andyou-standard flex flex-col items-center justify-center gap-spacing-andyou-4 border-2"
            style={{
              background: "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
              borderColor: "rgba(207, 147, 88, 0.3)",
            }}
          >
            <span className="text-[56px] leading-none">👋</span>
            <span className="text-andyou-heading-h2-primary" style={{ color: "#cf9358" }}>
              Clock In
            </span>
          </button>
          <button
            onClick={() => handleSelectAction("clock_out")}
            className="group w-56 h-56 rounded-andyou-lg shadow-andyou-card hover:shadow-andyou-card-md transition-all duration-andyou-normal ease-andyou-standard flex flex-col items-center justify-center gap-spacing-andyou-4 border-2"
            style={{
              background: "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
              borderColor: "rgba(92, 140, 181, 0.3)",
            }}
          >
            <span className="text-[56px] leading-none">🏠</span>
            <span className="text-andyou-heading-h2-primary" style={{ color: "#5c8cb5" }}>
              Clock Out
            </span>
          </button>
        </div>
        <p className="text-andyou-body-sm text-andyou-text-muted mt-spacing-andyou-12">
          {employees.length} employees registered
        </p>
      </div>
    );
  }

  // Face scanning screen
  const isIn = selectedAction === "clock_in";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-andyou-cream p-spacing-andyou-6">
      <div className="flex items-center gap-spacing-andyou-4 mb-spacing-andyou-6">
        <button
          onClick={handleBack}
          className="px-spacing-andyou-4 py-spacing-andyou-2 text-andyou-body-sm text-andyou-text-secondary border border-andyou-border-default hover:border-andyou-border-strong rounded-andyou-full transition-colors duration-andyou-fast"
        >
          Back
        </button>
        <h1
          className="text-andyou-heading-h2-primary"
          style={{ color: isIn ? "#cf9358" : "#5c8cb5" }}
        >
          {isIn ? "Clock In" : "Clock Out"}
        </h1>
      </div>
      <p className="text-andyou-body text-andyou-text-secondary mb-spacing-andyou-6">
        Look at the camera to scan your face
      </p>
      {error && (
        <div className="mb-spacing-andyou-4 px-spacing-andyou-4 py-spacing-andyou-2 bg-andyou-warm-light border border-andyou-category-hair-loss/30 rounded-andyou-md text-andyou-body-sm" style={{ color: "#8a3a34" }}>
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
        <div className="mt-spacing-andyou-4 flex items-center gap-spacing-andyou-2" style={{ color: "#cf9358" }}>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-andyou-accent" />
          Processing...
        </div>
      )}
    </div>
  );
}
