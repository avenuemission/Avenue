import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isAdminAuthorized, adminConfigError } from "@/lib/supabaseAdmin";
import { getStore } from "@netlify/blobs";

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: boolean;
  created_at: string;
}

const isLocal = !process.env.NETLIFY;

// GET: admin — list all leaders (Supabase + Netlify Blobs fallback)
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const leaders: LeaderRecord[] = [];

  // Read from Supabase
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("leaders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      leaders.push(...data as LeaderRecord[]);
    }
  } catch (error) {
    console.error("Supabase leaders read error:", error);
  }

  // Read from Netlify Blobs fallback (merge without duplicates)
  if (!isLocal) {
    try {
      const store = getStore({ name: "leaders", consistency: "strong" });
      const { blobs } = await store.list();
      for (const blob of blobs) {
        const leader = await store.get(blob.key, { type: "json" });
        if (leader && !leaders.some((l) => l.email === leader.email)) {
          leaders.push(leader as LeaderRecord);
        }
      }
    } catch (error) {
      console.error("Netlify Blobs leaders read error:", error);
    }
  }

  return NextResponse.json({ leaders });
}

// PUT: admin — update a leader's access
export async function PUT(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

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
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

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
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

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
