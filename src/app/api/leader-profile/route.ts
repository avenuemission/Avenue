import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";
import {
  PROFILE_COLUMNS,
  PROFILE_TEXT_FIELDS,
  pathwayGroupIdFrom,
  profileChoiceError,
  profileResponse,
} from "@/lib/domain/leaderProfile";
import { isSafeAvatar, MAX_AVATAR_CHARS } from "@/lib/domain/urls";

// Only PROFILE_TEXT_FIELDS and pathwayGroupId are written. Anything else in
// the body is ignored, so a caller can't set updated_at or invent columns.

// Avatars are stored as client-resized data URLs (isSafeAvatar): never an
// external link, which would load from someone else's server for every
// leader who views the network. MAX_AVATAR_CHARS caps the size so a huge
// image can't be pushed into the database.

// Empty strings should clear a field, and date columns reject "" outright.
function normalise(value: unknown): string | null {
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
    .select(PROFILE_COLUMNS)
    .eq("email", auth.leader.email)
    .maybeSingle();

  if (error) return serverError("leader-profile GET", error);
  return NextResponse.json({ profile: profileResponse(data as unknown as Record<string, unknown> | null) });
}

// PUT /api/leader-profile: upsert the caller's own profile
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

  const row: Record<string, string | number | null> = {
    email: auth.leader.email,
    updated_at: new Date().toISOString(),
  };
  for (const key of PROFILE_TEXT_FIELDS) {
    if (key in body) row[key] = normalise(body[key]);
  }
  if (typeof row.avatar_url === "string" && !isSafeAvatar(row.avatar_url)) {
    return NextResponse.json({ error: "Photo must be an uploaded png, jpeg or webp image." }, { status: 400 });
  }
  const choiceError = profileChoiceError(row);
  if (choiceError) return NextResponse.json({ error: choiceError }, { status: 400 });
  if ("pathwayGroupId" in body) {
    const group = pathwayGroupIdFrom(body.pathwayGroupId);
    if ("error" in group) return NextResponse.json({ error: group.error }, { status: 400 });
    row.pathway_group_id = group.id;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leader_profiles")
    .upsert(row, { onConflict: "email" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error?.code === "23503" && error.message.includes("pathway_group_id")) {
    return NextResponse.json({ error: "That pathway group no longer exists." }, { status: 400 });
  }
  if (error) return serverError("leader-profile PUT", error);
  return NextResponse.json({ profile: profileResponse(data as unknown as Record<string, unknown> | null) });
}
