import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/server/supabaseAdmin";
import { requireLeader } from "@/lib/server/requireLeader";
import { serverError } from "@/lib/server/http";

interface CheckinRow {
  email: string;
  week_start: string;
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
  reflection: string | null;
  updated_at: string;
}

// A single string literal, not a concatenation: Supabase's type-level
// column parser only reads the exact literal type of this constant, and
// string concatenation widens that to plain `string`, breaking it.
const COLUMNS = "email, week_start, relational, physical, mental, spiritual, reflection, updated_at";

// How many recent weeks a GET returns. A leader reflecting weekly for a
// full year is 52 rows; nothing in the product needs more than that in one
// response.
const MAX_CHECKINS = 52;

const WEEK_START_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Timezone decision, spelled out because both halves of the weekStart check
// (Monday, not in the future) are easy to get subtly wrong across zones:
//
// The Monday check is timezone-free by construction. weekStart is a plain
// calendar date ("2026-08-31"), not an instant, so it is parsed with
// Date.UTC and read back with getUTCDay/getUTCFullYear/etc. Using the local
// or UTC "now" would be a category error here; there is no "now" involved
// in asking what day of the week a given date fell on.
//
// The future check is different: it asks how a specific calendar date
// compares to "today", and "today" genuinely depends on where the caller
// is standing. Every leader is in Melbourne, and Melbourne runs AHEAD of
// the server's UTC clock (+10 AEST / +11 AEDT). That means for a chunk of
// every single day, the UTC calendar date is still "yesterday" relative to
// Melbourne, most obviously right after midnight Melbourne time: a leader
// filling in their check-in at, say, 9am Monday in Melbourne is acting at a
// moment when the UTC clock can still read Sunday. If "today" were computed
// from the server's own UTC clock, that leader's own current week would
// compare as later than "today" and get rejected as a future date, which
// is exactly the failure this comment exists to prevent.
//
// So "today" is asked for directly in the Australia/Melbourne zone via
// Intl, using the en-CA locale because it formats as YYYY-MM-DD, matching
// weekStart's own format so the two can be compared as plain strings. This
// also means the AEST/AEDT daylight-saving switch is handled by the
// platform's timezone database rather than a hardcoded +10/+11 offset that
// would silently go wrong twice a year.
function melbourneTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
}

// How many days ahead of Melbourne's own calendar date a submitted
// weekStart is still allowed to be. Every leader is assumed to be in
// Melbourne, but a leader's device is not: someone genuinely in a
// timezone ahead of Melbourne, for example New Zealand, computes their own
// current Monday correctly and can be up to about a day ahead of
// Melbourne's calendar date while doing so (verified: Auckland Monday
// 00:30 sends 2026-08-31 while Melbourne is still 2026-08-30). Two days of
// slack comfortably covers that gap for any real timezone ahead of
// Melbourne, while a week that is genuinely in the future is always at
// least 7 days out, so it is still refused.
const FUTURE_SLACK_DAYS = 2;

