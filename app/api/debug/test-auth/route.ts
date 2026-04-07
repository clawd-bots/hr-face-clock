import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  // Test sign-in server-side with the anon key (same as browser would use)
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status,
    });
  }

  return NextResponse.json({
    success: true,
    userId: data.user?.id,
    email: data.user?.email,
    hasSession: !!data.session,
  });
}
