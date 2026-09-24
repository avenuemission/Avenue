import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: boolean;
  created_at: string;
}

// GET: admin, list all leaders from Supabase (the only source requireLeader reads)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .select("id, email, name, full_access, created_at")
    .order("created_at", { ascending: false });

  if (error) return serverError("content/leaders GET", error);
  return NextResponse.json({ leaders: (data ?? []) as LeaderRecord[] });
}

// PUT: admin, update a leader's access
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { email, full_access } = await request.json();
  if (!email || typeof full_access !== "boolean") {
    return NextResponse.json({ error: "email and full_access required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .update({ full_access })
    .eq("email", email.toLowerCase())
    .select();

  if (error) return serverError("content/leaders PUT", error);
  if (!data || data.length === 0) return NextResponse.json({ error: "Leader not found" }, { status: 404 });
  return NextResponse.json({ leader: data[0] });
}

// DELETE: admin, remove a leader
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .delete()
    .eq("email", email.toLowerCase())
    .select("email");

  if (error) return serverError("content/leaders DELETE", error);
  if (!data || data.length === 0) return NextResponse.json({ error: "Leader not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

// POST: admin, create a leader directly
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

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
    return serverError("content/leaders POST", error);
  }
  return NextResponse.json({ leader: data?.[0] ?? null });
}
