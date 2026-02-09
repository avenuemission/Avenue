import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getStore } from "@netlify/blobs";

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: boolean;
  created_at: string;
}

// Simple admin key check (set ADMIN_API_KEY in Netlify environment variables)
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const adminKey = process.env.ADMIN_API_KEY;
  
  if (!adminKey) return false;
  return authHeader === `Bearer ${adminKey}`;
}

// GET: List all leaders (requires admin auth)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = getStore({ name: "leaders", consistency: "strong" });
    const { blobs } = await store.list();
    const leaders: LeaderRecord[] = [];

    for (const blob of blobs) {
      const leader = await store.get(blob.key, { type: "json" });
      if (leader) {
        leaders.push(leader as LeaderRecord);
      }
    }

    return NextResponse.json({ leaders });
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

    if (!email || typeof full_access !== "boolean") {
      return NextResponse.json(
        { error: "Email and full_access (boolean) required" },
        { status: 400 }
      );
    }

    const store = getStore({ name: "leaders", consistency: "strong" });
    const key = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
    
    const existing = await store.get(key, { type: "json" }) as LeaderRecord | null;
    
    if (!existing) {
      return NextResponse.json(
        { error: "Leader not found" },
        { status: 404 }
      );
    }

    const updated: LeaderRecord = {
      ...existing,
      full_access,
    };

    await store.setJSON(key, updated);

    return NextResponse.json({
      success: true,
      leader: updated,
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

    const store = getStore({ name: "leaders", consistency: "strong" });
    const key = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
    
    await store.delete(key);

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
