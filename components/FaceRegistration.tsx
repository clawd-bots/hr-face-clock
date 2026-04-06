"use client";

import { useState, useRef, useCallback } from "react";
import FaceScanner from "./FaceScanner";

type FaceRegistrationProps = {
  onComplete: (descriptors: number[][], photoDataUrl: string) => void;
  requiredCaptures?: number;
};

export default function FaceRegistration({
  onComplete,
  requiredCaptures = 5,
}: FaceRegistrationProps) {
  const [captures, setCaptures] = useState<number[][]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const lastDescriptor = useRef<Float32Array | null>(null);

  const handleFaceDetected = useCallback((descriptor: Float32Array) => {
    lastDescriptor.current = descriptor;
  }, []);

  const captureCurrentFace = () => {
    if (!lastDescriptor.current) return;
    const descriptorArray = Array.from(lastDescriptor.current);
    const newCaptures = [...captures, descriptorArray];
    setCaptures(newCaptures);

    if (newCaptures.length === 1) {
      const video = document.querySelector("video");
      if (video) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);
        setPhotoUrl(canvas.toDataURL("image/jpeg", 0.8));
      }
    }

    if (newCaptures.length >= requiredCaptures) {
      onComplete(newCaptures, photoUrl || "");
    }
  };

  return (
    <div>
      <FaceScanner onFaceDetected={handleFaceDetected} autoDetect showOverlay>
        <div className="mt-spacing-andyou-4">
          <div className="flex items-center justify-between mb-spacing-andyou-3">
            <span className="text-andyou-body-sm text-andyou-text-secondary">
              Captures: {captures.length} / {requiredCaptures}
            </span>
            <div className="flex gap-spacing-andyou-1">
              {Array.from({ length: requiredCaptures }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-colors duration-andyou-fast"
                  style={{ background: i < captures.length ? "#cf9358" : "rgba(0,0,0,0.1)" }}
                />
              ))}
            </div>
          </div>
          <div className="w-full bg-andyou-warm-light rounded-andyou-full h-2 mb-spacing-andyou-4">
            <div
              className="h-2 rounded-andyou-full transition-all duration-andyou-normal"
              style={{
                width: `${(captures.length / requiredCaptures) * 100}%`,
                background: "linear-gradient(to right, #ffc671, #cf9358)",
              }}
            />
          </div>
          {captures.length < requiredCaptures && (
            <button
              onClick={captureCurrentFace}
              className="w-full py-spacing-andyou-3 rounded-andyou-full text-andyou-ui-label text-andyou-accent-on transition-all duration-andyou-fast hover:shadow-andyou-card-md"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              Capture Face ({captures.length + 1}/{requiredCaptures})
            </button>
          )}
          {captures.length > 0 && captures.length < requiredCaptures && (
            <p className="text-andyou-ui-badge text-andyou-text-muted mt-spacing-andyou-2 text-center">
              Move your head slightly between captures for better accuracy
            </p>
          )}
          {captures.length >= requiredCaptures && (
            <div
              className="text-center py-spacing-andyou-3 rounded-andyou-md text-andyou-body-sm"
              style={{ background: "rgba(207, 147, 88, 0.12)", color: "#9a6d2a" }}
            >
              All captures complete!
            </div>
          )}
        </div>
      </FaceScanner>
    </div>
  );
}
