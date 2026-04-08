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
  const activeOnly = searchParams.get("active");

  let query = supabase.from("allowance_types").select("*").order("name");

  if (ctx.companyId) query = query.eq("company_id", ctx.companyId);
  if (activeOnly === "true") query = query.eq("active", true);

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
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "Missing name or code" }, { status: 400 });
  }

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from("allowance_types")
    .insert({
      company_id: ctx.companyId,
      name: body.name,
      code: body.code,
      is_taxable: body.is_taxable ?? false,
      is_de_minimis: body.is_de_minimis ?? false,
      de_minimis_limit: body.de_minimis_limit ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "allowance_type",
    entityId: data.id,
  });

  return NextResponse.json(data);
}
