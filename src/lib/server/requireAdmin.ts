import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminConfigError } from "@/lib/server/supabaseAdmin";
import { allow, isBlocked, RATE, supabaseRateDeps, type RateDeps } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, serverError, tooMany } from "@/lib/server/http";

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

// Compares the request's Authorization header against `Bearer <adminKey>`
// the same way isAdminAuthorized used to (a plain, case-sensitive equality
// on the whole header), but in constant time: both sides are hashed to a
// fixed-length digest first, so crypto.timingSafeEqual never has to compare
// buffers of differing length (a mismatched length itself is not something
// its own length check can leak here, since a SHA-256 digest is always 32
// bytes) and a caller cannot learn anything about how much of their guess
// was correct from response timing. Set ADMIN_API_KEY in your Netlify
// environment variables.
export function adminKeyMatches(header: string | null, adminKey: string | undefined): boolean {
  if (!adminKey || !header) return false;
  const expected = sha256(`Bearer ${adminKey}`);
  const actual = sha256(header);
  return crypto.timingSafeEqual(actual, expected);
}

// Call FIRST in every admin route, before any other query:
//
//   const auth = await requireAdmin(request);
//   if ("response" in auth) return auth.response;
//
// Order of checks:
//  1. The service-role-key sanity check (adminConfigError) runs before
//     anything else, including before a RateDeps is even built. If it did
//     not, a misconfigured/missing SUPABASE_SERVICE_ROLE_KEY would make the
//     default supabaseRateDeps() call getSupabaseAdmin(), which throws
//     synchronously for exactly that misconfiguration, well before the
//     caller reaches the friendlier, more specific adminConfigError()
//     message below it, turning a diagnosable problem into a bare 500.
//  2. If this IP is already locked out (too many recent failures), 429
//     without even looking at the key.
//  3. If the key does not match, count the failure against the lockout and
//     401.
//  4. Otherwise the caller is authorised.
//
// Failures from the rate-limit RPCs themselves (a real database error, not
// a misconfigured key) are caught and turned into a generic serverError,
// never left to surface as an unhandled rejection in the route handler.
export async function requireAdmin(
  request: NextRequest,
  deps?: RateDeps
): Promise<{ ok: true } | { response: NextResponse }> {
  const cfgErr = adminConfigError();
  if (cfgErr) return { response: cfgErr };

  const ip = clientIp(request);
  const path = new URL(request.url).pathname;

  try {
    const rateDeps = deps ?? supabaseRateDeps();

    if (await isBlocked(RATE.adminFail, ip, rateDeps)) {
      return { response: tooMany() };
    }

    const header = request.headers.get("authorization");
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKeyMatches(header, adminKey)) {
      await allow(RATE.adminFail, ip, rateDeps);
      console.error(`admin auth failed ip=${ip} path=${path}`);
      return { response: jsonError(401, "Unauthorized") };
    }

    console.log(`admin auth ok path=${path}`);
    return { ok: true };
  } catch (e) {
    return { response: serverError("requireAdmin rate check", e) };
  }
}
