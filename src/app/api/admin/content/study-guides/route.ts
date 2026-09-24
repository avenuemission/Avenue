import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { STUDY_GUIDE_COLUMNS, studyGuideWrite } from "@/lib/domain/studyGuides";
import { isUuid } from "@/lib/domain/adminContent";

// Admin writes for study guides. The public list is GET /api/content/study-guides.
// Guides show on /pathways (this week's topic) and /leaders/study-guides.
function refresh(): void {
  revalidatePath("/pathways");
  revalidatePath("/leaders/study-guides");
}

// POST: create a study guide
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const write = studyGuideWrite(await request.json().catch(() => null), "create");
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin().from("study_guides").insert(write.row).select(STUDY_GUIDE_COLUMNS);
  if (error) return serverError("admin/content/study-guides POST", error);
  refresh();
  return NextResponse.json({ guide: data?.[0] ?? null });
}

// PUT: update a study guide by id
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const body: unknown = await request.json().catch(() => null);
  const id = typeof body === "object" && body !== null ? (body as { id?: unknown }).id : undefined;
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");
  const write = studyGuideWrite(body, "update");
  if ("error" in write) return jsonError(400, write.error);

  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .update(write.row)
    .eq("id", id)
    .select(STUDY_GUIDE_COLUMNS);

  if (error) return serverError("admin/content/study-guides PUT", error);
  if (!data || data.length === 0) return jsonError(404, "No matching row found");
  refresh();
  return NextResponse.json({ guide: data[0] });
}

// DELETE ?id=: remove a study guide
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");

  const { error } = await getSupabaseAdmin().from("study_guides").delete().eq("id", id);
  if (error) return serverError("admin/content/study-guides DELETE", error);
  refresh();
  return NextResponse.json({ success: true });
}
