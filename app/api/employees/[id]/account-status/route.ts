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
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: employeeId } = await params;
  const supabase = getSupabaseService();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, email, system_role")
    .eq("employee_id", employeeId)
    .single();

  if (profile) {
    return NextResponse.json({
      hasAccount: true,
      email: profile.email,
      role: profile.system_role,
    });
  }

  return NextResponse.json({ hasAccount: false, email: null, role: null });
}
