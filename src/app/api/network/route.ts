import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError, isAdminAuthorized } from "@/lib/supabaseAdmin";
import { normaliseEmail, wouldCreateCycle } from "@/lib/network";

interface Row {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  sent_out_by: string | null;
  link_status: "pending" | "confirmed";
  joined: boolean;
}

const COLUMNS = "id, email, first_name, last_name, sent_out_by, link_status, joined";

async function loadRows(): Promise<Row[]> {
  const { data, error } = await getSupabaseAdmin().from("network_people").select(COLUMNS);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

// Photos live on leader_profiles, keyed by email. One extra query beats
// duplicating avatar data into this table.
async function loadAvatars(rows: Row[]): Promise<Map<string, string>> {
  const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
  if (emails.length === 0) return new Map();

  const { data } = await getSupabaseAdmin()
    .from("leader_profiles")
    .select("email, avatar_url")
    .in("email", emails);

  const map = new Map<string, string>();
  for (const profile of data ?? []) {
    if (profile.avatar_url) map.set(profile.email, profile.avatar_url);
  }
  return map;
}

function splitName(full: string, email: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || email.split("@")[0],
    last: parts.slice(1).join(" ") || null,
  };
}

// Every leader gets a node the first time they touch the network, so the
// accounts that predate this table need no manual backfill. Returns null
// when the email is not a leader at all.
async function ensureNode(email: string): Promise<Row | null> {
  const db = getSupabaseAdmin();

  const { data: existing } = await db
    .from("network_people")
    .select(COLUMNS)
    .eq("email", email)
    .maybeSingle();
  if (existing) return existing as Row;

  const { data: leader } = await db
    .from("leaders")
    .select("name")
    .eq("email", email)
    .maybeSingle();
  if (!leader) return null;

  const { first, last } = splitName(String(leader.name ?? ""), email);
  const { data, error } = await db
    .from("network_people")
    .insert({
      email,
      first_name: first,
      last_name: last,
      joined: true,
      added_by_email: email,
    })
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data as Row;
}

// GET /api/network?email=<viewer>
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const email = normaliseEmail(new URL(request.url).searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    const viewer = await ensureNode(email);
    if (!viewer) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    const rows = await loadRows();
    const avatars = await loadAvatars(rows);

    return NextResponse.json({
      viewerId: viewer.id,
      people: rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        avatarUrl: (r.email && avatars.get(r.email)) || null,
        sentOutBy: r.sent_out_by,
        linkStatus: r.link_status,
        joined: r.joined,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/network  { action, actorEmail, ... }
export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    // Admin action, authorised by Bearer token rather than actor email.
    if (action === "reparent") {
      if (!isAdminAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
      }

      const id = String(body.id ?? "");
      const newParentId = body.newParentId ? String(body.newParentId) : null;
      const rows = await loadRows();

      if (!rows.some((r) => r.id === id)) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }
      if (newParentId && !rows.some((r) => r.id === newParentId)) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
      }

      const parentOf = new Map(rows.map((r) => [r.id, r.sent_out_by]));
      if (wouldCreateCycle(parentOf, id, newParentId)) {
        return NextResponse.json({ error: "That would create a loop" }, { status: 400 });
      }

      const { error } = await db
        .from("network_people")
        .update({
          sent_out_by: newParentId,
          link_status: newParentId ? "confirmed" : "pending",
          updated_at: now,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    const actorEmail = normaliseEmail(body.actorEmail);
    if (!actorEmail) return NextResponse.json({ error: "actorEmail required" }, { status: 400 });

    const actor = await ensureNode(actorEmail);
    if (!actor) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    if (action === "add") {
      const firstName = String(body.firstName ?? "").trim();
      if (!firstName) {
        return NextResponse.json({ error: "First name is required" }, { status: 400 });
      }
      const lastName = String(body.lastName ?? "").trim() || null;
      const email = normaliseEmail(body.email);

      if (email) {
        const { data: found } = await db
          .from("network_people")
          .select(COLUMNS)
          .eq("email", email)
          .maybeSingle();

        if (found) {
          const row = found as Row;
          if (row.id === actor.id) {
            return NextResponse.json({ error: "You cannot send yourself out" }, { status: 400 });
          }
          if (row.sent_out_by) {
            const { data: sender } = await db
              .from("network_people")
              .select("first_name")
              .eq("id", row.sent_out_by)
              .maybeSingle();
            return NextResponse.json(
              { error: `${sender?.first_name ?? "Someone"} has already added them.` },
              { status: 409 }
            );
          }

          // Adopting an existing person can close a loop, so check first.
          const rows = await loadRows();
          const parentOf = new Map(rows.map((r) => [r.id, r.sent_out_by]));
          if (wouldCreateCycle(parentOf, row.id, actor.id)) {
            return NextResponse.json({ error: "That would create a loop" }, { status: 400 });
          }

          const { error } = await db
            .from("network_people")
            .update({ sent_out_by: actor.id, link_status: "pending", updated_at: now })
            .eq("id", row.id);
          if (error) throw new Error(error.message);
          return NextResponse.json({ ok: true, adopted: true });
        }
      }

      const { error } = await db.from("network_people").insert({
        email,
        first_name: firstName,
        last_name: lastName,
        sent_out_by: actor.id,
        link_status: "pending",
        added_by_email: actorEmail,
        joined: false,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, adopted: false });
    }

    if (action === "confirm") {
      if (!actor.sent_out_by) {
        return NextResponse.json({ error: "Nothing to confirm" }, { status: 400 });
      }
      const { error } = await db
        .from("network_people")
        .update({ link_status: "confirmed", updated_at: now })
        .eq("id", actor.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    // decline clears your own sender. remove clears a link you are on
    // either end of. Both leave the person and their branch in place.
    if (action === "decline" || action === "remove") {
      const id = action === "decline" ? actor.id : String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

      const { data: found } = await db
        .from("network_people")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (!found) return NextResponse.json({ error: "Person not found" }, { status: 404 });

      const row = found as Row;
      if (row.id !== actor.id && row.sent_out_by !== actor.id) {
        return NextResponse.json(
          { error: "You can only remove your own links" },
          { status: 403 }
        );
      }

      const { error } = await db
        .from("network_people")
        .update({ sent_out_by: null, link_status: "pending", updated_at: now })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
