"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function SetupPage() {
  const [step, setStep] = useState<"company" | "admin" | "done">("company");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Create auth user via Supabase Auth
      const supabase = getSupabaseBrowser();
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        }
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!authData.user) {
        setError("Failed to create user account");
        return;
      }

      // Step 2: Create company + user profile via API (uses service role)
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          user_id: authData.user.id,
          email,
          display_name: displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      // Step 3: Sign in
      await supabase.auth.signInWithPassword({ email, password });

      setStep("done");
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1500);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf2]">
        <div className="text-center">
          <div className="text-[52px] font-medium tracking-[-3.5px] leading-none mb-2 text-[#cf9358]">
            All Set!
          </div>
          <p className="text-base text-[rgba(0,0,0,0.65)]">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf2]">
      <div
        className="w-full max-w-lg p-10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
        style={{
          background:
            "linear-gradient(167deg, #f4f1e6 0%, #faf8f2 38%, #faf8f2 84%, #f4f1e6 100%)",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-[44px] font-medium tracking-[-2px] leading-[1.1] text-[rgba(0,0,0,0.88)]">
            &you
          </h1>
          <p className="text-base text-[rgba(0,0,0,0.65)] mt-1">
            Set up your HR system
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`w-3 h-3 rounded-full ${
              step === "company" ? "bg-[#cf9358]" : "bg-[rgba(0,0,0,0.1)]"
            }`}
          />
          <div className="w-8 h-px bg-[rgba(0,0,0,0.1)]" />
          <div
            className={`w-3 h-3 rounded-full ${
              step === "admin" ? "bg-[#cf9358]" : "bg-[rgba(0,0,0,0.1)]"
            }`}
          />
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
            {error}
          </div>
        )}

        {step === "company" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full h-12 px-4 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-2xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150"
                placeholder="Your Company Name"
              />
            </div>
            <button
              onClick={() => {
                if (companyName.trim()) {
                  setStep("admin");
                  setError("");
                }
              }}
              className="w-full h-12 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
              style={{
                background: "linear-gradient(to right, #ffc671, #cf9358)",
              }}
            >
              Next
            </button>
          </div>
        )}

        {step === "admin" && (
          <form onSubmit={handleSetup} className="space-y-4">
            <p className="text-sm font-medium text-[rgba(0,0,0,0.65)] mb-2">
              Create your admin account for{" "}
              <span className="text-[#9a6d2a]">{companyName}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full h-12 px-4 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-2xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-2xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150"
                placeholder="admin@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgba(0,0,0,0.65)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 px-4 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-2xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("company")}
                className="h-12 px-6 rounded-full text-sm font-medium text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.2)] transition-colors duration-150"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(to right, #ffc671, #cf9358)",
                }}
              >
                {loading ? "Setting up..." : "Complete Setup"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
