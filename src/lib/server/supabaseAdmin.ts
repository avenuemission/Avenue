import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// ============================================================
// SERVER-ONLY Supabase client using the SERVICE ROLE key.
// This bypasses Row Level Security and must NEVER be imported
// into client components. Only use inside API routes.
// ============================================================
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase admin credentials not configured");
    }
    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// ============================================================
// Service-role key sanity check.
//
// All write tables have RLS enabled with NO write policies, so writes only
// succeed with a privileged (RLS-bypassing) key. If SUPABASE_SERVICE_ROLE_KEY
// is accidentally set to a publishable/anon key (or a non-service_role JWT),
// every UPDATE/DELETE silently affects 0 rows ("No matching row found") and
// every INSERT is rejected by RLS — a confusing, hard-to-diagnose failure.
//
// This returns a human-readable reason when the key is clearly NOT a
// service-role key, or null when it looks valid. Format-based detection only:
// it catches the common misconfiguration without a network round-trip. A
// key that looks valid here but is disabled/wrong-project still surfaces via
// the normal Supabase error path.
// ============================================================
export function serviceRoleKeyProblem(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Set it to your Supabase project's secret key (sb_secret_…) and redeploy.";
  }
  if (key.startsWith("sb_publishable_") || key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "SUPABASE_SERVICE_ROLE_KEY is set to the publishable/anon key. It must be the project's SECRET key (sb_secret_…) so admin writes can bypass Row Level Security. Update it in your hosting environment variables and redeploy.";
  }
  if (key.startsWith("eyJ")) {
    // Legacy JWT key — verify the role claim is service_role.
    try {
      const payload = key.split(".")[1] ?? "";
      const role = JSON.parse(Buffer.from(payload, "base64").toString("utf8")).role;
      if (role && role !== "service_role") {
        return `SUPABASE_SERVICE_ROLE_KEY is a "${role}" key, not a service_role key. Use the service_role / secret key and redeploy.`;
      }
    } catch {
      // Can't decode — leave it; a genuinely broken key will surface a Supabase error instead.
    }
  }
  return null;
}

// Guard for admin write handlers: returns a ready-to-send error response when
// the service-role key is misconfigured, otherwise null. Call right after the
// isAdminAuthorized check so writes fail loudly with a clear message.
export function adminConfigError(): NextResponse | null {
  const problem = serviceRoleKeyProblem();
  return problem ? NextResponse.json({ error: problem }, { status: 500 }) : null;
}

// Verify the request carries the admin Bearer token.
// Set ADMIN_API_KEY in your Netlify environment variables.
export function isAdminAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;
  return authHeader === `Bearer ${adminKey}`;
}
