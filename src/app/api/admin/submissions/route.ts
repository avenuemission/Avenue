import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { isUuid } from "@/lib/domain/ids";
import { submissionArchiveWrite } from "@/lib/domain/adminContent";

// Public submissions come in through POST /api/forms/<type>. This route is
// the admin's view of them.

// GET /api/admin/submissions?type=: every submission, or one form type
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const type = new URL(request.url).searchParams.get("type");
  let query = getSupabaseAdmin().from("form_submissions").select("*").order("created_at", { ascending: false });
  if (type && type !== "all") query = query.eq("form_type", type);

  const { data, error } = await query;
  if (error) return serverError("admin/submissions GET", error);
  return NextResponse.json({ submissions: data ?? [] });
}

// PATCH /api/admin/submissions: archive or unarchive
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = submissionArchiveWrite(await request.json().catch(() => null));
  if ("error" in write) return jsonError(400, write.error);

  const { error } = await getSupabaseAdmin()
    .from("form_submissions")
    .update({ archived: write.archived })
    .eq("id", write.id);

  if (error) return serverError("admin/submissions PATCH", error);
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/submissions?id=: remove a submission
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");

  const { error } = await getSupabaseAdmin().from("form_submissions").delete().eq("id", id);
  if (error) return serverError("admin/submissions DELETE", error);
  return NextResponse.json({ success: true });
}