// melbourneTodayISO() plus FUTURE_SLACK_DAYS, in the same YYYY-MM-DD shape
// so it can be compared against weekStart as a plain string, the same way
// melbourneTodayISO() itself is used below.
function melbourneTodayPlusSlackISO(): string {
  const [y, m, d] = melbourneTodayISO().split("-").map(Number);
  const withSlack = new Date(Date.UTC(y, m - 1, d));
  withSlack.setUTCDate(withSlack.getUTCDate() + FUTURE_SLACK_DAYS);
  const yy = withSlack.getUTCFullYear();
  const mm = String(withSlack.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(withSlack.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Validates the `weekStart` body/query field: must be an ISO YYYY-MM-DD
// string, a real calendar date, a Monday, and not later than today in
// Melbourne. Returns the clean string, or a readable error to send back as
// 400 naming the field.
function validateWeekStart(value: unknown): { weekStart: string } | { error: string } {
  if (typeof value !== "string" || !WEEK_START_PATTERN.test(value)) {
    return { error: "weekStart must be an ISO date string (YYYY-MM-DD)" };
  }

  const [y, m, d] = value.split("-").map(Number);
  const asDate = new Date(Date.UTC(y, m - 1, d));
  // Catches calendar-invalid dates such as 2026-02-30, which Date.UTC would
  // otherwise silently roll forward into March rather than reject.
  if (asDate.getUTCFullYear() !== y || asDate.getUTCMonth() !== m - 1 || asDate.getUTCDate() !== d) {
    return { error: "weekStart must be a real calendar date" };
  }

  // getUTCDay: 0 = Sunday .. 6 = Saturday, so 1 = Monday. weekStart carries
  // no time-of-day or zone, so this is a fixed fact about the date itself,
  // not something that depends on where anyone is standing.
  if (asDate.getUTCDay() !== 1) {
    return { error: "weekStart must be a Monday" };
  }

  // Plain string comparison is safe and correct here because both sides are
  // zero-padded YYYY-MM-DD, so lexicographic order matches chronological
  // order exactly. Compared against today-plus-slack, not today itself, so
  // a real timezone ahead of Melbourne can still file its own current
  // week; see FUTURE_SLACK_DAYS above.
  if (value > melbourneTodayPlusSlackISO()) {
    return { error: "weekStart must not be in the future" };
  }

  return { weekStart: value };
}

// Validates one of the four body fields as an integer score from 1 to 10
// inclusive. Rejects 0, 11, fractional values, and numeric strings: the
// score must arrive as an actual JS number already in range.
function validateScore(value: unknown, field: string): { score: number } | { error: string } {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 10) {
    return { error: `${field} must be an integer from 1 to 10` };
  }
  return { score: value };
}

// `reflection` is optional. Absent or null both mean "no reflection this
// week" and are stored as null; anything else must be a string capped at
// 2000 characters.
function validateReflection(value: unknown): { reflection: string | null } | { error: string } {
  if (value === undefined || value === null) return { reflection: null };
  if (typeof value !== "string") return { error: "reflection must be a string" };
  if (value.length > 2000) return { error: "reflection must be at most 2000 characters" };
  return { reflection: value };
}

function toCheckin(row: CheckinRow) {
  return {
    weekStart: row.week_start,
    relational: row.relational,
    physical: row.physical,
    mental: row.mental,
    spiritual: row.spiritual,
    reflection: row.reflection,
    updatedAt: row.updated_at,
  };
}

// The `leaders` check MUST run first and unconditionally, before any
// leader_checkins query. This mirrors leader-training's ensureProgress and
// network's ensureNode exactly, for the same reason spelled out there: an
// earlier version of this pattern in this project queried the feature
// table first and returned any row it found, which let anyone with a row
// in that table act as an authorised caller. leader_checkins is only ever
// written by this route today, so no row can currently exist for a
// non-leader email, but the check still runs first and unconditionally
// rather than relying on that being true forever. Do not reorder this.
async function isLeader(email: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("leaders").select("email").eq("email", email).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

// GET /api/leader-checkins: the signed-in leader's own check-ins
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  const email = auth.leader.email;

  try {
    const leader = await isLeader(email);
    if (!leader) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    const { data, error } = await getSupabaseAdmin()
      .from("leader_checkins")
      .select(COLUMNS)
      .eq("email", email)
      .order("week_start", { ascending: false })
      .limit(MAX_CHECKINS);
    if (error) throw new Error(error.message);

    return NextResponse.json({ checkins: ((data ?? []) as unknown as CheckinRow[]).map(toCheckin) });
  } catch (e) {
    return serverError("leader-checkins GET", e);
  }
}

// PUT /api/leader-checkins  { weekStart, relational, physical, mental, spiritual, reflection }
export async function PUT(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  // request.json() only rejects on malformed JSON, so a literal `null` body
  // (valid JSON) sails past the .catch() below and would make every
  // following `body.xyz` property access throw a TypeError outside the
  // try block, producing an unhandled 500. Collapse anything that is not a
  // genuine object (null, an array, a number, ...) to {} first.
  const parsedBody: unknown = await request.json().catch(() => ({}));
  const body: Record<string, unknown> =
    typeof parsedBody === "object" && parsedBody !== null && !Array.isArray(parsedBody)
      ? (parsedBody as Record<string, unknown>)
      : {};
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;
  const email = auth.leader.email;

  const weekStartResult = validateWeekStart(body.weekStart);
  if ("error" in weekStartResult) return NextResponse.json({ error: weekStartResult.error }, { status: 400 });
  const { weekStart } = weekStartResult;

  const relationalResult = validateScore(body.relational, "relational");
  if ("error" in relationalResult) return NextResponse.json({ error: relationalResult.error }, { status: 400 });

  const physicalResult = validateScore(body.physical, "physical");
  if ("error" in physicalResult) return NextResponse.json({ error: physicalResult.error }, { status: 400 });

  const mentalResult = validateScore(body.mental, "mental");
  if ("error" in mentalResult) return NextResponse.json({ error: mentalResult.error }, { status: 400 });

  const spiritualResult = validateScore(body.spiritual, "spiritual");
  if ("error" in spiritualResult) return NextResponse.json({ error: spiritualResult.error }, { status: 400 });

  const reflectionResult = validateReflection(body.reflection);
  if ("error" in reflectionResult) return NextResponse.json({ error: reflectionResult.error }, { status: 400 });

  try {
    const leader = await isLeader(email);
    if (!leader) return NextResponse.json({ error: "Not a leader account" }, { status: 403 });

    // Upsert on the composite primary key (email, week_start), so
    // re-submitting the same week edits that row instead of stacking a
    // second one for it. This is a single atomic INSERT ... ON CONFLICT DO
    // UPDATE statement, not a read-then-decide-in-JavaScript insert-vs-
    // update: check-then-act has caused three separate bugs in this
    // project (see leader-training's ensureProgress and its own upsert),
    // and reading for existence first here would reopen exactly that shape
    // for no benefit, since the database can already do the right thing in
    // one step. created_at is intentionally left out of the payload so its
    // column default only fires on first insert and is never touched by a
    // later edit of the same week.
    const { data, error } = await getSupabaseAdmin()
      .from("leader_checkins")
      .upsert(
        {
          email,
          week_start: weekStart,
          relational: relationalResult.score,
          physical: physicalResult.score,
          mental: mentalResult.score,
          spiritual: spiritualResult.score,
          reflection: reflectionResult.reflection,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email,week_start" }
      )
      .select(COLUMNS)
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, checkin: toCheckin(data as unknown as CheckinRow) });
  } catch (e) {
    return serverError("leader-checkins PUT", e);
  }
}
