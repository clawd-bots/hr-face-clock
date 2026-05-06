"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import FaceScanner from "./FaceScanner";
import { findBestMatch, loadModels } from "@/lib/face-recognition";
import {
  buildClusters,
  findBestMatchV2,
  type EmployeeCluster,
} from "@/lib/face-recognition-v2";
import {
  analyzeLiveness,
  LIVENESS_REQUIRED_FRAMES,
  type LandmarkFrame,
} from "@/lib/liveness";
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
  // Sliding buffer of recent landmark frames for liveness analysis.
  const livenessBufferRef = useRef<LandmarkFrame[]>([]);
  const [livenessProgress, setLivenessProgress] = useState(0);
  // v2 cluster matcher state (shadow mode — computed but not acted on)
  const clustersRef = useRef<EmployeeCluster[]>([]);

  // Pre-load face-api models in the background so they're ready by the
  // time the user clicks Clock In / Out.
  useEffect(() => {
    loadModels().catch(() => {
      /* model loading errors will surface in FaceScanner */
    });
  }, []);

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
            if (Array.isArray(emps)) {
              setEmployees(emps);
              // Pre-compute v2 clusters from the same enrolled descriptors
              // so they're ready when the first detection fires.
              clustersRef.current = buildClusters(
                emps.map((e: Employee) => ({
                  id: e.id,
                  name:
                    e.name ||
                    [e.first_name, e.last_name].filter(Boolean).join(" ") ||
                    "Unknown",
                  face_descriptors: e.face_descriptors ?? [],
                }))
              );
            } else setError("Failed to load employees");
          });
      })
      .catch(() => setError("Failed to verify device"));
  }, [router]);

  const handleFaceDetected = useCallback(
    async (descriptor: Float32Array, landmarks: { x: number; y: number }[]) => {
      if (cooldownRef.current || processing || employees.length === 0 || !selectedAction) return;

      // Push to liveness buffer (sliding window of the last N frames)
      const buf = livenessBufferRef.current;
      buf.push({ points: landmarks, timestamp: Date.now() });
      if (buf.length > LIVENESS_REQUIRED_FRAMES) buf.shift();
      setLivenessProgress(buf.length);

      // Need full buffer before deciding anything
      if (buf.length < LIVENESS_REQUIRED_FRAMES) return;

      // Match against known employees using the latest descriptor.
      // v1 is the live matcher (acts on the result). v2 runs in the
      // background and we ship both to /api/face-match-shadow for
      // accuracy comparison.
      const mappedEmployees = employees.map((emp) => ({
        ...emp,
        name: emp.name || [emp.first_name, emp.last_name].filter(Boolean).join(" ") || "Unknown",
      }));
      const match = findBestMatch(
        descriptor,
        mappedEmployees as { id: string; name: string; face_descriptors: number[][] }[]
      );

      // v2 shadow match — fire-and-forget, can't block clock-in
      const matchV2 = findBestMatchV2(descriptor, clustersRef.current);

      if (!match.employee) {
        // Distinguish "ambiguous" (close to two people) from "no match" (just unknown)
        if (match.reason === "ambiguous") {
          setError("Match unclear — two profiles look similar. Please look directly at the camera and try again.");
        }
        // Otherwise stay silent and keep scanning
        return;
      }

      // Liveness check on the buffered frames
      const liveness = analyzeLiveness(buf);
      if (!liveness.pass) {
        // Drop the oldest frame and let the next detection re-evaluate.
        // Don't lock cooldown — we want to keep trying.
        setError(liveness.reason ?? "Liveness check failed");
        return;
      }

      // Both checks passed — commit the clock-in
      cooldownRef.current = true;
      livenessBufferRef.current = [];
      setLivenessProgress(0);
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
            // Include match telemetry so we can post-mortem any future
            // mis-identification by querying time_logs.
            match_distance: Number(match.distance.toFixed(4)),
            match_runner_up_distance: Number(match.runnerUpDistance.toFixed(4)),
            match_margin: Number(match.margin.toFixed(4)),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Shadow-log the v1 vs v2 comparison. Fire-and-forget; never blocks
        // the result render.
        void fetch("/api/face-match-shadow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            time_log_id: data.log?.id ?? null,
            v1_employee_id: match.employee.id,
            v1_distance: Number(match.distance.toFixed(4)),
            v1_runner_up_distance: Number(match.runnerUpDistance.toFixed(4)),
            v1_margin: Number(match.margin.toFixed(4)),
            v1_reason: "matched",
            v2_employee_id: matchV2.employee?.id ?? null,
            v2_score: Number(matchV2.score.toFixed(4)),
            v2_runner_up_score: Number(matchV2.runnerUpScore.toFixed(4)),
            v2_margin: Number(matchV2.margin.toFixed(4)),
            v2_reason: matchV2.reason ?? "matched",
          }),
        }).catch(() => {
          /* shadow log is best-effort */
        });

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
    // Fresh liveness buffer for each session
    livenessBufferRef.current = [];
    setLivenessProgress(0);
  };

  const handleBack = () => {
    setSelectedAction(null);
    setScanning(false);
    setError("");
    livenessBufferRef.current = [];
    setLivenessProgress(0);
  };

  if (result) {
    const isIn = result.action === "clock_in";
    const tone = isIn ? "bg-sw-gold-500 text-sw-white" : "bg-sw-lilac-500 text-sw-white";
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-sw-cream-50 px-4 py-6 sm:p-6">
        <div className={`text-center px-6 py-10 sm:px-12 sm:py-12 rounded-sw-xl max-w-lg w-full shadow-sw-2 ${tone}`}>
          <div className="text-base sm:text-lg font-medium mb-2 opacity-90">{isIn ? "Welcome" : "Goodbye"}</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 break-words text-current">{result.employeeName}</h2>
          <p className="text-base sm:text-lg font-medium mb-4 sm:mb-6 opacity-90">
            {isIn ? "Clocked In" : "Clocked Out"}
          </p>
          <p
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-current my-4 sm:my-6"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {result.time}
          </p>
          {result.hoursWorked && (
            <p className="text-sm sm:text-base opacity-80">
              Hours today: {result.hoursWorked.toFixed(1)}h
            </p>
          )}
          <div className="mt-5 sm:mt-6 text-xs sm:text-sm font-medium opacity-70">
            Returning to home...
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAction) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-sw-cream-50 px-4 py-6 sm:p-6">
        <div className="w-full max-w-md sm:max-w-3xl flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.5px] text-center mb-2">
            &you HR
          </h1>
          <p className="text-sm sm:text-base text-sw-ink-500 text-center mb-6 sm:mb-10">
            Select an action to begin
          </p>
          {error && (
            <div className="w-full mb-5 sm:mb-6">
              <ErrorBanner message={error} />
            </div>
          )}
          {/*
            Layout rules:
              • Default (narrow phones, portrait):  stack vertically, full-width tappable cards
              • >= 640px (sm) OR landscape phones:   side-by-side, fixed square buttons
            `landscape:` ensures phones held sideways get the row layout even below sm.
          */}
          <div className="w-full flex flex-col gap-5 sm:flex-row sm:gap-10 sm:justify-center landscape:flex-row landscape:gap-6 px-4 sm:px-8">
            <button
              onClick={() => handleSelectAction("clock_in")}
              className="group w-full h-32 landscape:h-28 landscape:flex-1 sm:w-64 sm:h-64 rounded-sw-xl bg-sw-gold-500 text-sw-white shadow-sw-1 active:scale-[0.98] hover:shadow-sw-2 transition-all duration-sw-fast flex flex-row landscape:flex-col sm:flex-col items-center justify-center gap-4 sm:gap-5 px-8 sm:px-0"
            >
              <LogIn className="w-10 h-10 sm:w-14 sm:h-14 shrink-0" strokeWidth={1.5} />
              <span className="text-xl sm:text-2xl font-semibold text-sw-white">Clock In</span>
            </button>
            <button
              onClick={() => handleSelectAction("clock_out")}
              className="group w-full h-32 landscape:h-28 landscape:flex-1 sm:w-64 sm:h-64 rounded-sw-xl bg-sw-cream-50 text-sw-ink-900 border border-sw-ink-200 shadow-sw-1 active:scale-[0.98] hover:shadow-sw-2 transition-all duration-sw-fast flex flex-row landscape:flex-col sm:flex-col items-center justify-center gap-4 sm:gap-5 px-8 sm:px-0"
            >
              <LogOut className="w-10 h-10 sm:w-14 sm:h-14 shrink-0" strokeWidth={1.5} />
              <span className="text-xl sm:text-2xl font-semibold">Clock Out</span>
            </button>
          </div>
          {deviceName && (
            <p className="mt-10 sm:mt-14 text-xs text-sw-ink-500/70">
              Device: <span className="font-medium">{deviceName}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  const isIn = selectedAction === "clock_in";
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-start sm:justify-center bg-sw-cream-50 px-4 py-6 sm:p-6">
      <div className="w-full max-w-xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between sm:justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="secondary" size="sm" onClick={handleBack}>
            Back
          </Button>
          <h1 className={`text-lg sm:text-2xl font-semibold ${isIn ? "text-sw-gold-600" : "text-sw-lilac-500"}`}>
            {isIn ? "Clock In" : "Clock Out"}
          </h1>
          {/* Spacer to balance flex on mobile */}
          <div className="w-[60px] sm:hidden" />
        </div>
        <p className="text-sm sm:text-base text-sw-ink-500 mb-4 sm:mb-6 text-center">
          Look at the camera and slightly turn your head
        </p>
        {error && (
          <div className="w-full mb-4">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="w-full">
          <FaceScanner
            onFaceDetected={handleFaceDetected}
            autoDetect={scanning}
            detectInterval={400}
          />
        </div>
        {scanning && livenessProgress > 0 && livenessProgress < LIVENESS_REQUIRED_FRAMES && !processing && (
          <div className="mt-4 w-full max-w-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-sw-ink-500">Verifying it&apos;s really you...</span>
              <span className="text-xs font-medium text-sw-ink-500 tabular-nums">
                {livenessProgress}/{LIVENESS_REQUIRED_FRAMES}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-sw-ink-100 overflow-hidden">
              <div
                className="h-full bg-sw-gold-500 transition-all duration-200"
                style={{ width: `${(livenessProgress / LIVENESS_REQUIRED_FRAMES) * 100}%` }}
              />
            </div>
          </div>
        )}
        {processing && (
          <div className="mt-4 flex items-center gap-2 text-sw-gold-600">
            <div className="animate-spin rounded-sw-full h-4 w-4 border-b-2 border-sw-gold-500" />
            <span className="text-xs sm:text-sm font-medium">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
