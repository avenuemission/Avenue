import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/client/supabaseBrowser";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

// GET (public): list pathway groups
export async function GET() {
  const { data, error } = await supabase
    .from("pathway_groups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return serverError("pathway-groups GET", error);
  return NextResponse.json({ groups: data ?? [] });
}

// POST (admin): create a pathway group
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json();
  const { name, latitude, longitude, time, coordinator, phone, running, description, sort_order } = body;

  const { data, error } = await getSupabaseAdmin()
    .from("pathway_groups")
    .insert({ name, latitude, longitude, time, coordinator, phone, running: !!running, description, sort_order: sort_order ?? 0 })
    .select();

  if (error) return serverError("pathway-groups POST", error);
  return NextResponse.json({ group: data?.[0] ?? null });
}

// PUT (admin): update a pathway group
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("pathway_groups")
    .update(fields)
    .eq("id", Number(id))
    .select();

  if (error) return serverError("pathway-groups PUT", error);
  if (!data || data.length === 0) return NextResponse.json({ error: "No matching row found" }, { status: 404 });
  return NextResponse.json({ group: data[0] });
}

// DELETE (admin): remove a pathway group (?id=)
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("pathway_groups").delete().eq("id", Number(id));
  if (error) return serverError("pathway-groups DELETE", error);
  return NextResponse.json({ success: true });
}
