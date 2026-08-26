// Exercises /api/leader-training against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/check-training-api.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const STRANGER_EMAIL = "training-check-temp@example.invalid";
const ADMIN_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_KEY) {
  console.error("FAIL: ADMIN_API_KEY is not set in the environment");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

const authHeaders = { authorization: `Bearer ${ADMIN_KEY}` };

const get = (qs, headers = {}) =>
  fetch(`${BASE}/api/leader-training?${qs}`, { headers }).then(async (r) => ({
    status: r.status,
    json: await r.json(),
  }));

const put = (body, headers = {}) =>
  fetch(`${BASE}/api/leader-training`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

const post = (body, headers = {}) =>
  fetch(`${BASE}/api/leader-training`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

async function cleanupStranger() {
  await db.from("leader_training_progress").delete().eq("email", STRANGER_EMAIL);
}

// The LEADER row (info@avenuemission.com) is real production data, not a
// throwaway. Every check below that needs a genuine leader borrows this
// row's leader_training_progress state, captured first by the SAME filter
// (exact email) used to restore it in the finally block, so a restore can
// never target a different row than the one we actually read.
let leaderBefore = null;

await cleanupStranger();

try {
  console.log("capture the leader's current progress row");
  const { data: captured, error: captureErr } = await db
    .from("leader_training_progress")
    .select(
      "watched_episodes, completed_modules, checkpoint_status, " +
        "checkpoint_requested_at, checkpoint_completed_at, checkpoint_completed_by"
    )
    .eq("email", LEADER)
    .maybeSingle();
  if (captureErr) throw new Error(captureErr.message);
  leaderBefore = captured; // null is a valid captured state: no row yet.

  // Start every check from a known state: none, empty arrays.
  const { error: resetErr } = await db
    .from("leader_training_progress")
    .upsert(
      {
        email: LEADER,
        watched_episodes: [],
        completed_modules: [],
        checkpoint_status: "none",
        checkpoint_requested_at: null,
        checkpoint_completed_at: null,
        checkpoint_completed_by: null,
      },
      { onConflict: "email" }
    );
  if (resetErr) throw new Error(resetErr.message);

  console.log("GET for a real leader");
  const got = await get(`email=${encodeURIComponent(LEADER)}`);
  check("returns 200", got.status === 200, JSON.stringify(got.json));
  const progress = got.json?.progress;
  check("returns a progress object", !!progress);
  check("watchedEpisodes is an array", Array.isArray(progress?.watchedEpisodes));
  check("completedModules is an array", Array.isArray(progress?.completedModules));
  check(
    "checkpointStatus is one of the three literals",
    ["none", "requested", "complete"].includes(progress?.checkpointStatus)
  );
  check(
    "checkpointCompletedAt is a string or null",
    progress?.checkpointCompletedAt === null || typeof progress?.checkpointCompletedAt === "string"
  );

  console.log("GET for an email not in leaders");
  const denied = await get(`email=${encodeURIComponent(STRANGER_EMAIL)}`);
  check("returns 403", denied.status === 403, JSON.stringify(denied.json));

  console.log("PUT stores arrays and GET reads them back identically");
  const arrays = { watchedEpisodes: ["p1m0e1", "p1m0e2"], completedModules: ["p1m0"] };
  const putOk = await put({ email: LEADER, ...arrays });
  check("PUT succeeds", putOk.status === 200, JSON.stringify(putOk.json));
  const afterPut = await get(`email=${encodeURIComponent(LEADER)}`);
  check(
    "watchedEpisodes round-trips",
    JSON.stringify(afterPut.json?.progress?.watchedEpisodes) === JSON.stringify(arrays.watchedEpisodes)
  );
  check(
    "completedModules round-trips",
    JSON.stringify(afterPut.json?.progress?.completedModules) === JSON.stringify(arrays.completedModules)
  );

  console.log("PUT with a 501-entry array");
  const tooLong = await put({
    email: LEADER,
    watchedEpisodes: Array.from({ length: 501 }, (_, i) => `p1m0e${i}`),
    completedModules: [],
  });
  check("returns 400", tooLong.status === 400, JSON.stringify(tooLong.json));

  console.log("PUT with an entry containing punctuation");
  const badEntry = await put({
    email: LEADER,
    watchedEpisodes: ["p1m0e1!"],
    completedModules: [],
  });
  check("returns 400", badEntry.status === 400, JSON.stringify(badEntry.json));

  console.log("PUT attempting to set checkpointStatus");
  const smuggle = await put({
    email: LEADER,
    watchedEpisodes: ["p1m0e1"],
    completedModules: ["p1m0"],
    checkpointStatus: "complete",
  });
  check("PUT still succeeds", smuggle.status === 200, JSON.stringify(smuggle.json));
  const afterSmuggle = await get(`email=${encodeURIComponent(LEADER)}`);
  check(
    "checkpointStatus was NOT changed by the PUT body",
    afterSmuggle.json?.progress?.checkpointStatus === "none",
    afterSmuggle.json?.progress?.checkpointStatus
  );

  console.log("complete-checkpoint without the admin header");
  const completeNoAuth = await post({ action: "complete-checkpoint", email: LEADER });
  check("returns 401", completeNoAuth.status === 401, JSON.stringify(completeNoAuth.json));

  console.log("reopen-checkpoint without the admin header");
  const reopenNoAuth = await post({ action: "reopen-checkpoint", email: LEADER });
  check("returns 401", reopenNoAuth.status === 401, JSON.stringify(reopenNoAuth.json));

  console.log("request-checkpoint moves none to requested");
  const requested = await post({ action: "request-checkpoint", email: LEADER });
  check("succeeds", requested.status === 200, JSON.stringify(requested.json));
  check(
    "status is now requested",
    requested.json?.progress?.checkpointStatus === "requested",
    requested.json?.progress?.checkpointStatus
  );

  console.log("a second request-checkpoint is a no-op");
  const requestedAgain = await post({ action: "request-checkpoint", email: LEADER });
  check("succeeds", requestedAgain.status === 200, JSON.stringify(requestedAgain.json));
  check(
    "status is still requested",
    requestedAgain.json?.progress?.checkpointStatus === "requested",
    requestedAgain.json?.progress?.checkpointStatus
  );

  console.log("?all=1 without the admin header");
  const allNoAuth = await get("all=1");
  check("returns 401", allNoAuth.status === 401, JSON.stringify(allNoAuth.json));

  console.log("?all=1 with the admin header");
  const allOk = await get("all=1", authHeaders);
  check("returns 200", allOk.status === 200, JSON.stringify(allOk.json));
  check("returns a rows array", Array.isArray(allOk.json?.rows));
  check(
    "the leader's row is present",
    allOk.json?.rows?.some((r) => r.email === LEADER)
  );

  console.log("complete-checkpoint with the admin header");
  const completed = await post({ action: "complete-checkpoint", email: LEADER }, authHeaders);
  check("succeeds", completed.status === 200, JSON.stringify(completed.json));
  check(
    "status is now complete",
    completed.json?.progress?.checkpointStatus === "complete",
    completed.json?.progress?.checkpointStatus
  );

  console.log("reopen-checkpoint with the admin header");
  const reopened = await post({ action: "reopen-checkpoint", email: LEADER }, authHeaders);
  check("succeeds", reopened.status === 200, JSON.stringify(reopened.json));
  check(
    "status is back to none",
    reopened.json?.progress?.checkpointStatus === "none",
    reopened.json?.progress?.checkpointStatus
  );

  console.log("unknown action");
  const bogus = await post({ action: "nonsense", email: LEADER });
  check("returns 400", bogus.status === 400, JSON.stringify(bogus.json));
} finally {
  if (leaderBefore) {
    const { error: restoreErr } = await db
      .from("leader_training_progress")
      .update({
        watched_episodes: leaderBefore.watched_episodes,
        completed_modules: leaderBefore.completed_modules,
        checkpoint_status: leaderBefore.checkpoint_status,
        checkpoint_requested_at: leaderBefore.checkpoint_requested_at,
        checkpoint_completed_at: leaderBefore.checkpoint_completed_at,
        checkpoint_completed_by: leaderBefore.checkpoint_completed_by,
      })
      .eq("email", LEADER);
    check("restores the leader's original row", !restoreErr, restoreErr?.message ?? "");
  } else {
    // The leader had no row before this run: put it back to that state
    // exactly, rather than leaving behind a row this script created.
    const { error: deleteErr } = await db
      .from("leader_training_progress")
      .delete()
      .eq("email", LEADER);
    check("removes the row this run created for the leader", !deleteErr, deleteErr?.message ?? "");
  }
  console.log("restored the leader's own record");

  await cleanupStranger();
  console.log("cleaned up the temporary stranger row");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll training API checks passed");
