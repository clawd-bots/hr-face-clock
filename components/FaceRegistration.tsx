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

    // Capture photo on first capture
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
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Captures: {captures.length} / {requiredCaptures}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: requiredCaptures }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < captures.length ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{
                width: `${(captures.length / requiredCaptures) * 100}%`,
              }}
            />
          </div>
          {captures.length < requiredCaptures && (
            <button
              onClick={captureCurrentFace}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Capture Face ({captures.length + 1}/{requiredCaptures})
            </button>
          )}
          {captures.length > 0 && captures.length < requiredCaptures && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Move your head slightly between captures for better accuracy
            </p>
          )}
          {captures.length >= requiredCaptures && (
            <div className="text-center py-3 bg-green-50 rounded-lg text-green-700 font-medium">
              All captures complete!
            </div>
          )}
        </div>
      </FaceScanner>
    </div>
  );
}
