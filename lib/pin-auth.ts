/**
 * Employee PIN hashing.
 *
 * PINs are short (4-6 digits) so we can't rely on them being
 * unguessable on their own. Two layers of defense:
 *  1. Per-employee salting via the employee.id (random uuid). Same
 *     PIN on two different employees produces two different hashes.
 *  2. Lockout on the kiosk side after N wrong attempts (handled in
 *     the API route).
 *
 * SHA-256 (via Node crypto) is sufficient here because we're combining
 * a 36-char uuid with the PIN — brute forcing the PIN online would
 * already trip the lockout, and brute forcing the hash offline would
 * require the full database.
 *
 * Used by:
 *  - PATCH /api/employees/[id]/pin    (HR set/reset)
 *  - PATCH /api/employee/me/pin       (employee self-service)
 *  - POST  /api/kiosk/correct-match   (verify Not Me flow)
 */

import { createHash } from "crypto";

/** Build the salted-hash string for storage. */
export function hashPin(pin: string, employeeId: string): string {
  return createHash("sha256").update(`pin:${pin}:${employeeId}`).digest("hex");
}

/** Constant-time comparison. */
export function verifyPin(
  pin: string,
  employeeId: string,
  storedHash: string | null
): boolean {
  if (!storedHash) return false;
  const candidate = hashPin(pin, employeeId);
  if (candidate.length !== storedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Validate format: 4-6 digit numeric. */
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,6}$/.test(pin);
}
