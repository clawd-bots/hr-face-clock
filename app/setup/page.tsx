"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SweldoLogo } from "@/components/ui/SweldoLogo";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

function Brand({ tagline }: { tagline: string }) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2.5 mb-3 text-sw-ink-900">
        <SweldoLogo width={96} height={26} />
        <span className="sr-only">&you</span>
      </div>
      <p className="t-body text-sw-ink-500">{tagline}</p>
    </div>
  );
}

export default function SetupPage() {
  const [step, setStep] = useState<"company" | "admin" | "done">("company");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadySetup, setAlreadySetup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/setup/check")
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) {
          setAlreadySetup(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          email,
          password,
          display_name: displayName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      const supabase = getSupabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Account created but sign-in failed: " + signInError.message);
        return;
      }

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

  if (alreadySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sw-cream-50">
        <div className="text-center">
          <p className="t-body text-sw-ink-500 mb-4">System is already set up.</p>
          <a
            href="/login"
            className="text-sw-caption font-medium text-sw-gold-600 hover:underline"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sw-cream-50">
        <div className="text-center">
          <div className="t-display text-sw-gold-600 mb-2">All Set!</div>
          <p className="t-body text-sw-ink-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sw-cream-50 p-6">
      <div className="w-full max-w-lg p-10 rounded-sw-xl bg-sw-white border border-sw-ink-200 shadow-sw-2">
        <Brand tagline="Set up your HR system" />

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-sw-full ${step === "company" ? "bg-sw-gold-500" : "bg-sw-ink-200"}`} />
          <div className="w-8 h-px bg-sw-ink-200" />
          <div className={`w-3 h-3 rounded-sw-full ${step === "admin" ? "bg-sw-gold-500" : "bg-sw-ink-200"}`} />
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
            {error}
          </div>
        )}

        {step === "company" && (
          <div className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="Your Company Name"
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                if (companyName.trim()) {
                  setStep("admin");
                  setError("");
                }
              }}
            >
              Next
            </Button>
          </div>
        )}

        {step === "admin" && (
          <form onSubmit={handleSetup} className="space-y-4">
            <p className="text-sw-caption font-medium text-sw-ink-500 mb-2">
              Create your admin account for{" "}
              <span className="text-sw-gold-600">{companyName}</span>
            </p>
            <div>
              <Label>Your Name</Label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@company.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="lg" onClick={() => setStep("company")}>
                Back
              </Button>
              <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={loading}>
                {loading ? "Setting up..." : "Complete Setup"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
