import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";
import { STUDY_GUIDE_COLUMNS, studyGuideWrite } from "@/lib/domain/studyGuides";

// GET (public): list all study guides
export async function GET() {
  const { data, error } = await supabase
    .from("study_guides")
    .select(STUDY_GUIDE_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) return serverError("study-guides GET", error);
  return NextResponse.json({ guides: data ?? [] });
}

// POST (admin): create a study guide
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const write = studyGuideWrite(await request.json(), "create");
  if ("error" in write) return NextResponse.json({ error: write.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .insert(write.row)
    .select(STUDY_GUIDE_COLUMNS);

  if (error) return serverError("study-guides POST", error);
  return NextResponse.json({ guide: data?.[0] ?? null });
}

// PUT (admin): update a study guide
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json();
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const write = studyGuideWrite(body, "update");
  if ("error" in write) return NextResponse.json({ error: write.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .update(write.row)
    .eq("id", id)
    .select(STUDY_GUIDE_COLUMNS);

  if (error) return serverError("study-guides PUT", error);
  if (!data || data.length === 0) return NextResponse.json({ error: "No matching row found" }, { status: 404 });
  return NextResponse.json({ guide: data[0] });
}

// DELETE (admin): remove a study guide
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("study_guides").delete().eq("id", id);
  if (error) return serverError("study-guides DELETE", error);
  return NextResponse.json({ success: true });
}
