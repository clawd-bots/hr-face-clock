import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

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

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  const supabase = getSupabaseService();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabase
    .from("employee_allowances")
    .select("*, allowance_type:allowance_types(*)");

  if (ctx.companyId) query = query.eq("company_id", ctx.companyId);
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.employee_id || !body.allowance_type_id || body.amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from("employee_allowances")
    .insert({
      company_id: ctx.companyId,
      employee_id: body.employee_id,
      allowance_type_id: body.allowance_type_id,
      amount: body.amount,
      frequency: body.frequency || "per_cutoff",
    })
    .select("*, allowance_type:allowance_types(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "employee_allowance",
    entityId: data.id,
  });

  return NextResponse.json(data);
}
