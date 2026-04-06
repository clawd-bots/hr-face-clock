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

        // Reset after 5 seconds
        setTimeout(() => {
          setResult(null);
          setSelectedAction(null);
          cooldownRef.current = false;
        }, 5000);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div
          className={`text-center p-12 rounded-2xl max-w-lg w-full ${
            result.action === "clock_in"
              ? "bg-green-900/50 border-2 border-green-500"
              : "bg-blue-900/50 border-2 border-blue-500"
          }`}
        >
          <div className="text-6xl mb-4">
            {result.action === "clock_in" ? "👋" : "🏠"}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {result.employeeName}
          </h2>
          <p
            className={`text-xl font-semibold mb-1 ${
              result.action === "clock_in" ? "text-green-400" : "text-blue-400"
            }`}
          >
            {result.action === "clock_in" ? "Clocked In" : "Clocked Out"}
          </p>
          <p className="text-4xl font-mono text-white my-4">{result.time}</p>
          {result.hoursWorked && (
            <p className="text-gray-400">
              Hours today: {result.hoursWorked.toFixed(1)}h
            </p>
          )}
          <div className="mt-6 text-gray-500 text-sm">
            Returning to home...
          </div>
        </div>
      </div>
    );
  }

  // Action selection screen
  if (!selectedAction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-6">
        <h1 className="text-4xl font-bold text-white mb-3">HR Face Clock</h1>
        <p className="text-gray-400 mb-12">Select an action to begin</p>
        {error && (
          <div className="mb-6 px-4 py-2 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-6">
          <button
            onClick={() => handleSelectAction("clock_in")}
            className="group w-56 h-56 rounded-2xl bg-green-900/30 border-2 border-green-700 hover:border-green-400 hover:bg-green-900/50 transition-all flex flex-col items-center justify-center gap-4"
          >
            <span className="text-5xl">👋</span>
            <span className="text-2xl font-bold text-green-400 group-hover:text-green-300">
              Clock In
            </span>
          </button>
          <button
            onClick={() => handleSelectAction("clock_out")}
            className="group w-56 h-56 rounded-2xl bg-blue-900/30 border-2 border-blue-700 hover:border-blue-400 hover:bg-blue-900/50 transition-all flex flex-col items-center justify-center gap-4"
          >
            <span className="text-5xl">🏠</span>
            <span className="text-2xl font-bold text-blue-400 group-hover:text-blue-300">
              Clock Out
            </span>
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-12">
          {employees.length} employees registered
        </p>
      </div>
    );
  }

  // Face scanning screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors text-sm"
        >
          Back
        </button>
        <h1 className="text-3xl font-bold text-white">
          {selectedAction === "clock_in" ? (
            <span className="text-green-400">Clock In</span>
          ) : (
            <span className="text-blue-400">Clock Out</span>
          )}
        </h1>
      </div>
      <p className="text-gray-400 mb-6">Look at the camera to scan your face</p>
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
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
        <div className="mt-4 flex items-center gap-2 text-blue-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
          Processing...
        </div>
      )}
    </div>
  );
}
