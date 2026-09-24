import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";

// GET all sessions
export async function GET(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  if (!auth.leader.fullAccess) return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });

  const { data, error } = await getSupabaseAdmin()
    .from("workshop_sessions")
    .select("*, survey_responses(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return serverError("workshops/sessions GET", error);
  }
  return NextResponse.json(data);
}

// POST create a new session
export async function POST(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  if (!auth.leader.fullAccess) return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });

  const { code, include_life_3 } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Session code required" }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();
  const db = getSupabaseAdmin();

  // Try with include_life_3 column first
  let { data, error } = await db
    .from("workshop_sessions")
    .insert({ code: normalized, include_life_3: include_life_3 !== false })
    .select()
    .single();

  // Fallback: if column doesn't exist, insert without it
  if (error && error.message?.includes("include_life_3")) {
    const result = await db
      .from("workshop_sessions")
      .insert({ code: normalized })
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Session code already exists" }, { status: 409 });
    }
    return serverError("workshops/sessions POST", error);
  }

  return NextResponse.json(data);
}
