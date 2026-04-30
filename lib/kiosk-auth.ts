/**
 * Kiosk device authentication.
 *
 * Validates a device token from the `sweldo_kiosk_token` cookie, checks the
 * IP allowlist, and updates last_seen. Used by kiosk-only API routes
 * (/api/time-logs POST, /api/employees GET when unauthenticated).
 */

import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

export const KIOSK_COOKIE = "sweldo_kiosk_token";
export const KIOSK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

export type KioskDevice = {
  id: string;
  company_id: string;
  name: string;
  ip_allowlist: string[] | null;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  // 32 random bytes → 43 chars base64url
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Buffer.from(arr)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePairingCode(): string {
  // 6-digit numeric code (zero-padded)
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

/**
 * Read the client IP from common proxy headers (Vercel uses x-forwarded-for).
 * Falls back to the request's remote address if available.
 */
export function getClientIP(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * Check whether `ip` matches any entry in the CIDR allowlist.
 * Empty/null allowlist = always pass.
 */
export function ipAllowed(ip: string | null, allowlist: string[] | null): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  if (!ip) return false;

  for (const rule of allowlist) {
    if (matchCIDR(ip, rule.trim())) return true;
  }
  return false;
}

function matchCIDR(ip: string, rule: string): boolean {
  if (!rule.includes("/")) return ip === rule;
  const [base, bitsStr] = rule.split("/");
  const bits = parseInt(bitsStr!, 10);
  if (isNaN(bits)) return false;

  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base!);
  if (ipInt === null || baseInt === null) return false;

  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : ((-1 << (32 - bits)) >>> 0);
  return (ipInt & mask) === (baseInt & mask);
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

/**
 * Validate the kiosk device token from the request cookie.
 * Returns the device row on success, null on failure.
 * On success, updates last_seen_at and last_seen_ip in the background.
 */
export async function getKioskDevice(req: NextRequest): Promise<KioskDevice | null> {
  const token = req.cookies.get(KIOSK_COOKIE)?.value;
  if (!token) return null;

  const supabase = getSupabaseService();
  const { data: device } = await supabase
    .from("kiosk_devices")
    .select("id, company_id, name, ip_allowlist, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!device || device.revoked_at) return null;

  const ip = getClientIP(req);
  if (!ipAllowed(ip, device.ip_allowlist as string[] | null)) return null;

  // Fire-and-forget last_seen update
  void supabase
    .from("kiosk_devices")
    .update({ last_seen_at: new Date().toISOString(), last_seen_ip: ip })
    .eq("id", device.id);

  return {
    id: device.id,
    company_id: device.company_id,
    name: device.name,
    ip_allowlist: device.ip_allowlist as string[] | null,
  };
}
