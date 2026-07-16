import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isAdminAuthorized, adminConfigError } from "@/lib/supabaseAdmin";

const VALID_TYPES = [
  "start-pathway",
  "join-pathway",
  "mission-support",
  "idea-submission",
  "leader-support",
];

// POST: public — record a new form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { form_type, name, email, data } = body;

    if (!form_type || !VALID_TYPES.includes(form_type)) {
      return NextResponse.json({ error: "Invalid form_type" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin().from("form_submissions").insert({
      form_type,
      name: name ?? null,
      email: email ?? null,
      data: data ?? {},
    });

    if (error) {
      console.error("Submission insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submission POST error:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }
}

// GET: admin — list submissions (optionally filter by ?type=)
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let query = getSupabaseAdmin()
    .from("form_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (type && type !== "all") {
    query = query.eq("form_type", type);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submissions: data ?? [] });
}

// PATCH: admin — archive / unarchive a submission
export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const { id, archived } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("form_submissions")
    .update({ archived: !!archived })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE: admin — remove a submission (?id=)
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("form_submissions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
