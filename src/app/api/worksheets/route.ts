import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";
import { parseKind, validateWorksheetPatch } from "@/lib/domain/worksheets";

// Worksheets: Calling and Launch answers, private to the signed-in leader.
// The email is only ever auth.leader.email. A read filters by it; a write
// passes it to worksheet_set_section, which merges one section atomically;
// a reset deletes the one row for that email and kind.

// GET /api/worksheets?kind=calling|launch
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const kind = parseKind(new URL(request.url).searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "kind must be calling or launch" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_worksheets")
    .select("data, updated_at")
    .eq("email", auth.leader.email)
    .eq("kind", kind)
    .maybeSingle();
  if (error) return serverError("worksheets GET", error);
  return NextResponse.json({ data: data?.data ?? {}, updatedAt: data?.updated_at ?? null });
}

// PATCH /api/worksheets  { kind, section, value }
export async function PATCH(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = validateWorksheetPatch(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin().rpc("worksheet_set_section", {
    p_email: auth.leader.email,
    p_kind: parsed.kind,
    p_section: parsed.section,
    p_value: parsed.value,
  });
  if (error) return serverError("worksheets PATCH", error);
  return NextResponse.json({ data: data ?? {} });
}

// DELETE /api/worksheets?kind=calling|launch
// Reset Calling or Reset Launch (round 3 spec 2): removes the caller's one
// row for that kind, which holds every answer in it (APEST results and the
// AI reflection for Calling, the Arena run and ticked actions for Launch).
// No other table is touched. Deleting when there is no row is still ok, so
// a second tap is harmless.
export async function DELETE(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const kind = parseKind(new URL(request.url).searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "kind must be calling or launch" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("leader_worksheets")
    .delete()
    .eq("email", auth.leader.email)
    .eq("kind", kind);
  if (error) return serverError("worksheets DELETE", error);
  return NextResponse.json({ ok: true });
}
