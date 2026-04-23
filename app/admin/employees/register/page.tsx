"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FaceRegistration from "@/components/FaceRegistration";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

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
      <h1 className="t-display mb-8">Register New Employee</h1>

      <div className="flex items-center mb-10">
        <StepIndicator num={1} label="Details" active={step === "info"} done={step !== "info"} />
        <div className="flex-1 h-px bg-sw-ink-200 mx-3" />
        <StepIndicator num={2} label="Face Scan" active={step === "face"} done={step === "saving"} />
        <div className="flex-1 h-px bg-sw-ink-200 mx-3" />
        <StepIndicator num={3} label="Complete" active={step === "saving"} done={false} />
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
          {error}
        </div>
      )}

      {step === "info" && (
        <form
          onSubmit={handleInfoSubmit}
          className="bg-sw-white rounded-sw-xl border border-sw-ink-200 shadow-sw-1 p-8"
        >
          <div className="space-y-6">
            <div>
              <Label>Full Name *</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
              />
            </div>
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full mt-8">
            Next: Capture Face
          </Button>
        </form>
      )}

      {step === "face" && (
        <div className="bg-sw-white rounded-sw-xl border border-sw-ink-200 shadow-sw-1 p-8">
          <h2 className="t-h4 mb-1 text-sw-ink-900">Face Registration for {name}</h2>
          <p className="t-body text-sw-ink-500 mb-6">
            Capture 5 face images. Move your head slightly between each capture.
          </p>
          <FaceRegistration onComplete={handleFaceComplete} requiredCaptures={5} />
        </div>
      )}

      {step === "saving" && (
        <div className="bg-sw-white rounded-sw-xl border border-sw-ink-200 shadow-sw-1 p-16 text-center">
          <div className="animate-spin rounded-sw-full h-10 w-10 border-b-2 border-sw-gold-500 mx-auto mb-4" />
          <p className="t-body text-sw-ink-500">Saving employee data...</p>
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
  const circleClass = done
    ? "bg-sw-gold-500 text-sw-white"
    : active
    ? "bg-sw-gold-600 text-sw-white"
    : "bg-sw-ink-100 text-sw-ink-500";
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-sw-full flex items-center justify-center text-sw-micro font-medium transition-colors duration-sw-fast ${circleClass}`}
      >
        {done ? "✓" : num}
      </div>
      <span
        className={`text-sw-caption font-medium ${active ? "text-sw-ink-900" : "text-sw-ink-500"}`}
      >
        {label}
      </span>
    </div>
  );
}
