// Exercises /api/leader-checkins against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/check-checkins-api.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const STRANGER_EMAIL = "checkins-check-temp@example.invalid";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

const get = (qs) =>
  fetch(`${BASE}/api/leader-checkins?${qs}`).then(async (r) => ({ status: r.status, json: await r.json() }));

const put = (body) =>
  fetch(`${BASE}/api/leader-checkins`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
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

const validBody = { email: LEADER, weekStart: WEEK, relational: 7, physical: 6, mental: 8, spiritual: 9 };

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
// script only ever writes to WEEK for that email, so only that one
// (email, week_start) pair needs capturing and restoring, by the same
// exact-match filter used in both directions.
let leaderWeekBefore = null;

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

  console.log("GET for a real leader");
  const got = await get(`email=${encodeURIComponent(LEADER)}`);
  check("returns 200", got.status === 200, JSON.stringify(got.json));
  check("returns a checkins array", Array.isArray(got.json?.checkins), JSON.stringify(got.json));

  console.log("GET for an email not in leaders");
  const denied = await get(`email=${encodeURIComponent(STRANGER_EMAIL)}`);
  check("returns 403", denied.status === 403, JSON.stringify(denied.json));

  console.log("PUT stores a check-in and GET reads it back identically");
  const putOk = await put({ ...validBody, reflection: "Steady week, low sleep." });
  check("PUT succeeds", putOk.status === 200, JSON.stringify(putOk.json));
  check("PUT response echoes weekStart", putOk.json?.checkin?.weekStart === WEEK, putOk.json?.checkin?.weekStart);

  const afterPut = await get(`email=${encodeURIComponent(LEADER)}`);
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

  const afterSecondPut = await get(`email=${encodeURIComponent(LEADER)}`);
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
  const afterRejections = await get(`email=${encodeURIComponent(LEADER)}`);
  const rowAfterRejections = (afterRejections.json?.checkins ?? []).find((c) => c.weekStart === WEEK);
  check(
    "the row still holds the second PUT's values",
    rowAfterRejections?.relational === 3 && rowAfterRejections?.reflection === "Rough one, leaning on the team.",
    JSON.stringify(rowAfterRejections)
  );
  const rowCountFinal = await countRows(LEADER, WEEK);
  check("still exactly one row for (email, week_start)", rowCountFinal === 1, rowCountFinal);
} finally {
  let restoreOk;
  if (leaderWeekBefore) {
    const { error: restoreErr } = await db
      .from("leader_checkins")
      .update({
        relational: leaderWeekBefore.relational,
        physical: leaderWeekBefore.physical,
        mental: leaderWeekBefore.mental,
        spiritual: leaderWeekBefore.spiritual,
        reflection: leaderWeekBefore.reflection,
        updated_at: leaderWeekBefore.updated_at,
      })
      .eq("email", LEADER)
      .eq("week_start", WEEK);
    restoreOk = !restoreErr;
    check("restores the leader's original row for this week", restoreOk, restoreErr?.message ?? "");
  } else {
    // No row existed for (LEADER, WEEK) before this run: delete exactly
    // that row, by exact email AND exact week_start, never anything
    // broader. No neq, no like, no unfiltered delete, no truncate.
    const { error: deleteErr } = await db
      .from("leader_checkins")
      .delete()
      .eq("email", LEADER)
      .eq("week_start", WEEK);
    restoreOk = !deleteErr;
    check("removes the row this run created for the leader", restoreOk, deleteErr?.message ?? "");
  }
  console.log(
    restoreOk
      ? "restored the leader's own record"
      : "FAILED to restore the leader's own record, see the check above"
  );

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
