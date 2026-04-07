"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafaf2]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#cf9358]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf2]">
      <div
        className="w-full max-w-md p-10 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
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
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-[#f4f1e6] border border-[rgba(138,58,52,0.2)] rounded-2xl text-sm font-medium text-[#8a3a34]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="you@company.com"
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
              className="w-full h-12 px-4 bg-[#fafaf2] border border-[rgba(0,0,0,0.1)] rounded-2xl text-sm text-[rgba(0,0,0,0.88)] placeholder:text-[rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,198,113,0.5)] focus:border-[#ffc671] transition-colors duration-150"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full text-sm font-medium text-[#61474c] transition-all duration-150 hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            style={{
              background: "linear-gradient(to right, #ffc671, #cf9358)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm font-medium text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.65)] transition-colors duration-150"
          >
            Go to Kiosk Mode
          </a>
        </div>
      </div>
    </div>
  );
}
