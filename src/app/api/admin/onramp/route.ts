import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

// Visitors sign up through POST /api/onramp. This route is the admin's
// view of the sign-ups, for /onramp/admin. Admin passcode only.

// GET /api/admin/onramp: every sign-up, newest first
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("onramp_signups")
    .select("id, name, email, workshops, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) return serverError("admin/onramp GET", error);
  return NextResponse.json({ signups: data ?? [] });
}
