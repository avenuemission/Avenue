import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// ============================================================
// SERVER-ONLY Supabase client using the SERVICE ROLE key.
// This bypasses Row Level Security and must NEVER be imported
// into client components. Only use inside API routes.
// ============================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Verify the request carries the admin Bearer token.
// Set ADMIN_API_KEY in your Netlify environment variables.
export function isAdminAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;
  return authHeader === `Bearer ${adminKey}`;
}
