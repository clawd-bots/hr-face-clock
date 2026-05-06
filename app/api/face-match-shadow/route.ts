/**
 * Shadow-log endpoint for the v2 face matcher evaluation.
 *
 * Called from the kiosk after a successful clock event with both v1
 * and v2 results. Just persists the comparison; doesn't act on it.
 *
 * Auth: requires either a paired kiosk device token OR an authenticated
 * user — same surface as /api/time-logs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getKioskDevice } from "@/lib/kiosk-auth";

async function getCompanyId(req: NextRequest): Promise<string | null> {
  // Try authenticated user
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (profile?.company_id) return profile.company_id;
    }
  } catch { /* fall through */ }

  // Fall back to kiosk device
  const device = await getKioskDevice(req);
  return device?.company_id ?? null;
}

export async function POST(req: NextRequest) {
  const companyId = await getCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = getSupabaseService();

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);

  const insert = {
    company_id: companyId,
    time_log_id: str(body.time_log_id),
    v1_employee_id: str(body.v1_employee_id),
    v1_distance: num(body.v1_distance),
    v1_runner_up_distance: num(body.v1_runner_up_distance),
    v1_margin: num(body.v1_margin),
    v1_reason: str(body.v1_reason),
    v2_employee_id: str(body.v2_employee_id),
    v2_score: num(body.v2_score),
    v2_runner_up_score: num(body.v2_runner_up_score),
    v2_margin: num(body.v2_margin),
    v2_reason: str(body.v2_reason),
    agreed:
      typeof body.v1_employee_id === "string" &&
      typeof body.v2_employee_id === "string" &&
      body.v1_employee_id === body.v2_employee_id,
  };

  const { error } = await supabase.from("face_match_shadow_log").insert(insert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
