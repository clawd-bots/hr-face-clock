import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      return { userId: user.id, companyId: profile?.company_id ?? null };
    }
  } catch {}
  return { userId: null, companyId: null };
}

export async function POST(_req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();

  const { data, error } = await supabase.rpc("seed_holidays_2026", {
    p_company_id: companyId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
