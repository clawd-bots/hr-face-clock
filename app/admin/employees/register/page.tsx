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
    <div className="max-w-xl mx-auto">
      <h1 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)] mb-8">
        Register New Employee
      </h1>

      {/* Progress steps */}
      <div className="flex items-center mb-10">
        <StepIndicator num={1} label="Details" active={step === "info"} done={step !== "info"} />
        <div className="flex-1 h-px bg-[rgba(0,0,0,0.1)] mx-3" />
        <StepIndicator num={2} label="Face Scan" active={step === "face"} done={step === "saving"} />
        <div className="flex-1 h-px bg-[rgba(0,0,0,0.1)] mx-3" />
        <StepIndicator num={3} label="Complete" active={step === "saving"} done={false} />
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
          {error}
        </div>
      )}

      {step === "info" && (
        <form
          onSubmit={handleInfoSubmit}
          className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium tracking-normal text-[rgba(0,0,0,0.65)] mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 border border-[rgba(0,0,0,0.1)] rounded-2xl text-base text-[rgba(0,0,0,0.88)] bg-[#fafaf2] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#ffc671] focus:ring-2 focus:ring-[rgba(255,198,113,0.25)] outline-none transition-all duration-150"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium tracking-normal text-[rgba(0,0,0,0.65)] mb-2">
                Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-12 px-4 border border-[rgba(0,0,0,0.1)] rounded-2xl text-base text-[rgba(0,0,0,0.88)] bg-[#fafaf2] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#ffc671] focus:ring-2 focus:ring-[rgba(255,198,113,0.25)] outline-none transition-all duration-150"
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium tracking-normal text-[rgba(0,0,0,0.65)] mb-2">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-12 px-4 border border-[rgba(0,0,0,0.1)] rounded-2xl text-base text-[rgba(0,0,0,0.88)] bg-[#fafaf2] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#ffc671] focus:ring-2 focus:ring-[rgba(255,198,113,0.25)] outline-none transition-all duration-150"
                placeholder="Engineering"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full h-12 mt-8 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
            style={{ background: "linear-gradient(to right, #ffc671, #cf9358)" }}
          >
            Next: Capture Face
          </button>
        </form>
      )}

      {step === "face" && (
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8">
          <h2 className="text-xl font-medium tracking-[-1px] leading-[1.2] text-[rgba(0,0,0,0.88)] mb-1">
            Face Registration for {name}
          </h2>
          <p className="text-base text-[rgba(0,0,0,0.4)] mb-6">
            Capture 5 face images. Move your head slightly between each capture.
          </p>
          <FaceRegistration onComplete={handleFaceComplete} requiredCaptures={5} />
        </div>
      )}

      {step === "saving" && (
        <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#ffc671] mx-auto mb-4" />
          <p className="text-base text-[rgba(0,0,0,0.65)]">Saving employee data...</p>
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
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors duration-150"
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
        className={`text-sm font-medium ${
          active ? "text-[rgba(0,0,0,0.88)]" : "text-[rgba(0,0,0,0.4)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
