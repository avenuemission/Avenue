import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { jsonError, serverError } from "@/lib/server/http";
import { isUuid } from "@/lib/domain/ids";
import { parseHuddleEntry } from "@/lib/domain/huddleStories";

// Admin reads and writes for the huddle entries behind the dashboard's
// "Stories, not seats" card. Each entry is one Pathway Huddle: a name, a
// date and how many people are new this year in each category.

const COLUMNS = "id, label, held_on, pathways, intersections, streetlights";

const toRow = (v: { label: string; heldOn: string; pathways: number; intersections: number; streetlights: number }) => ({
  label: v.label,
  held_on: v.heldOn,
  pathways: v.pathways,
  intersections: v.intersections,
  streetlights: v.streetlights,
});

// GET: every entry, newest huddle first
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin().from("huddle_stories").select(COLUMNS).order("held_on", { ascending: false });
  if (error) return serverError("admin/huddle-stories GET", error);
  return NextResponse.json({ entries: data ?? [] });
}

// POST: add a huddle
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const parsed = parseHuddleEntry(await request.json().catch(() => null));
  if (!parsed.ok) return jsonError(400, parsed.error);
  const { data, error } = await getSupabaseAdmin().from("huddle_stories").insert(toRow(parsed.value)).select(COLUMNS).single();
  if (error) return serverError("admin/huddle-stories POST", error);
  return NextResponse.json({ entry: data });
}

// PUT ?id=: correct a huddle
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");
  const parsed = parseHuddleEntry(await request.json().catch(() => null));
  if (!parsed.ok) return jsonError(400, parsed.error);
  const { data, error } = await getSupabaseAdmin()
    .from("huddle_stories")
    .update(toRow(parsed.value))
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) return serverError("admin/huddle-stories PUT", error);
  return NextResponse.json({ entry: data });
}

// DELETE ?id=: remove a huddle
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return jsonError(400, "id must be a uuid");
  const { error } = await getSupabaseAdmin().from("huddle_stories").delete().eq("id", id);
  if (error) return serverError("admin/huddle-stories DELETE", error);
  return NextResponse.json({ success: true });
}
