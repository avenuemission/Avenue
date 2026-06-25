import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isAdminAuthorized } from "@/lib/supabaseAdmin";

// GET: public — list all study guides
export async function GET() {
  const { data, error } = await supabase
    .from("study_guides")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guides: data ?? [] });
}

// POST: admin — create a study guide
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { guide_date, series, topic, scripture, spotify_url, pdf_url, color, sort_order } = body;

  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .insert({ guide_date, series, topic, scripture, spotify_url, pdf_url, color, sort_order: sort_order ?? 0 })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guide: data?.[0] ?? null });
}

// PUT: admin — update a study guide
export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .update(fields)
    .eq("id", id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No matching row found" }, { status: 404 });
  return NextResponse.json({ guide: data[0] });
}

// DELETE: admin — remove a study guide
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("study_guides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
