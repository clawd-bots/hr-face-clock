import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { generatePairingCode } from "@/lib/kiosk-auth";

const HR_PLUS = ["super_admin", "company_admin", "hr_manager"];
const PAIRING_TTL_MIN = 15;

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

export async function GET() {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from("kiosk_devices")
    .select("id, name, description, ip_allowlist, paired_at, last_seen_at, last_seen_ip, revoked_at, pairing_code, pairing_code_expires_at, created_at")
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId || !ctx.role || !HR_PLUS.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, ip_allowlist } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = getSupabaseService();
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MIN * 60_000).toISOString();

  const { data, error } = await supabase
    .from("kiosk_devices")
    .insert({
      company_id: ctx.companyId,
      name,
      description: description ?? null,
      pairing_code: code,
      pairing_code_expires_at: expiresAt,
      ip_allowlist: Array.isArray(ip_allowlist) ? ip_allowlist : [],
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "kiosk_device",
    entityId: data.id,
    changes: { name: { old: null, new: name } },
  });

  return NextResponse.json({
    ...data,
    pairing_code: code,
    pairing_code_expires_at: expiresAt,
  });
}
