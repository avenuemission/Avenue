import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError, isAdminAuthorized } from "@/lib/supabaseAdmin";

type CheckpointStatus = "none" | "requested" | "complete";

interface ProgressRow {
  email: string;
  watched_episodes: string[];
  completed_modules: string[];
  checkpoint_status: CheckpointStatus;
  checkpoint_requested_at: string | null;
  checkpoint_completed_at: string | null;
  checkpoint_completed_by: string | null;
  updated_at: string;
}

// A single string literal, not a concatenation: Supabase's type-level
// column parser only reads the exact literal type of this constant, and
// string concatenation widens that to plain `string`, breaking it.
const PROGRESS_COLUMNS =
  "email, watched_episodes, completed_modules, checkpoint_status, checkpoint_requested_at, checkpoint_completed_at, checkpoint_completed_by, updated_at";

const MAX_IDS = 500;
const ID_PATTERN = /^[a-z0-9]+$/;

function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  return cleaned === "" ? null : cleaned;
}

// Validates a body field as a list of episode/module ids. Every entry must
// be a plain lowercase-alphanumeric string (e.g. "p1m0", "p1m0e3") and the
// list capped at MAX_IDS, so a caller cannot push arbitrary payloads into
// the row. Returns the clean list, or a readable error to send back as 400.
function validateIdList(value: unknown, field: string): { ids: string[] } | { error: string } {
  if (!Array.isArray(value)) return { error: `${field} must be an array` };
  if (value.length > MAX_IDS) {
    return { error: `${field} must have at most ${MAX_IDS} entries` };
  }
  for (const entry of value) {
    if (typeof entry !== "string" || !ID_PATTERN.test(entry)) {
      return { error: `${field} contains an invalid id: ${JSON.stringify(entry)}` };
    }
  }
  return { ids: value as string[] };
}

function toProgress(row: ProgressRow) {
  return {
    watchedEpisodes: row.watched_episodes ?? [],
    completedModules: row.completed_modules ?? [],
    checkpointStatus: row.checkpoint_status,
    checkpointCompletedAt: row.checkpoint_completed_at,
  };
}

