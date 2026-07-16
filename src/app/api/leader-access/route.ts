import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getStore } from "@netlify/blobs";
import { sendLeaderSignupNotification } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: boolean;
  created_at: string;
}

// Check if running locally (not on Netlify)
const isLocal = !process.env.NETLIFY;

// In-memory store for local development
const localLeaders: Map<string, LeaderRecord> = new Map([
  ["info@avenuemission.com", {
    id: "1",
    email: "info@avenuemission.com",
    name: "Avenue Admin",
    full_access: true,
    created_at: new Date().toISOString(),
  }],
]);

// Get the Netlify Blobs store for leaders
function getLeadersStore() {
  return getStore({ name: "leaders", consistency: "strong" });
}

// Read a leader by email — Supabase first, then Netlify Blobs fallback
async function getLeader(email: string): Promise<LeaderRecord | null> {
  try {
    const { data: sb } = await getSupabaseAdmin()
      .from("leaders")
      .select("id, email, name, full_access, created_at")
      .eq("email", email.toLowerCase())
      .single();

    if (sb) {
      return {
        id: sb.id,
        email: sb.email,
        name: sb.name,
        full_access: sb.full_access,
        created_at: sb.created_at,
      };
    }
  } catch (error) {
    console.error("Supabase leader lookup error:", error);
  }

  const key = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  
  if (isLocal) {
    return localLeaders.get(email.toLowerCase()) || null;
  }
  
  const store = getLeadersStore();
  const leader = await store.get(key, { type: "json" });
  return leader as LeaderRecord | null;
}

// Save a leader record — Supabase first, then Netlify Blobs fallback
async function saveLeader(leader: LeaderRecord): Promise<void> {
  try {
    await getSupabaseAdmin()
      .from("leaders")
      .upsert({
        id: leader.id,
        email: leader.email.toLowerCase(),
        name: leader.name,
        full_access: leader.full_access,
        created_at: leader.created_at,
      }, { onConflict: "email" });
  } catch (error) {
    console.error("Supabase save leader failed:", error);
  }

  const key = leader.email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  if (isLocal) {
    localLeaders.set(leader.email.toLowerCase(), leader);
    return;
  }

  const store = getLeadersStore();
  await store.setJSON(key, leader);
}

// List all leaders — Supabase first, then Netlify Blobs fallback
async function listLeaders(): Promise<LeaderRecord[]> {
  if (isLocal) {
    return Array.from(localLeaders.values());
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("leaders")
      .select("id, email, name, full_access, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data as LeaderRecord[];
    }
  } catch (error) {
    console.error("Supabase listLeaders failed:", error);
  }

  const store = getLeadersStore();
  const { blobs } = await store.list();
  const leaders: LeaderRecord[] = [];

  for (const blob of blobs) {
    const leader = await store.get(blob.key, { type: "json" });
    if (leader) {
      leaders.push(leader as LeaderRecord);
    }
  }

  return leaders;
}

// GET: Check access for a specific email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const leader = await getLeader(email);

    if (!leader) {
      return NextResponse.json({
        found: false,
        full_access: false,
      });
    }

    return NextResponse.json({
      found: true,
      full_access: leader.full_access,
      name: leader.name,
    });
  } catch (error) {
    console.error("Error checking leader access:", error);
    return NextResponse.json(
      { error: "Failed to check access" },
      { status: 500 }
    );
  }
}

// POST: Register a new leader (called during signup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name required" },
        { status: 400 }
      );
    }

    // Check if leader already exists
    const existingLeader = await getLeader(email);

    if (existingLeader) {
      // Leader already exists, return their current access
      return NextResponse.json({
        success: true,
        full_access: existingLeader.full_access,
        message: "Leader already registered",
      });
    }

    // Add new leader with full_access = false
    const newLeader: LeaderRecord = {
      id: id || Date.now().toString(),
      email,
      name,
      full_access: false,
      created_at: new Date().toISOString(),
    };

    await saveLeader(newLeader);

    // Send email notification to admin about new leader signup
    try {
      await sendLeaderSignupNotification(name, email);
    } catch (emailError) {
      console.error("Failed to send leader signup notification email:", emailError);
    }

    return NextResponse.json({
      success: true,
      full_access: false,
      message: "Leader registered with pending access",
    });
  } catch (error) {
    console.error("Error registering leader:", error);
    return NextResponse.json(
      { error: "Failed to register leader" },
      { status: 500 }
    );
  }
}
