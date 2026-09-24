import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { resolveLeader, type LeaderIdentity } from "@/lib/server/leaderAuth";

// Call FIRST in every leader route, before any other query:
//
//   const auth = await requireLeader(request);
//   if ("response" in auth) return auth.response;
//   const email = auth.leader.email;
//
// The email comes from the verified Supabase session. Never read the
// caller's email from the body or query string.
export async function requireLeader(
  request: NextRequest
): Promise<{ leader: LeaderIdentity } | { response: NextResponse }> {
  const db = getSupabaseAdmin();
  const result = await resolveLeader(request.headers.get("authorization"), {
    async emailForToken(token) {
      const { data, error } = await db.auth.getUser(token);
      if (error) {
        // 400, 401 and 403 mean the token itself is bad or expired.
        // Anything else is an outage and must fail loudly as a 500.
        if (error.status === 400 || error.status === 401 || error.status === 403) return null;
        throw new Error(`Auth check failed: ${error.message}`);
      }
      return data.user?.email ?? null;
    },
    async findLeader(email) {
      const { data, error } = await db
        .from("leaders")
        .select("name, full_access")
        .eq("email", email)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { name: string | null; full_access: boolean } | null;
    },
  });
  if (!result.ok) return { response: NextResponse.json({ error: result.error }, { status: result.status }) };
  return { leader: result.leader };
}
