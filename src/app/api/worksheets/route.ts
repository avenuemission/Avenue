import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/supabaseAdmin";
import { requireLeader } from "@/lib/requireLeader";
import { parseKind, validateWorksheetPatch } from "@/lib/worksheets";

// Worksheets: Calling and Launch answers, private to the signed-in leader.
// The email is only ever auth.leader.email. A read filters by it; a write
// passes it to worksheet_set_section, which merges one section atomically.

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? {} });
}
