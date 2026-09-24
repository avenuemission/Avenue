import { NextRequest, NextResponse } from "next/server";
import { sendLeaderSignupNotification } from "@/lib/emails/public/admin";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, serverError, tooMany } from "@/lib/server/http";
import { isOneEmail, NAME_MAX } from "@/lib/domain/forms";

// The one answer a sign-up gets, new email or not, so this endpoint cannot
// be used to find out who is already a leader.
const RECEIVED = { ok: true, message: "Thanks. We will be in touch once your access is approved." };

type SignupParse = { ok: true; email: string; name: string } | { ok: false; spam: true } | { ok: false; error: string };

// Validates a sign-up body. Any client-sent id is ignored: the server
// makes the id. A filled `company` honeypot is a bot.
function parseSignup(body: unknown): SignupParse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: "Invalid request" };
  const b = body as Record<string, unknown>;
  if (b.company !== undefined && b.company !== "") return { ok: false, spam: true };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!isOneEmail(email)) return { ok: false, error: "Please give one valid email address" };
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > NAME_MAX) return { ok: false, error: `Please give a name of 1 to ${NAME_MAX} characters` };
  return { ok: true, email, name };
}

// Is this email already a leader? A lookup error throws (the handler
// answers 500) so a transient failure never makes an existing leader look new.
async function leaderExists(email: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().from("leaders").select("email").eq("email", email).maybeSingle();
  if (error) throw new Error(`Supabase leader lookup failed: ${error.message}`);
  return Boolean(data);
}

// Saves a NEW pending leader. The insert ignores an existing row with the
// same email, so an existing leader's full_access is never overwritten.
// Returns false when a racing sign-up got there first (nothing inserted).
async function insertPendingLeader(email: string, name: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("leaders")
    .upsert(
      { id: crypto.randomUUID(), email, name, full_access: false, created_at: new Date().toISOString() },
      { onConflict: "email", ignoreDuplicates: true }
    )
    .select("id");
  if (error) throw new Error(`Supabase save leader failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
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

// POST: Request access from /login. Same answer whether or not the email
// is already a leader; only a new email gets a row and an admin email.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request");
  }

  const parsed = parseSignup(body);
  if (!parsed.ok) {
    if ("spam" in parsed) return NextResponse.json(RECEIVED);
    return jsonError(400, parsed.error);
  }
  const { email, name } = parsed;

  try {
    // allow() throws if the limiter itself is down: that is a 500, never
    // an unlimited sign-up.
    if (!(await allow(RATE.signup, clientIp(request)))) return tooMany();

    if (await leaderExists(email)) return NextResponse.json(RECEIVED);
    if (!(await insertPendingLeader(email, name))) return NextResponse.json(RECEIVED);

    // Take over any node their discipler already created for them.
    await claimNetworkNode(email, name);

    // The row is saved, so the sign-up has succeeded; a mail failure is
    // logged, not reported.
    try {
      await sendLeaderSignupNotification(name, email);
    } catch (emailError) {
      console.error("leader-access: signup notification failed", emailError);
    }

    return NextResponse.json(RECEIVED);
  } catch (error) {
    return serverError("leader-access POST", error);
  }
}
