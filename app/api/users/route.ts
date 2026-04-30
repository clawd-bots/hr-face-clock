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
  const role = searchParams.get("role");
  const status = searchParams.get("status"); // active | inactive

  const supabase = getSupabaseService();
  let query = supabase
    .from("user_profiles")
    .select(
      "id, email, display_name, system_role, active, created_at, employee_id, employee:employees(id, employee_number, first_name, last_name, name, position_title)"
    )
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false });

  if (role) query = query.eq("system_role", role);
  if (status === "active") query = query.eq("active", true);
  if (status === "inactive") query = query.eq("active", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull last_sign_in_at from auth.users via admin API for each.
  // Optional, batched: fetch all users once and merge.
  const { data: authList } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const authById = new Map<string, { last_sign_in_at: string | null }>();
  for (const u of authList?.users ?? []) {
    authById.set(u.id, { last_sign_in_at: u.last_sign_in_at ?? null });
  }

  // Pull managed-department links for any department managers
  const managerIds = (data ?? [])
    .filter((u) => u.system_role === "department_manager")
    .map((u) => u.id);
  const linksByUser = new Map<string, string[]>();
  if (managerIds.length > 0) {
    const { data: links } = await supabase
      .from("user_managed_departments")
      .select("user_id, department_id")
      .in("user_id", managerIds);
    for (const l of links ?? []) {
      const arr = linksByUser.get(l.user_id) ?? [];
      arr.push(l.department_id);
      linksByUser.set(l.user_id, arr);
    }
  }

  const merged = (data ?? []).map((u) => ({
    ...u,
    last_sign_in_at: authById.get(u.id)?.last_sign_in_at ?? null,
    managed_department_ids: linksByUser.get(u.id) ?? [],
  }));

  return NextResponse.json(merged);
}
