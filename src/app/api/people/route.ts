import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/supabaseAdmin";
import { requireLeader } from "@/lib/requireLeader";
import { MAX_PEOPLE, PERSON_COLUMNS, toPerson, validatePersonInput, type PersonRow } from "@/lib/people";

// My People: a private list per leader. Every query is filtered by the
// verified owner email, so another leader's row is simply not found
// (404), never read-then-refused.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leader_people")
    .select(PERSON_COLUMNS)
    .eq("owner_email", auth.leader.email)
    .order("first_name", { ascending: true })
    .limit(MAX_PEOPLE);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ people: ((data ?? []) as PersonRow[]).map(toPerson) });
}

export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = validatePersonInput(body, "create");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = getSupabaseAdmin();
  const { count, error: countErr } = await db
    .from("leader_people")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", auth.leader.email);
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if ((count ?? 0) >= MAX_PEOPLE) {
    return NextResponse.json({ error: `You can keep up to ${MAX_PEOPLE} people` }, { status: 400 });
  }

  const { data, error } = await db
    .from("leader_people")
    .insert({ ...parsed.values, owner_email: auth.leader.email })
    .select(PERSON_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ person: toPerson(data as PersonRow) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id must be a uuid" }, { status: 400 });
  const parsed = validatePersonInput(body, "update");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_people")
    .update({ ...parsed.values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_email", auth.leader.email)
    .select(PERSON_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  return NextResponse.json({ person: toPerson(data as PersonRow) });
}

export async function DELETE(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id must be a uuid" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_people")
    .delete()
    .eq("id", id)
    .eq("owner_email", auth.leader.email)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
