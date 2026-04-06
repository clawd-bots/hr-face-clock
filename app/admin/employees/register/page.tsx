"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FaceRegistration from "@/components/FaceRegistration";

export default function RegisterEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "face" | "saving">("info");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError("");
    setStep("face");
  };

  const handleFaceComplete = async (
    descriptors: number[][],
    photoDataUrl: string
  ) => {
    setStep("saving");
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          department,
          face_descriptors: descriptors,
          photo_url: photoDataUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register employee");
      }

      router.push("/admin/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setStep("face");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-andyou-heading-h1-primary text-andyou-text-primary mb-spacing-andyou-6">
        Register New Employee
      </h1>

      {/* Progress steps */}
      <div className="flex items-center gap-spacing-andyou-4 mb-spacing-andyou-8">
        <StepIndicator
          num={1}
          label="Details"
          active={step === "info"}
          done={step !== "info"}
        />
        <div className="flex-1 h-px bg-andyou-border-default" />
        <StepIndicator
          num={2}
          label="Face Scan"
          active={step === "face"}
          done={step === "saving"}
        />
        <div className="flex-1 h-px bg-andyou-border-default" />
        <StepIndicator num={3} label="Complete" active={step === "saving"} done={false} />
      </div>

      {error && (
        <div
          className="mb-spacing-andyou-4 p-spacing-andyou-3 bg-andyou-warm-light border rounded-andyou-md text-andyou-body-sm"
          style={{ borderColor: "rgba(138, 58, 52, 0.2)", color: "#8a3a34" }}
        >
          {error}
        </div>
      )}

      {step === "info" && (
        <form
          onSubmit={handleInfoSubmit}
          className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-6 space-y-spacing-andyou-4"
        >
          <div>
            <label className="block text-andyou-ui-label text-andyou-text-secondary mb-spacing-andyou-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-spacing-andyou-4 py-spacing-andyou-3 border border-andyou-border-default rounded-andyou-md text-andyou-body text-andyou-text-primary bg-andyou-white focus:border-andyou-accent focus:ring-2 focus:ring-andyou-accent/20 outline-none transition-colors duration-andyou-fast"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-andyou-ui-label text-andyou-text-secondary mb-spacing-andyou-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-spacing-andyou-4 py-spacing-andyou-3 border border-andyou-border-default rounded-andyou-md text-andyou-body text-andyou-text-primary bg-andyou-white focus:border-andyou-accent focus:ring-2 focus:ring-andyou-accent/20 outline-none transition-colors duration-andyou-fast"
              placeholder="Software Engineer"
            />
          </div>
          <div>
            <label className="block text-andyou-ui-label text-andyou-text-secondary mb-spacing-andyou-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-spacing-andyou-4 py-spacing-andyou-3 border border-andyou-border-default rounded-andyou-md text-andyou-body text-andyou-text-primary bg-andyou-white focus:border-andyou-accent focus:ring-2 focus:ring-andyou-accent/20 outline-none transition-colors duration-andyou-fast"
              placeholder="Engineering"
            />
          </div>
          <button
            type="submit"
            className="w-full py-spacing-andyou-3 rounded-andyou-full text-andyou-ui-label text-andyou-accent-on transition-all duration-andyou-fast hover:shadow-andyou-card-md"
            style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
          >
            Next: Capture Face
          </button>
        </form>
      )}

      {step === "face" && (
        <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-6">
          <h2 className="text-andyou-heading-h3-primary text-andyou-text-primary mb-spacing-andyou-1">
            Face Registration for {name}
          </h2>
          <p className="text-andyou-body text-andyou-text-muted mb-spacing-andyou-4">
            Capture 5 face images. Move your head slightly between each capture.
          </p>
          <FaceRegistration onComplete={handleFaceComplete} requiredCaptures={5} />
        </div>
      )}

      {step === "saving" && (
        <div className="bg-andyou-white rounded-andyou-lg shadow-andyou-card p-spacing-andyou-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-andyou-accent mx-auto mb-spacing-andyou-4" />
          <p className="text-andyou-body text-andyou-text-secondary">Saving employee data...</p>
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-spacing-andyou-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-andyou-ui-badge transition-colors duration-andyou-fast"
        style={
          done
            ? { background: "linear-gradient(to right, #ffc671, #cf9358)", color: "#61474c" }
            : active
            ? { background: "#9a6d2a", color: "#ffffff" }
            : { background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.4)" }
        }
      >
        {done ? "\u2713" : num}
      </div>
      <span
        className={`text-andyou-ui-label ${
          active ? "text-andyou-text-primary" : "text-andyou-text-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
