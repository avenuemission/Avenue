import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";

// Columns a client is allowed to write. Anything else in the body is ignored,
// so a caller can't set updated_at or invent columns.
const WRITABLE = [
  "display_name",
  "avatar_url",
  "birthday",
  "baptism_anniversary",
  "favourite_verse",
  "favourite_verse_ref",
  "pathway_group",
  "role",
  "apest",
  "about",
  "favourite_song",
  "coffee_order",
] as const;

// Avatars are stored as client-resized data URLs. Cap the size so a huge
// image can't be pushed into the database.
const MAX_AVATAR_CHARS = 400_000; // ~300KB of base64

// Empty strings should clear a field, and date columns reject "" outright.
function normalise(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// GET /api/leader-profile: the signed-in leader's own profile
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leader_profiles")
    .select("*")
    .eq("email", auth.leader.email)
    .maybeSingle();

  if (error) return serverError("leader-profile GET", error);
  return NextResponse.json({ profile: data ?? null });
}

// PUT /api/leader-profile — upsert the caller's own profile
export async function PUT(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  // body.email is ignored: the profile row is always the caller's own.
  const body = await request.json();

  if (typeof body.avatar_url === "string" && body.avatar_url.length > MAX_AVATAR_CHARS) {
    return NextResponse.json(
      { error: "Image is too large. Please choose a smaller photo." },
      { status: 413 }
    );
  }

  const row: Record<string, string | null> = {
    email: auth.leader.email,
    updated_at: new Date().toISOString(),
  };
  for (const key of WRITABLE) {
    if (key in body) row[key] = normalise(key, body[key]);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leader_profiles")
    .upsert(row, { onConflict: "email" })
    .select()
    .single();

  if (error) return serverError("leader-profile PUT", error);
  return NextResponse.json({ profile: data });
}