// Every leader gets a progress row the first time anything touches their
// training, so no leader needs a manual backfill. Returns null when the
// email is not a leader at all.
//
// The `leaders` check MUST run first and unconditionally, before any
// leader_training_progress lookup. Every /api/leader-training request that
// is not the admin ?all=1 listing is gated by a non-null return from this
// function, and the design spec requires that gate to mean "is a leader"
// (docs/superpowers/specs/2026-08-14-training-progress-and-checkpoint-
// design.md, section 4: "every non-admin request must prove the caller
// exists in `leaders` BEFORE anything else happens"). Checking
// leader_training_progress first would let a non-null return happen for
// anyone who merely has a progress row there, including a row left behind
// by someone who is no longer a leader. That would let a former leader, or
// anyone who once knew a leader's email, keep reading and writing training
// progress after their access should have ended. Do not reorder this.
async function ensureProgress(email: string): Promise<ProgressRow | null> {
  const db = getSupabaseAdmin();

  const { data: leader, error: leaderErr } = await db
    .from("leaders")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (leaderErr) throw new Error(leaderErr.message);
  if (!leader) return null;

  // Upsert rather than read-then-insert. A read-then-insert has a race: two
  // concurrent first-time requests for the same brand new leader (the
  // training page's initial GET and its first debounced PUT both landing
  // around mount) can both find no row and both attempt to insert, and the
  // loser crashes on a duplicate-key error. The upsert payload only
  // contains `email`, so on conflict it writes `email = excluded.email`
  // (a no-op) rather than resetting any progress already saved, and still
  // returns the row's current values either way.
  const { data, error } = await db
    .from("leader_training_progress")
    .upsert({ email }, { onConflict: "email" })
    .select(PROGRESS_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as ProgressRow;
}

// GET /api/leader-training?email=<leader>
// GET /api/leader-training?all=1  (admin)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  if (url.searchParams.get("all") === "1") {
    // Admin listing, authorised by Bearer token. isAdminAuthorized runs
    // before adminConfigError, not after, so an unauthenticated caller
    // cannot use this endpoint to elicit the service-role-key diagnostic
    // (see the "call right after the isAdminAuthorized check" guidance at
    // src/lib/supabaseAdmin.ts:69).
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const cfgErr = adminConfigError();
    if (cfgErr) return cfgErr;

    try {
      const db = getSupabaseAdmin();

      const { data: rows, error: rowsErr } = await db
        .from("leader_training_progress")
        .select(PROGRESS_COLUMNS);
      if (rowsErr) throw new Error(rowsErr.message);

      const { data: leaders, error: leadersErr } = await db.from("leaders").select("email, name");
      if (leadersErr) throw new Error(leadersErr.message);

      const nameByEmail = new Map((leaders ?? []).map((l) => [l.email as string, l.name as string]));

      return NextResponse.json({
        rows: ((rows ?? []) as ProgressRow[]).map((r) => ({
          email: r.email,
          name: nameByEmail.get(r.email) ?? null,
          watchedEpisodes: r.watched_episodes ?? [],
          completedModules: r.completed_modules ?? [],
          checkpointStatus: r.checkpoint_status,
          checkpointRequestedAt: r.checkpoint_requested_at,
          checkpointCompletedAt: r.checkpoint_completed_at,
          checkpointCompletedBy: r.checkpoint_completed_by,
          updatedAt: r.updated_at,
        })),
      });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const email = normaliseEmail(url.searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    const row = await ensureProgress(email);
    if (!row) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });
    return NextResponse.json({ progress: toProgress(row) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PUT /api/leader-training  { email, watchedEpisodes, completedModules }
export async function PUT(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const body = await request.json().catch(() => ({}));
  const email = normaliseEmail(body.email);
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const watched = validateIdList(body.watchedEpisodes, "watchedEpisodes");
  if ("error" in watched) return NextResponse.json({ error: watched.error }, { status: 400 });

  const completed = validateIdList(body.completedModules, "completedModules");
  if ("error" in completed) return NextResponse.json({ error: completed.error }, { status: 400 });

  try {
    const existing = await ensureProgress(email);
    if (!existing) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    // Explicit keys only, never a spread of the request body. checkpoint_status
    // is not one of them: a leader saving their own watched episodes and
    // completed modules can never touch their own checkpoint status, which is
    // exactly the field the whole Launch gate depends on (design spec section
    // 4.2). A spread here would let a PUT body smuggle checkpointStatus in and
    // complete its own checkpoint.
    const { data, error } = await getSupabaseAdmin()
      .from("leader_training_progress")
      .update({
        watched_episodes: watched.ids,
        completed_modules: completed.ids,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .select(PROGRESS_COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, progress: toProgress(data as ProgressRow) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/leader-training  { action, email }
export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const email = normaliseEmail(body.email);
  const now = new Date().toISOString();

  // complete-checkpoint and reopen-checkpoint are admin-only and must be
  // refused before any read or write happens, the same lesson already
  // proven on /api/network: an authorisation check that runs after a read
  // has already let the read happen for an unauthorised caller.
  if (action === "complete-checkpoint" || action === "reopen-checkpoint") {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    const existing = await ensureProgress(email);
    if (!existing) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    const db = getSupabaseAdmin();

    if (action === "request-checkpoint") {
      // Only none -> requested. A status that is already requested or
      // complete is left untouched and reported as success, so a leader who
      // double-clicks, or reloads after their call is already booked, can
      // never downgrade a complete checkpoint back to requested.
      if (existing.checkpoint_status !== "none") {
        return NextResponse.json({ ok: true, progress: toProgress(existing) });
      }

      const { data, error } = await db
        .from("leader_training_progress")
        .update({
          checkpoint_status: "requested",
          checkpoint_requested_at: now,
          updated_at: now,
        })
        .eq("email", email)
        .select(PROGRESS_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, progress: toProgress(data as ProgressRow) });
    }

    if (action === "complete-checkpoint") {
      // There is currently a single shared admin Bearer token and no
      // per-admin identity in the POST contract, so "admin-token" marks the
      // era (releases made under the shared-token scheme) rather than the
      // person. Once individual admin identity exists, this should record
      // that instead. It must stay distinguishable from a real identity so
      // a disputed release is never mistaken for one.
      const { data, error } = await db
        .from("leader_training_progress")
        .update({
          checkpoint_status: "complete",
          checkpoint_completed_at: now,
          checkpoint_completed_by: "admin-token",
          updated_at: now,
        })
        .eq("email", email)
        .select(PROGRESS_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, progress: toProgress(data as ProgressRow) });
    }

    if (action === "reopen-checkpoint") {
      const { data, error } = await db
        .from("leader_training_progress")
        .update({
          checkpoint_status: "none",
          checkpoint_requested_at: null,
          checkpoint_completed_at: null,
          checkpoint_completed_by: null,
          updated_at: now,
        })
        .eq("email", email)
        .select(PROGRESS_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, progress: toProgress(data as ProgressRow) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
