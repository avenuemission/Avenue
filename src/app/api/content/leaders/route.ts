import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isAdminAuthorized } from "@/lib/supabaseAdmin";

// GET: admin — list all leaders
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leaders: data ?? [] });
}

// PUT: admin — update a leader's access
export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, full_access } = await request.json();
  if (!email || typeof full_access !== "boolean") {
    return NextResponse.json({ error: "email and full_access required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .update({ full_access })
    .eq("email", email.toLowerCase())
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Leader not found" }, { status: 404 });
  return NextResponse.json({ leader: data[0] });
}

// DELETE: admin — remove a leader
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("leaders")
    .delete()
    .eq("email", email.toLowerCase());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// POST: admin — create a leader directly
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, email, name, full_access } = await request.json();
  if (!email || !name) {
    return NextResponse.json({ error: "email and name required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .insert({
      id: id || Date.now().toString(),
      email: email.toLowerCase(),
      name,
      full_access: full_access ?? false,
    })
    .select();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Leader already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ leader: data?.[0] ?? null });
}
