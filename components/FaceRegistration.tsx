"use client";

import { useState, useRef, useCallback } from "react";
import FaceScanner from "./FaceScanner";
import { Button } from "@/components/ui/Button";

type FaceRegistrationProps = {
  onComplete: (descriptors: number[][], photoDataUrl: string) => void;
  requiredCaptures?: number;
};

// Varied-prompt enrollment. Each capture should look slightly different
// from the previous so the resulting Gaussian cluster (v2 matcher)
// captures the employee's natural variance — lighting, angle, expression.
// Without this, all 5 captures are essentially identical and the cluster
// is too tight to absorb day-to-day variation (makeup, glasses, etc.).
const CAPTURE_PROMPTS: { title: string; hint: string }[] = [
  { title: "Look straight at the camera", hint: "Neutral face, eyes on the lens" },
  { title: "Smile naturally", hint: "Relaxed smile, mouth slightly open is fine" },
  { title: "Tilt your head slightly to the right", hint: "Just a small natural tilt — like you're listening" },
  { title: "Tilt your head slightly to the left", hint: "Mirror of the last one" },
  { title: "Look slightly up", hint: "Chin up about an inch, eyes still on the camera" },
  { title: "Look slightly down", hint: "Tuck your chin a little" },
  { title: "One more — natural expression", hint: "How you'll usually look at the kiosk" },
];

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
  const currentPromptIndex = Math.min(captures.length, CAPTURE_PROMPTS.length - 1);
  const currentPrompt = CAPTURE_PROMPTS[currentPromptIndex]!;

  return (
    <div>
      <FaceScanner onFaceDetected={handleFaceDetected} autoDetect showOverlay>
        <div className="mt-5">
          {/* Varied-prompt instruction */}
          {captures.length < requiredCaptures && (
            <div className="mb-4 px-4 py-3 rounded-[12px] bg-[var(--color-sw-gold-50)] border border-[var(--color-sw-gold-500)]/25">
              <p className="text-sw-caption font-semibold text-sw-gold-600">
                {currentPrompt.title}
              </p>
              <p className="text-sw-micro text-sw-ink-700 mt-0.5">
                {currentPrompt.hint}
              </p>
            </div>
          )}

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
              Capture ({captures.length + 1}/{requiredCaptures})
            </Button>
          )}
          {captures.length > 0 && captures.length < requiredCaptures && (
            <p className="text-sw-micro font-medium text-sw-ink-500 mt-2 text-center">
              Variation between captures = better recognition later (handles makeup, glasses, lighting changes).
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
