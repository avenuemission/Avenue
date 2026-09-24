import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { sendLeaderSignupNotification } from "@/lib/emails/public/admin";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";

interface LeaderRecord {
  id: string;
  email: string;
  name: string;
  full_access: boolean;
  created_at: string;
}

// Read a leader by email from Supabase, the only source requireLeader
// reads. A lookup error throws (the POST handler returns 500) so a
// transient failure never makes an existing leader look new.
async function getLeader(email: string): Promise<LeaderRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .select("id, email, name, full_access, created_at")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase leader lookup failed: ${error.message}`);
  }
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    full_access: data.full_access,
    created_at: data.created_at,
  };
}

// Save a NEW leader. The insert ignores an existing row with the same
// email, so an existing leader's full_access is never overwritten. A
// Supabase error throws before any mirror write happens.
async function saveLeader(leader: LeaderRecord): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("leaders")
    .upsert({
      id: leader.id,
      email: leader.email.toLowerCase(),
      name: leader.name,
      full_access: leader.full_access,
      created_at: leader.created_at,
    }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    throw new Error(`Supabase save leader failed: ${error.message}`);
  }
}

// When someone signs up, take over any node their discipler already
// created for them so they keep their place in the network.
//
// This is a convenience, not a guarantee: /api/network creates a node
// lazily for any leader who does not have one. That is why a failure
// here never blocks a signup: it is logged and swallowed instead,
// whether it is a thrown JS exception or a query-level { error } from
// supabase-js (RLS denials and constraint violations do not throw,
// they come back in { error }, so both paths are logged explicitly).
async function claimNetworkNode(email: string, name: string): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || email.split("@")[0];
    const last = parts.slice(1).join(" ") || null;
    const now = new Date().toISOString();

    const { data: existing } = await db
      .from("network_people")
      .select("id, first_name")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const { error } = await db
        .from("network_people")
        .update({ joined: true, first_name: existing.first_name || first, updated_at: now })
        .eq("id", existing.id);
      if (error) {
        console.error("claimNetworkNode failed:", error.message, "email:", email);
      }
      return;
    }

    const { error } = await db.from("network_people").insert({
      email,
      first_name: first,
      last_name: last,
      joined: true,
      added_by_email: email,
    });
    if (error) {
      console.error("claimNetworkNode failed:", error.message, "email:", email);
    }
  } catch (e) {
    console.error("claimNetworkNode failed:", (e as Error).message, "email:", email);
  }
}

// GET: Check access for the signed-in leader (email from the verified session)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireLeader(request);
    if ("response" in auth) return auth.response;

    return NextResponse.json({
      found: true,
      full_access: auth.leader.fullAccess,
      name: auth.leader.name,
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

    // Take over any node their discipler already created for them.
    await claimNetworkNode(String(email).toLowerCase(), name);

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
