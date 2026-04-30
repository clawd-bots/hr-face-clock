"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { SweldoLogo } from "@/components/ui/SweldoLogo";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sw-cream-50">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sw-gold-500" />
    </div>
  );
}

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

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 px-4 py-3 bg-sw-danger-100 border border-sw-danger-500/20 rounded-[12px] text-sw-caption font-medium text-[#a11b35]">
      {message}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  useEffect(() => {
    fetch("/api/setup/check")
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) {
          setNeedsSetup(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSetup(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === "Email not confirmed") {
          setError(
            "Email not confirmed. Check your inbox for a confirmation link, or ask your admin to disable email confirmation in Supabase."
          );
        } else if (authError.message === "Invalid login credentials") {
          setError(
            "Invalid email or password. If this is a new system, you may need to complete setup first."
          );
        } else {
          setError(authError.message);
        }
        return;
      }

      let targetRedirect = redirect;
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("system_role")
          .eq("id", data.user.id)
          .single();

        const adminRoles = ["super_admin", "company_admin", "hr_manager", "payroll_officer", "department_manager"];
        if (profile?.system_role && !adminRoles.includes(profile.system_role)) {
          targetRedirect = "/employee";
        }
      } catch {}

      router.push(targetRedirect);
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) return <LoadingScreen />;

  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sw-cream-50 p-6">
        <div className="w-full max-w-md p-10 rounded-sw-xl bg-sw-white border border-sw-ink-200 shadow-sw-2">
          <Brand tagline="Welcome! Let's get started." />
          <p className="t-body text-sw-ink-500 text-center mb-6">
            No company has been set up yet. Complete the initial setup to create your company and admin account.
          </p>
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/setup">Start Setup</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sw-cream-50 p-6">
      <div className="w-full max-w-md p-10 rounded-sw-xl bg-sw-white border border-sw-ink-200 shadow-sw-2">
        <Brand tagline="Sign in to your account" />

        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
            />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full mt-2">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sw-caption font-medium text-sw-ink-500 hover:text-sw-ink-900 transition-colors duration-sw-fast"
          >
            Go to Kiosk Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
