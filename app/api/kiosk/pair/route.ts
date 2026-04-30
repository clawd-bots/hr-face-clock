import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import {
  KIOSK_COOKIE,
  KIOSK_COOKIE_MAX_AGE,
  generateToken,
  hashToken,
  getClientIP,
  ipAllowed,
} from "@/lib/kiosk-auth";

/**
 * Public endpoint — exchanges a 6-digit pairing code for a long-lived
 * device token (set in HTTP-only cookie). The device sticks around until
 * an admin revokes it.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { pairing_code } = body;

  if (!pairing_code || typeof pairing_code !== "string") {
    return NextResponse.json({ error: "pairing_code is required" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  const { data: device } = await supabase
    .from("kiosk_devices")
    .select("id, company_id, name, ip_allowlist, pairing_code, pairing_code_expires_at, paired_at, revoked_at")
    .eq("pairing_code", pairing_code.trim())
    .maybeSingle();

  if (!device) {
    return NextResponse.json({ error: "Invalid pairing code" }, { status: 401 });
  }

  if (device.revoked_at) {
    return NextResponse.json({ error: "Device has been revoked" }, { status: 401 });
  }

  if (device.paired_at) {
    return NextResponse.json({ error: "Pairing code already used" }, { status: 401 });
  }

  if (
    device.pairing_code_expires_at &&
    new Date(device.pairing_code_expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json({ error: "Pairing code expired" }, { status: 401 });
  }

  // Enforce IP allowlist at pair time too
  const ip = getClientIP(req);
  if (!ipAllowed(ip, device.ip_allowlist as string[] | null)) {
    return NextResponse.json({ error: "IP not allowed for this device" }, { status: 403 });
  }

  // Issue the token
  const token = generateToken();
  const tokenHash = hashToken(token);

  const { error: updErr } = await supabase
    .from("kiosk_devices")
    .update({
      token_hash: tokenHash,
      paired_at: new Date().toISOString(),
      pairing_code: null,
      pairing_code_expires_at: null,
      last_seen_at: new Date().toISOString(),
      last_seen_ip: ip,
    })
    .eq("id", device.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const res = NextResponse.json({
    success: true,
    device: {
      id: device.id,
      name: device.name,
      company_id: device.company_id,
    },
  });

  res.cookies.set(KIOSK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: KIOSK_COOKIE_MAX_AGE,
  });

  return res;
}
