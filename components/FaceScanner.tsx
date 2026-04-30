"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadModels, detectFace } from "@/lib/face-recognition";

type FaceScannerProps = {
  onFaceDetected?: (descriptor: Float32Array) => void;
  autoDetect?: boolean;
  detectInterval?: number;
  showOverlay?: boolean;
  children?: React.ReactNode;
};

export default function FaceScanner({
  onFaceDetected,
  autoDetect = false,
  detectInterval = 1500,
  showOverlay = true,
  children,
}: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [faceFound, setFaceFound] = useState(false);
  const [status, setStatus] = useState("Loading models...");
  const detectingRef = useRef(false);
  const onFaceDetectedRef = useRef(onFaceDetected);
  onFaceDetectedRef.current = onFaceDetected;

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        await loadModels();
        setStatus("Starting camera...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          setStatus("Ready");
        }
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : "Camera access denied"}`);
      }
    }

    init();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const runDetection = useCallback(async () => {
    if (!videoRef.current || detectingRef.current) return;
    detectingRef.current = true;
    try {
      const result = await detectFace(videoRef.current);
      if (result) {
        setFaceFound(true);
        onFaceDetectedRef.current?.(result.descriptor);

        if (canvasRef.current && videoRef.current && showOverlay) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const { x, y, width, height } = result.detection.box;
          ctx.strokeStyle = "#c9972e";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
        }
      } else {
        setFaceFound(false);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d")!;
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } finally {
      detectingRef.current = false;
    }
  }, [showOverlay]);

  useEffect(() => {
    if (!ready || !autoDetect) return;
    // Fire immediately — don't wait for the first interval tick.
    runDetection();
    const interval = setInterval(runDetection, detectInterval);
    return () => clearInterval(interval);
  }, [ready, autoDetect, detectInterval, runDetection]);

  return (
    <div className="relative">
      <div className="relative rounded-sw-xl overflow-hidden bg-sw-ink-900 shadow-sw-2">
        <video
          ref={videoRef}
          className="w-full max-w-[640px]"
          style={{ transform: "scaleX(-1)" }}
          playsInline
          muted
        />
        {showOverlay && (
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ transform: "scaleX(-1)" }}
          />
        )}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-sw-ink-900/80">
            <div className="text-center">
              <div className="animate-spin rounded-sw-full h-10 w-10 border-b-2 border-sw-gold-500 mx-auto mb-3" />
              <p className="text-sw-caption font-medium text-sw-white">{status}</p>
            </div>
          </div>
        )}
      </div>
      {ready && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-sw-full transition-colors duration-sw-fast ${
              faceFound ? "bg-sw-success-500" : "bg-sw-ink-200"
            }`}
          />
          <span className="text-sw-caption font-medium text-sw-ink-700">
            {faceFound ? "Face detected" : "No face detected"}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
