import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/server/supabaseAdmin";
import { normaliseEmail, wouldCreateCycle } from "@/lib/domain/network";
import { requireLeader } from "@/lib/server/requireLeader";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { serverError } from "@/lib/server/http";

interface Row {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  sent_out_by: string | null;
  link_status: "pending" | "confirmed";
  joined: boolean;
  apprentice_step: number;
}

const COLUMNS =
  "id, email, first_name, last_name, sent_out_by, link_status, joined, apprentice_step";

// network_people.id is a uuid column. A malformed value passed straight to
// Postgres as a filter or write comes back as a raw database error (uuid
// cast failure), which would otherwise surface as a 500 with the database's
// own message in the response body. Check the shape here instead and 400
// on anything that cannot possibly be a uuid, before it ever reaches a
// query.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

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

// Ferguson's Kingdom Building measure: how many generations descend from the
// viewer, and how many people that is in total. Walked in memory from the
// rows already loaded, breadth-first, one level at a time.
//
// The graph is supposed to be a cycle-free forest (wouldCreateCycle guards
// every write that could introduce a loop), but this walk does not trust
// that: it is the second line of defence, same shape as networkLayout.ts's
// walkRevisits. A node is only ever added to `visited` once, so a corrupted
// row that points back into an ancestor can make a child get re-offered on
// a later level, but it can never be re-counted or re-queued once seen, and
// the loop always terminates because the frontier can only shrink toward
// nodes not yet visited from a finite set.
function computeDepth(rows: Row[], viewerId: string): { generations: number; people: number } {
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (r.sent_out_by) {
      const list = childrenOf.get(r.sent_out_by) ?? [];
      list.push(r.id);
      childrenOf.set(r.sent_out_by, list);
    }
  }

  const visited = new Set<string>([viewerId]);
  let people = 0;
  let generations = 0;
  let frontier = [viewerId];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const childId of childrenOf.get(id) ?? []) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        next.push(childId);
        people++;
      }
    }
    if (next.length === 0) break;
    generations++;
    frontier = next;
  }

  return { generations, people };
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
//
// The `leaders` check MUST run first and unconditionally, before any
// network_people lookup. Every /api/network request is gated by a non-null
// return from this function, and the design spec requires that gate to mean
// "is a leader" (docs/superpowers/specs/2026-08-13-discipleship-network-
// design.md, section 4.1: "The viewer email must exist in `leaders`,
// otherwise 403"). Checking network_people first would let a non-null
// return happen for anyone who merely has a network_people row, including
// people who were only ever NAMED by someone else's "add" and never signed
// up or consented to anything. That would let anyone who knows such a
// person's email read the entire graph, every id, name, email and avatar
// URL in it, which defeats the whole point of the gate. Do not reorder this.
async function ensureNode(email: string): Promise<Row | null> {
  const db = getSupabaseAdmin();

  const { data: leader, error: leaderErr } = await db
    .from("leaders")
    .select("name")
    .eq("email", email)
    .maybeSingle();
  if (leaderErr) throw new Error(leaderErr.message);
  if (!leader) return null;

  const { data: existing, error: existingErr } = await db
    .from("network_people")
    .select(COLUMNS)
    .eq("email", email)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);
  if (existing) return existing as Row;

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

// GET /api/network  (viewer is the signed-in leader)
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  const email = auth.leader.email;

  try {
    const viewer = await ensureNode(email);
    if (!viewer) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    const rows = await loadRows();
    const avatars = await loadAvatars(rows);
    const depth = computeDepth(rows, viewer.id);

    return NextResponse.json({
      viewerId: viewer.id,
      depth,
      people: rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        avatarUrl: (r.email && avatars.get(r.email)) || null,
        sentOutBy: r.sent_out_by,
        linkStatus: r.link_status,
        joined: r.joined,
        apprenticeStep: r.apprentice_step,
      })),
    });
  } catch (e) {
    return serverError("network GET", e);
  }
}

// POST /api/network  { action, ... }  (actor is the signed-in leader)
export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  // request.json() only rejects on malformed JSON, so a literal `null` body
  // (valid JSON) sails past the .catch() below and would make every
  // following `body.xyz` property access throw a TypeError outside the
  // try block, producing an unhandled 500. Collapse anything that is not
  // a genuine object (null, an array, a number, ...) to {} first.
  const parsedBody: unknown = await request.json().catch(() => ({}));
  const body: Record<string, unknown> =
    typeof parsedBody === "object" && parsedBody !== null && !Array.isArray(parsedBody)
      ? (parsedBody as Record<string, unknown>)
      : {};
  const action = String(body.action ?? "");
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    // Admin action, authorised by Bearer token rather than actor email.
    if (action === "reparent") {
      const auth = await requireAdmin(request);
      if ("response" in auth) return auth.response;

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

    // The actor is always the signed-in leader. body.actorEmail is ignored.
    const auth = await requireLeader(request);
    if ("response" in auth) return auth.response;
    const actorEmail = auth.leader.email;

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

    if (action === "set-apprentice-step") {
      const id = String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      if (!isUuid(id)) return NextResponse.json({ error: "id must be a valid id" }, { status: 400 });

      const step = body.step;
      if (typeof step !== "number" || !Number.isInteger(step) || step < 0 || step > 5) {
        return NextResponse.json(
          { error: "step must be an integer from 0 to 5" },
          { status: 400 }
        );
      }

      // Authorisation lives in the filter itself: the row is only touched
      // when its id AND its sent_out_by match this request in the same
      // update. There is no separate read to compare against in JavaScript
      // first, so there is no window where a stale read could approve a
      // write that the database itself would not. A zero-row result means
      // either the person does not exist or the actor is not who sent them
      // out, and both collapse to the same 403: the actor gets no signal
      // about which.
      const { data, error } = await db
        .from("network_people")
        .update({ apprentice_step: step, updated_at: now })
        .eq("id", id)
        .eq("sent_out_by", actor.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "You can only set the step for someone you sent out" },
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // decline clears your own sender. remove clears a link you are on
    // either end of. Both leave the person and their branch in place.
    if (action === "decline" || action === "remove") {
      const id = action === "decline" ? actor.id : String(body.id ?? "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      if (!isUuid(id)) return NextResponse.json({ error: "id must be a valid id" }, { status: 400 });

      // Authorisation lives in the filter itself, same shape as
      // set-apprentice-step just above: there is no separate read to decide
      // in JavaScript first, so there is no window between a read and this
      // write where a concurrent re-parent could change who is allowed to
      // act. A leader may act on `id` when they ARE that person (id equals
      // the actor) OR they are that person's sender (sent_out_by equals the
      // actor) - .or() expresses that second predicate, combined with the
      // .eq("id", id) above by AND, matching Supabase's PostgREST semantics.
      // A zero-row result collapses "no such person" and "not yours" into
      // the same 403, so the actor gets no signal about which.
      const { data, error } = await db
        .from("network_people")
        .update({ sent_out_by: null, link_status: "pending", updated_at: now })
        .eq("id", id)
        .or(`id.eq.${actor.id},sent_out_by.eq.${actor.id}`)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "You can only remove your own links" },
          { status: 403 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return serverError("network POST", e);
  }
}
