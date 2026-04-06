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
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[rgba(0,0,0,0.65)]">
              Captures: {captures.length} / {requiredCaptures}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: requiredCaptures }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-colors duration-150"
                  style={{ background: i < captures.length ? "#cf9358" : "rgba(0,0,0,0.1)" }}
                />
              ))}
            </div>
          </div>
          <div className="w-full bg-[#f4f1e6] rounded-full h-2 mb-5">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(captures.length / requiredCaptures) * 100}%`,
                background: "linear-gradient(to right, #ffc671, #cf9358)",
              }}
            />
          </div>
          {captures.length < requiredCaptures && (
            <button
              onClick={captureCurrentFace}
              className="w-full h-12 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
              style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
            >
              Capture Face ({captures.length + 1}/{requiredCaptures})
            </button>
          )}
          {captures.length > 0 && captures.length < requiredCaptures && (
            <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] mt-2 text-center">
              Move your head slightly between captures for better accuracy
            </p>
          )}
          {captures.length >= requiredCaptures && (
            <div className="text-center py-3 rounded-2xl text-sm font-medium bg-[rgba(207,147,88,0.12)] text-[#9a6d2a]">
              All captures complete!
            </div>
          )}
        </div>
      </FaceScanner>
    </div>
  );
}
