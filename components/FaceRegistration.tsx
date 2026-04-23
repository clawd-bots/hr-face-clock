"use client";

import { useState, useRef, useCallback } from "react";
import FaceScanner from "./FaceScanner";
import { Button } from "@/components/ui/Button";

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

  const progress = (captures.length / requiredCaptures) * 100;

  return (
    <div>
      <FaceScanner onFaceDetected={handleFaceDetected} autoDetect showOverlay>
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sw-caption font-medium text-sw-ink-700">
              Captures: {captures.length} / {requiredCaptures}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: requiredCaptures }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sw-full transition-colors duration-sw-fast ${
                    i < captures.length ? "bg-sw-gold-500" : "bg-sw-ink-200"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-full bg-sw-ink-100 rounded-sw-full h-2 mb-5">
            <div
              className="h-2 rounded-sw-full bg-sw-gold-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {captures.length < requiredCaptures && (
            <Button variant="primary" size="lg" className="w-full" onClick={captureCurrentFace}>
              Capture Face ({captures.length + 1}/{requiredCaptures})
            </Button>
          )}
          {captures.length > 0 && captures.length < requiredCaptures && (
            <p className="text-sw-micro font-medium text-sw-ink-500 mt-2 text-center">
              Move your head slightly between captures for better accuracy
            </p>
          )}
          {captures.length >= requiredCaptures && (
            <div className="text-center py-3 rounded-[12px] text-sw-caption font-medium bg-sw-success-100 text-[#1b7a43]">
              All captures complete!
            </div>
          )}
        </div>
      </FaceScanner>
    </div>
  );
}
