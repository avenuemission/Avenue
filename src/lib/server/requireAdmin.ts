import "server-only";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminConfigError } from "@/lib/server/supabaseAdmin";
import { allow, isBlocked, RATE, supabaseRateDeps, type RateDeps } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, tooMany } from "@/lib/server/http";

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
//  1. If this IP is already locked out (too many recent failures), 429
//     without even looking at the key.
//  2. If the key does not match, count the failure against the lockout and
//     401.
//  3. If the key matches, run the service-role-key sanity check
//     (adminConfigError) and return its response if the server itself is
//     misconfigured; otherwise the caller is authorised.
export async function requireAdmin(
  request: NextRequest,
  deps: RateDeps = supabaseRateDeps()
): Promise<{ ok: true } | { response: NextResponse }> {
  const ip = clientIp(request);
  const path = new URL(request.url).pathname;

  if (await isBlocked(RATE.adminFail, ip, deps)) {
    return { response: tooMany() };
  }

  const header = request.headers.get("authorization");
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKeyMatches(header, adminKey)) {
    await allow(RATE.adminFail, ip, deps);
    console.error(`admin auth failed ip=${ip} path=${path}`);
    return { response: jsonError(401, "Unauthorized") };
  }

  console.log(`admin auth ok path=${path}`);

  const cfgErr = adminConfigError();
  if (cfgErr) return { response: cfgErr };

  return { ok: true };
}
