// Exercises /api/leader-checkins against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/smoke/check-checkins-api.mjs
import { createClient } from "@supabase/supabase-js";
import { tokenFor } from "../lib/fixtures.mjs";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const STRANGER_EMAIL = "checkins-check-temp@example.invalid";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// A real session token for LEADER. The route takes the caller's email from
// this token only; nothing in a query string or body names the caller.
const TOKEN = await tokenFor(LEADER);

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

const authHeaders = (token) => (token ? { authorization: `Bearer ${token}` } : {});

const get = (token = TOKEN) =>
  fetch(`${BASE}/api/leader-checkins`, { headers: authHeaders(token) }).then(async (r) => ({
    status: r.status,
    json: await r.json(),
  }));

const put = (body, token = TOKEN) =>
  fetch(`${BASE}/api/leader-checkins`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

// Every date used below is computed relative to the machine's clock, well
// clear of "today" in either direction, so none of these checks ever land
// on the future-date boundary this route is deliberately careful about.
// getUTCDay: 0 = Sunday .. 6 = Saturday.
function mondayWeeksAgo(n) {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday - n * 7)
  );
  return monday.toISOString().slice(0, 10);
}

// WEEK is safely three weeks in the past: real, a genuine Monday, and never
// borderline against "today" in any timezone this script or the server
// could be running in. It is the only week this script's successful PUTs
// ever write to, which is what makes the finally block's per-week
// capture/restore exact.
const WEEK = mondayWeeksAgo(3);
const WEEK_NOT_MONDAY = (() => {
  const d = new Date(`${WEEK}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1); // WEEK is a Monday, so +1 day is a Tuesday.
  return d.toISOString().slice(0, 10);
})();
// Next week's Monday: always in the future relative to "now" in any zone,
// including Melbourne, since a full week's margin swamps any UTC/AEST/AEDT
// offset.
const WEEK_FUTURE = mondayWeeksAgo(-1);

// Mirrors route.ts's own melbourneTodayISO(): asks for "today" directly in
// the Australia/Melbourne zone via Intl, en-CA formatting to get YYYY-MM-DD.
// WEEK_FUTURE above is deliberately timezone-agnostic (a full week's margin
// swamps any offset), which is exactly why it CANNOT tell a Melbourne-aware
// implementation apart from a server-UTC one: both agree next Monday is in
// the future. This constant exists for the opposite job - proving the
// CURRENT week is accepted - which only distinguishes the two
// implementations because Melbourne runs 10-11 hours ahead of UTC, so for
// roughly the first eleven hours of every Monday in Melbourne, the UTC
// calendar date is still Sunday. A regression to server-UTC "today" would
// reject exactly this PUT during that window, locking every Melbourne
// leader out of their own current week.
function melbourneTodayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
}
function currentMelbourneMonday() {
  const [y, m, d] = melbourneTodayISO().split("-").map(Number);
  const asUTC = new Date(Date.UTC(y, m - 1, d));
  const daysSinceMonday = (asUTC.getUTCDay() + 6) % 7;
  asUTC.setUTCDate(asUTC.getUTCDate() - daysSinceMonday);
  return asUTC.toISOString().slice(0, 10);
}
const WEEK_CURRENT_MELBOURNE = currentMelbourneMonday();

const validBody = { weekStart: WEEK, relational: 7, physical: 6, mental: 8, spiritual: 9 };

async function cleanupStranger() {
  const { error } = await db.from("leader_checkins").delete().eq("email", STRANGER_EMAIL).eq("week_start", WEEK);
  return error;
}

async function countRows(email, weekStart) {
  const { count, error } = await db
    .from("leader_checkins")
    .select("email", { count: "exact", head: true })
    .eq("email", email)
    .eq("week_start", weekStart);
  if (error) throw new Error(error.message);
  return count;
}

// The LEADER row (info@avenuemission.com) is real production data. This
// script writes to two weeks for that email - WEEK (a fixed week safely in
// the past) and WEEK_CURRENT_MELBOURNE (today's actual current week, used
// only by the regression guard below) - so each (email, week_start) pair
// gets its own capture/restore, by the same exact-match filter used in both
// directions.
let leaderWeekBefore = null;
let leaderCurrentWeekBefore = null;

const preRunCleanupErr = await cleanupStranger();
if (preRunCleanupErr) {
  console.error("warning: pre-run cleanup of the stranger row failed:", preRunCleanupErr.message);
}

try {
  console.log(`capture the leader's existing check-in for ${WEEK}, if any`);
  const { data: captured, error: captureErr } = await db
    .from("leader_checkins")
    .select("relational, physical, mental, spiritual, reflection, created_at, updated_at")
    .eq("email", LEADER)
    .eq("week_start", WEEK)
    .maybeSingle();
  if (captureErr) throw new Error(captureErr.message);
  leaderWeekBefore = captured; // null is a valid captured state: no row yet.

  console.log(`capture the leader's existing check-in for the current Melbourne week ${WEEK_CURRENT_MELBOURNE}, if any`);
  const { data: capturedCurrent, error: captureCurrentErr } = await db
    .from("leader_checkins")
    .select("relational, physical, mental, spiritual, reflection, created_at, updated_at")
    .eq("email", LEADER)
    .eq("week_start", WEEK_CURRENT_MELBOURNE)
    .maybeSingle();
  if (captureCurrentErr) throw new Error(captureCurrentErr.message);
  leaderCurrentWeekBefore = capturedCurrent; // null is a valid captured state: no row yet.

  console.log("GET for a real leader");
  const got = await get();
  check("returns 200", got.status === 200, JSON.stringify(got.json));
  check("returns a checkins array", Array.isArray(got.json?.checkins), JSON.stringify(got.json));

  console.log("GET with no token");
  const denied = await get(null);
  check("returns 401", denied.status === 401, JSON.stringify(denied.json));

  console.log("PUT with no token");
  // The session check must be the first gate on this path, so this PUT
  // must be refused before any upsert happens - if it were ever dropped
  // from PUT specifically (while GET kept it), every other assertion in
  // this file would still pass while anyone on earth could write check-ins.
  const deniedPut = await put({ ...validBody, email: STRANGER_EMAIL }, null);
  check("returns 401", deniedPut.status === 401, JSON.stringify(deniedPut.json));

  console.log("PUT stores a check-in and GET reads it back identically");
  const putOk = await put({ ...validBody, reflection: "Steady week, low sleep." });
  check("PUT succeeds", putOk.status === 200, JSON.stringify(putOk.json));
  check("PUT response echoes weekStart", putOk.json?.checkin?.weekStart === WEEK, putOk.json?.checkin?.weekStart);

  const afterPut = await get();
  const row = (afterPut.json?.checkins ?? []).find((c) => c.weekStart === WEEK);
  check("the stored week is present in GET", !!row, JSON.stringify(afterPut.json));
  check("relational round-trips", row?.relational === 7, row?.relational);
  check("physical round-trips", row?.physical === 6, row?.physical);
  check("mental round-trips", row?.mental === 8, row?.mental);
  check("spiritual round-trips", row?.spiritual === 9, row?.spiritual);
  check(
    "reflection round-trips",
    row?.reflection === "Steady week, low sleep.",
    row?.reflection
  );
  check("updatedAt is a string", typeof row?.updatedAt === "string", row?.updatedAt);

  console.log("PUT for the same week updates rather than duplicating");
  const rowCountAfterFirst = await countRows(LEADER, WEEK);
  check("exactly one row exists after the first PUT", rowCountAfterFirst === 1, rowCountAfterFirst);

  const putAgain = await put({ ...validBody, relational: 3, reflection: "Rough one, leaning on the team." });
  check("second PUT succeeds", putAgain.status === 200, JSON.stringify(putAgain.json));

  const rowCountAfterSecond = await countRows(LEADER, WEEK);
  check(
    "still exactly one row for the same (email, week_start) after a second PUT",
    rowCountAfterSecond === 1,
    rowCountAfterSecond
  );

  const afterSecondPut = await get();
  const rowAfterSecond = (afterSecondPut.json?.checkins ?? []).find((c) => c.weekStart === WEEK);
  check(
    "the row reflects the second PUT's values, not the first's",
    rowAfterSecond?.relational === 3 && rowAfterSecond?.reflection === "Rough one, leaning on the team.",
    JSON.stringify(rowAfterSecond)
  );

  console.log("a non-Monday weekStart is refused with 400");
  const notMonday = await put({ ...validBody, weekStart: WEEK_NOT_MONDAY });
  check("returns 400", notMonday.status === 400, JSON.stringify(notMonday.json));
  check(
    "the error names weekStart",
    typeof notMonday.json?.error === "string" && notMonday.json.error.toLowerCase().includes("weekstart"),
    notMonday.json?.error
  );

  console.log("a future weekStart is refused with 400");
  const future = await put({ ...validBody, weekStart: WEEK_FUTURE });
  check("returns 400", future.status === 400, JSON.stringify(future.json));
  check(
    "the error names weekStart",
    typeof future.json?.error === "string" && future.json.error.toLowerCase().includes("weekstart"),
    future.json?.error
  );

  console.log(`the CURRENT Melbourne week (${WEEK_CURRENT_MELBOURNE}) is accepted with 200`);
  // Regression guard: WEEK_FUTURE above proves next Monday is rejected, but
  // that holds true whether "today" is computed in Melbourne or in server
  // UTC, so it cannot tell the two implementations apart. This PUT is the
  // check that can: it is only guaranteed to pass under the real,
  // Melbourne-aware implementation. A refactor to server-UTC "today" would
  // make this fail (loudly, as a genuine FAIL line below) for roughly the
  // first eleven hours of every Monday in Melbourne, which is exactly the
  // window where it would otherwise silently lock leaders out of their own
  // current week.
  const currentWeekPut = await put({ ...validBody, weekStart: WEEK_CURRENT_MELBOURNE });
  check("returns 200", currentWeekPut.status === 200, JSON.stringify(currentWeekPut.json));
  check(
    "PUT response echoes weekStart",
    currentWeekPut.json?.checkin?.weekStart === WEEK_CURRENT_MELBOURNE,
    currentWeekPut.json?.checkin?.weekStart
  );

  console.log("a relational score of 0 is refused with 400");
  const zeroScore = await put({ ...validBody, relational: 0 });
  check("returns 400", zeroScore.status === 400, JSON.stringify(zeroScore.json));
  check(
    "the error names relational",
    typeof zeroScore.json?.error === "string" && zeroScore.json.error.toLowerCase().includes("relational"),
    zeroScore.json?.error
  );

  console.log("a physical score of 11 is refused with 400");
  const elevenScore = await put({ ...validBody, physical: 11 });
  check("returns 400", elevenScore.status === 400, JSON.stringify(elevenScore.json));
  check(
    "the error names physical",
    typeof elevenScore.json?.error === "string" && elevenScore.json.error.toLowerCase().includes("physical"),
    elevenScore.json?.error
  );

  console.log("a fractional mental score (5.5) is refused with 400");
  const fractionalScore = await put({ ...validBody, mental: 5.5 });
  check("returns 400", fractionalScore.status === 400, JSON.stringify(fractionalScore.json));
  check(
    "the error names mental",
    typeof fractionalScore.json?.error === "string" && fractionalScore.json.error.toLowerCase().includes("mental"),
    fractionalScore.json?.error
  );

  console.log('a string spiritual score ("7") is refused with 400');
  const stringScore = await put({ ...validBody, spiritual: "7" });
  check("returns 400", stringScore.status === 400, JSON.stringify(stringScore.json));
  check(
    "the error names spiritual",
    typeof stringScore.json?.error === "string" && stringScore.json.error.toLowerCase().includes("spiritual"),
    stringScore.json?.error
  );

  console.log("a reflection over 2000 characters is refused with 400");
  const tooLongReflection = await put({ ...validBody, reflection: "x".repeat(2001) });
  check("returns 400", tooLongReflection.status === 400, JSON.stringify(tooLongReflection.json));
  check(
    "the error names reflection",
    typeof tooLongReflection.json?.error === "string" &&
      tooLongReflection.json.error.toLowerCase().includes("reflection"),
    tooLongReflection.json?.error
  );

  console.log("none of the rejected PUTs left the stored row changed");
  const afterRejections = await get();
  const rowAfterRejections = (afterRejections.json?.checkins ?? []).find((c) => c.weekStart === WEEK);
  check(
    "the row still holds the second PUT's values",
    rowAfterRejections?.relational === 3 && rowAfterRejections?.reflection === "Rough one, leaning on the team.",
    JSON.stringify(rowAfterRejections)
  );
  const rowCountFinal = await countRows(LEADER, WEEK);
  check("still exactly one row for (email, week_start)", rowCountFinal === 1, rowCountFinal);
} finally {
  // Restores (or, if none existed before, deletes) the leader's row for one
  // (email, week_start) pair, by exact email AND exact week_start, never
  // anything broader (no neq, no like, no unfiltered delete, no truncate).
  // Shared by both weeks this script can write to: WEEK and
  // WEEK_CURRENT_MELBOURNE each get their own capture/before-state and their
  // own call here, since they are independent rows.
  async function restoreLeaderWeek(weekStart, before, label) {
    let restoreOk;
    if (before) {
      const { error: restoreErr } = await db
        .from("leader_checkins")
        .update({
          relational: before.relational,
          physical: before.physical,
          mental: before.mental,
          spiritual: before.spiritual,
          reflection: before.reflection,
          updated_at: before.updated_at,
        })
        .eq("email", LEADER)
        .eq("week_start", weekStart);
      restoreOk = !restoreErr;
      check(`restores the leader's original row for ${label}`, restoreOk, restoreErr?.message ?? "");
    } else {
      const { error: deleteErr } = await db
        .from("leader_checkins")
        .delete()
        .eq("email", LEADER)
        .eq("week_start", weekStart);
      restoreOk = !deleteErr;
      check(`removes the row this run created for the leader's ${label}`, restoreOk, deleteErr?.message ?? "");
    }
    console.log(
      restoreOk
        ? `restored the leader's own record for ${label}`
        : `FAILED to restore the leader's own record for ${label}, see the check above`
    );
  }

  await restoreLeaderWeek(WEEK, leaderWeekBefore, "this week");
  await restoreLeaderWeek(WEEK_CURRENT_MELBOURNE, leaderCurrentWeekBefore, "the current Melbourne week");

  const cleanupErr = await cleanupStranger();
  check("cleaned up the temporary stranger row", !cleanupErr, cleanupErr?.message ?? "");

  console.log("\nfinal state of the entire leader_checkins table:");
  const { data: finalRows, error: finalErr } = await db
    .from("leader_checkins")
    .select("email, week_start, relational, physical, mental, spiritual, reflection, updated_at")
    .order("email", { ascending: true })
    .order("week_start", { ascending: true });
  if (finalErr) {
    console.error("could not list final table state:", finalErr.message);
  } else {
    console.table(finalRows ?? []);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll check-ins API checks passed");
