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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Register New Employee
      </h1>

      {/* Progress steps */}
      <div className="flex items-center gap-4 mb-8">
        <StepIndicator
          num={1}
          label="Details"
          active={step === "info"}
          done={step !== "info"}
        />
        <div className="flex-1 h-px bg-gray-300" />
        <StepIndicator
          num={2}
          label="Face Scan"
          active={step === "face"}
          done={step === "saving"}
        />
        <div className="flex-1 h-px bg-gray-300" />
        <StepIndicator num={3} label="Complete" active={step === "saving"} done={false} />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {step === "info" && (
        <form
          onSubmit={handleInfoSubmit}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Software Engineer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Engineering"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Next: Capture Face
          </button>
        </form>
      )}

      {step === "face" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Face Registration for {name}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Capture 5 face images. Move your head slightly between each capture.
          </p>
          <FaceRegistration onComplete={handleFaceComplete} requiredCaptures={5} />
        </div>
      )}

      {step === "saving" && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Saving employee data...</p>
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
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          done
            ? "bg-green-500 text-white"
            : active
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {done ? "✓" : num}
      </div>
      <span
        className={`text-sm ${
          active ? "text-gray-900 font-medium" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
