/**
 * Read endpoint for the face-match shadow log.
 * GET /api/face-match-shadow/audit?from=...&to=...&filter=disagreed|all
 *
 * Returns aggregate stats plus a paginated list of recent shadow log
 * rows. HR+ only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id, system_role")
        .eq("id", user.id)
        .single();
      return {
        userId: user.id,
        companyId: profile?.company_id ?? null,
        role: profile?.system_role ?? null,
      };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null, role: null };
}

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filter = searchParams.get("filter") ?? "all";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

  const supabase = getSupabaseService();

  // Aggregate stats
  let aggQuery = supabase
    .from("face_match_shadow_log")
    .select("agreed, v1_employee_id, v2_employee_id", { count: "exact" })
    .eq("company_id", ctx.companyId);
  if (from) aggQuery = aggQuery.gte("created_at", from);
  if (to) aggQuery = aggQuery.lte("created_at", to + "T23:59:59");

  const { data: aggData, count: total } = await aggQuery;
  const agreedCount = (aggData ?? []).filter((r) => r.agreed).length;
  const disagreedCount = (total ?? 0) - agreedCount;
  const v2NullCount = (aggData ?? []).filter((r) => !r.v2_employee_id).length;

  // Detail rows
  let listQuery = supabase
    .from("face_match_shadow_log")
    .select(
      `*,
       v1_employee:employees!face_match_shadow_log_v1_employee_id_fkey(id, name, first_name, last_name),
       v2_employee:employees!face_match_shadow_log_v2_employee_id_fkey(id, name, first_name, last_name)`
    )
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) listQuery = listQuery.gte("created_at", from);
  if (to) listQuery = listQuery.lte("created_at", to + "T23:59:59");
  if (filter === "disagreed") listQuery = listQuery.eq("agreed", false);
  if (filter === "agreed") listQuery = listQuery.eq("agreed", true);

  const { data: rows, error } = await listQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    stats: {
      total: total ?? 0,
      agreed: agreedCount,
      disagreed: disagreedCount,
      v2_no_match: v2NullCount,
      agreement_rate: total && total > 0 ? agreedCount / total : 0,
    },
    rows: rows ?? [],
  });
}
