import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Simple admin key check (set ADMIN_API_KEY in Netlify environment variables)
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) return false;
  return authHeader === `Bearer ${adminKey}`;
}

// The Supabase `leaders` table is the only source of truth for leader
// access: requireLeader reads it and nothing else.
const LEADER_COLUMNS = "id, email, name, full_access, created_at";

// GET: List all leaders (requires admin auth)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("leaders")
      .select(LEADER_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error listing leaders:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaders: data ?? [] });
  } catch (error) {
    console.error("Error listing leaders:", error);
    return NextResponse.json(
      { error: "Failed to list leaders" },
      { status: 500 }
    );
  }
}

// PUT: Update a leader's access (requires admin auth)
export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    if (error) {
      console.error("Error updating leader:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
    console.error("Error updating leader:", error);
    return NextResponse.json(
      { error: "Failed to update leader" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a leader (requires admin auth)
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    if (error) {
      console.error("Error deleting leader:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
    console.error("Error deleting leader:", error);
    return NextResponse.json(
      { error: "Failed to delete leader" },
      { status: 500 }
    );
  }
}
