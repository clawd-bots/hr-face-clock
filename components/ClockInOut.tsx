"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import FaceScanner from "./FaceScanner";
import { findBestMatch } from "@/lib/face-recognition";
import { formatTime } from "@/lib/utils";
import type { Employee } from "@/lib/supabase";

type ClockResult = {
  action: "clock_in" | "clock_out";
  employeeName: string;
  time: string;
  hoursWorked?: number;
};

export default function ClockInOut() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [result, setResult] = useState<ClockResult | null>(null);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(true);
  const cooldownRef = useRef(false);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees)
      .catch(() => setError("Failed to load employees"));
  }, []);

  const handleFaceDetected = useCallback(
    async (descriptor: Float32Array) => {
      if (cooldownRef.current || processing || employees.length === 0) return;

      const match = findBestMatch(descriptor, employees);
      if (!match.employee) return;

      cooldownRef.current = true;
      setProcessing(true);
      setError("");

      try {
        // Determine action: check if they have an open clock-in today
        const today = new Date().toISOString().split("T")[0];
        const logsRes = await fetch(
          `/api/time-logs?date=${today}&employee_id=${match.employee.id}`
        );
        const logs = await logsRes.json();
        const openLog = Array.isArray(logs)
          ? logs.find((l: { clock_out: string | null }) => !l.clock_out)
          : null;
        const action = openLog ? "clock_out" : "clock_in";

        const res = await fetch("/api/time-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: match.employee.id,
            action,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setResult({
          action,
          employeeName: match.employee.name,
          time: formatTime(
            action === "clock_in" ? data.log.clock_in : data.log.clock_out
          ),
          hoursWorked: data.log.hours_worked,
        });
        setScanning(false);

        // Reset after 5 seconds
        setTimeout(() => {
          setResult(null);
          setScanning(true);
          cooldownRef.current = false;
        }, 5000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setTimeout(() => {
          cooldownRef.current = false;
        }, 3000);
      } finally {
        setProcessing(false);
      }
    },
    [employees, processing]
  );

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
            Returning to scanner...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-6">
      <h1 className="text-3xl font-bold text-white mb-2">
        Face Clock In / Out
      </h1>
      <p className="text-gray-400 mb-8">
        Look at the camera to clock in or out
      </p>
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
      <p className="text-gray-600 text-sm mt-6">
        {employees.length} employees registered
      </p>
    </div>
  );
}
