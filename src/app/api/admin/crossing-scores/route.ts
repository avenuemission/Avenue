import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { isUuid } from "@/lib/domain/ids";

// Players post scores through POST /api/crossing-scores. This route is the
// admin's view of them, for removing rude initials or an impossible score.

const ADMIN_LIST_SIZE = 100;

// GET /api/admin/crossing-scores: the top 100, with ids for deleting
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("crossing_scores")
    .select("id, initials, score, duration_ms, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(ADMIN_LIST_SIZE);
  if (error) return serverError("admin/crossing-scores GET", error);
  return NextResponse.json({ scores: data ?? [] });
}

// DELETE /api/admin/crossing-scores?id=: remove one score
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");

  const { error } = await getSupabaseAdmin().from("crossing_scores").delete().eq("id", id);
  if (error) return serverError("admin/crossing-scores DELETE", error);
  return NextResponse.json({ success: true });
}
