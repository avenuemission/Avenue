import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

// Public submissions come in through POST /api/forms/<type>.

// GET: admin, list submissions (optionally filter by ?type=)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let query = getSupabaseAdmin()
    .from("form_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (type && type !== "all") {
    query = query.eq("form_type", type);
  }

  const { data, error } = await query;
  if (error) return serverError("submissions GET", error);

  return NextResponse.json({ submissions: data ?? [] });
}

// PATCH: admin, archive / unarchive a submission
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { id, archived } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("form_submissions")
    .update({ archived: !!archived })
    .eq("id", id);

  if (error) return serverError("submissions PATCH", error);
  return NextResponse.json({ success: true });
}

// DELETE: admin, remove a submission (?id=)
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("form_submissions").delete().eq("id", id);
  if (error) return serverError("submissions DELETE", error);
  return NextResponse.json({ success: true });
}
