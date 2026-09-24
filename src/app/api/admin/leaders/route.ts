import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { leaderAccessWrite, leaderCreateWrite } from "@/lib/domain/adminContent";

// The Supabase `leaders` table is the only source of truth for leader
// access: requireLeader reads it and nothing else.
const LEADER_COLUMNS = "id, email, name, full_access, created_at";

// GET /api/admin/leaders: every leader, newest first
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .select(LEADER_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return serverError("admin/leaders GET", error);
  return NextResponse.json({ leaders: data ?? [] });
}

// POST /api/admin/leaders: add a leader directly
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = leaderCreateWrite(await request.json().catch(() => null));
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .insert({
      id: write.row.id ?? Date.now().toString(),
      email: write.row.email,
      name: write.row.name,
      full_access: write.row.full_access,
    })
    .select(LEADER_COLUMNS);

  if (error?.code === "23505") return jsonError(409, "Leader already exists");
  if (error) return serverError("admin/leaders POST", error);
  return NextResponse.json({ leader: data?.[0] ?? null });
}

// PUT /api/admin/leaders: grant or revoke full access by email
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = leaderAccessWrite(await request.json().catch(() => null));
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .update({ full_access: write.full_access })
    .eq("email", write.email)
    .select(LEADER_COLUMNS);

  if (error) return serverError("admin/leaders PUT", error);
  if (!data || data.length === 0) return jsonError(404, "Leader not found");
  return NextResponse.json({ success: true, leader: data[0] });
}

// DELETE /api/admin/leaders?email=: remove a leader
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return jsonError(400, "email required");

  const { data, error } = await getSupabaseAdmin().from("leaders").delete().eq("email", email).select("email");

  if (error) return serverError("admin/leaders DELETE", error);
  if (!data || data.length === 0) return jsonError(404, "Leader not found");
  return NextResponse.json({ success: true });
}
