import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

// The Supabase `leaders` table is the only source of truth for leader
// access: requireLeader reads it and nothing else.
const LEADER_COLUMNS = "id, email, name, full_access, created_at";

// GET: List all leaders (requires admin auth)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("leaders")
      .select(LEADER_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) return serverError("leader-access/admin GET", error);

    return NextResponse.json({ leaders: data ?? [] });
  } catch (error) {
    return serverError("leader-access/admin GET", error);
  }
}

// PUT: Update a leader's access (requires admin auth)
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await request.json();
    const { email, full_access } = body;

    if (!email || typeof email !== "string" || typeof full_access !== "boolean") {
      return NextResponse.json(
        { error: "Email and full_access (boolean) required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("leaders")
      .update({ full_access })
      .eq("email", email.toLowerCase())
      .select(LEADER_COLUMNS);

    if (error) return serverError("leader-access/admin PUT", error);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      leader: data[0],
    });
  } catch (error) {
    return serverError("leader-access/admin PUT", error);
  }
}

// DELETE: Remove a leader (requires admin auth)
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("leaders")
      .delete()
      .eq("email", email.toLowerCase())
      .select("email");

    if (error) return serverError("leader-access/admin DELETE", error);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Leader not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Leader ${email} deleted`,
    });
  } catch (error) {
    return serverError("leader-access/admin DELETE", error);
  }
}
