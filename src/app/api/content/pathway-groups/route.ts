import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isAdminAuthorized, adminConfigError } from "@/lib/supabaseAdmin";

// GET: public — list pathway groups
export async function GET() {
  const { data, error } = await supabase
    .from("pathway_groups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data ?? [] });
}

// POST: admin — create a pathway group
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const body = await request.json();
  const { name, latitude, longitude, time, coordinator, phone, running, description, sort_order } = body;

  const { data, error } = await getSupabaseAdmin()
    .from("pathway_groups")
    .insert({ name, latitude, longitude, time, coordinator, phone, running: !!running, description, sort_order: sort_order ?? 0 })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data?.[0] ?? null });
}

// PUT: admin — update a pathway group
export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("pathway_groups")
    .update(fields)
    .eq("id", Number(id))
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "No matching row found" }, { status: 404 });
  return NextResponse.json({ group: data[0] });
}

// DELETE: admin — remove a pathway group (?id=)
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("pathway_groups").delete().eq("id", Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
