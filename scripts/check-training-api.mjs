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
  const { error } = await db.from("leader_training_progress").delete().eq("email", STRANGER_EMAIL);
  return error;
}

// The LEADER row (info@avenuemission.com) is real production data, not a
// throwaway. Every check below that needs a genuine leader borrows this
// row's leader_training_progress state, captured first by the SAME filter
// (exact email) used to restore it in the finally block, so a restore can
// never target a different row than the one we actually read.
let leaderBefore = null;

const preRunCleanupErr = await cleanupStranger();
if (preRunCleanupErr) {
  console.error("warning: pre-run cleanup of the stranger row failed:", preRunCleanupErr.message);
}

try {
  console.log("capture the leader's current progress row");
  const { data: captured, error: captureErr } = await db
    .from("leader_training_progress")
    .select(
      "watched_episodes, completed_modules, checkpoint_status, " +
        "checkpoint_requested_at, checkpoint_completed_at, checkpoint_completed_by, revision"
    )
    .eq("email", LEADER)
    .maybeSingle();
  if (captureErr) throw new Error(captureErr.message);
  leaderBefore = captured; // null is a valid captured state: no row yet.

  // Start every check from a known state: none, empty arrays, revision 0.
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
        revision: 0,
      },
      { onConflict: "email" }
    );
  if (resetErr) throw new Error(resetErr.message);

  // Tracks the revision this script believes is currently stored, so every
  // PUT it sends carries the correct next value. Updated only after a PUT
  // this script expects to actually succeed.
  let currentRevision = 0;

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
  check("revision is a number", typeof progress?.revision === "number", progress?.revision);

  console.log("GET for an email not in leaders");
  const denied = await get(`email=${encodeURIComponent(STRANGER_EMAIL)}`);
  check("returns 403", denied.status === 403, JSON.stringify(denied.json));

  console.log("PUT stores arrays and GET reads them back identically");
  const arrays = { watchedEpisodes: ["p1m0e1", "p1m0e2"], completedModules: ["p1m0"] };
  const putOk = await put({ email: LEADER, ...arrays, revision: currentRevision + 1 });
  check("PUT succeeds", putOk.status === 200, JSON.stringify(putOk.json));
  currentRevision = putOk.json?.progress?.revision ?? currentRevision + 1;
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
    revision: currentRevision + 1,
  });
  check("returns 400", tooLong.status === 400, JSON.stringify(tooLong.json));

  console.log("PUT with an entry containing punctuation");
  const badEntry = await put({
    email: LEADER,
    watchedEpisodes: ["p1m0e1!"],
    completedModules: [],
    revision: currentRevision + 1,
  });
  check("returns 400", badEntry.status === 400, JSON.stringify(badEntry.json));

  console.log("PUT with a 501-entry completedModules array");
  const completedTooLong = await put({
    email: LEADER,
    watchedEpisodes: [],
    completedModules: Array.from({ length: 501 }, (_, i) => `p1m0e${i}`),
    revision: currentRevision + 1,
  });
  check("returns 400", completedTooLong.status === 400, JSON.stringify(completedTooLong.json));

  console.log("PUT with a completedModules entry containing punctuation");
  const completedBadEntry = await put({
    email: LEADER,
    watchedEpisodes: [],
    completedModules: ["p1m0!"],
    revision: currentRevision + 1,
  });
  check("returns 400", completedBadEntry.status === 400, JSON.stringify(completedBadEntry.json));

  console.log("PUT attempting to set checkpointStatus");
  const smuggle = await put({
    email: LEADER,
    watchedEpisodes: ["p1m0e1"],
    completedModules: ["p1m0"],
    checkpointStatus: "complete",
    revision: currentRevision + 1,
  });
  check("PUT still succeeds", smuggle.status === 200, JSON.stringify(smuggle.json));
  currentRevision = smuggle.json?.progress?.revision ?? currentRevision + 1;
  const afterSmuggle = await get(`email=${encodeURIComponent(LEADER)}`);
  check(
    "checkpointStatus was NOT changed by the PUT body",
    afterSmuggle.json?.progress?.checkpointStatus === "none",
    afterSmuggle.json?.progress?.checkpointStatus
  );

  console.log("revision guard: PUT with a revision greater than stored succeeds and the stored revision advances");
  const revisionBefore = currentRevision;
  const advancingArrays = { watchedEpisodes: ["p1m1e1"], completedModules: ["p1m1"] };
  const advance = await put({ email: LEADER, ...advancingArrays, revision: currentRevision + 1 });
  check("PUT succeeds", advance.status === 200, JSON.stringify(advance.json));
  check(
    "stored revision advanced by exactly one",
    advance.json?.progress?.revision === revisionBefore + 1,
    `before=${revisionBefore} after=${advance.json?.progress?.revision}`
  );
  currentRevision = advance.json?.progress?.revision ?? currentRevision + 1;
  const afterAdvance = await get(`email=${encodeURIComponent(LEADER)}`);
  check(
    "GET reflects the advanced revision",
    afterAdvance.json?.progress?.revision === currentRevision,
    afterAdvance.json?.progress?.revision
  );
  check(
    "GET reflects the arrays written at the advanced revision",
    JSON.stringify(afterAdvance.json?.progress?.watchedEpisodes) === JSON.stringify(advancingArrays.watchedEpisodes) &&
      JSON.stringify(afterAdvance.json?.progress?.completedModules) === JSON.stringify(advancingArrays.completedModules)
  );

  console.log("revision guard: PUT with the SAME revision is refused with 409");
  const sameRevisionAttempt = { watchedEpisodes: ["p1m2e1"], completedModules: ["p1m2"] };
  const sameRevision = await put({ email: LEADER, ...sameRevisionAttempt, revision: currentRevision });
  check("returns 409", sameRevision.status === 409, JSON.stringify(sameRevision.json));

  console.log("revision guard: PUT with a LOWER revision is refused with 409");
  const lowerRevisionAttempt = { watchedEpisodes: ["p1m3e1"], completedModules: ["p1m3"] };
  const lowerRevision = await put({ email: LEADER, ...lowerRevisionAttempt, revision: currentRevision - 1 });
  check("returns 409", lowerRevision.status === 409, JSON.stringify(lowerRevision.json));

  console.log("revision guard: a refused PUT leaves the stored arrays completely unchanged");
  const afterRefusals = await get(`email=${encodeURIComponent(LEADER)}`);
  check(
    "watchedEpisodes unchanged by either refused PUT",
    JSON.stringify(afterRefusals.json?.progress?.watchedEpisodes) === JSON.stringify(advancingArrays.watchedEpisodes),
    JSON.stringify(afterRefusals.json?.progress?.watchedEpisodes)
  );
  check(
    "completedModules unchanged by either refused PUT",
    JSON.stringify(afterRefusals.json?.progress?.completedModules) === JSON.stringify(advancingArrays.completedModules),
    JSON.stringify(afterRefusals.json?.progress?.completedModules)
  );
  check(
    "stored revision unchanged by either refused PUT",
    afterRefusals.json?.progress?.revision === currentRevision,
    afterRefusals.json?.progress?.revision
  );

  console.log("revision guard: a 409 response body carries the current progress");
  check(
    "same-revision 409 body carries the current watchedEpisodes",
    JSON.stringify(sameRevision.json?.progress?.watchedEpisodes) === JSON.stringify(advancingArrays.watchedEpisodes),
    JSON.stringify(sameRevision.json?.progress)
  );
  check(
    "same-revision 409 body carries the current revision",
    sameRevision.json?.progress?.revision === currentRevision,
    sameRevision.json?.progress?.revision
  );
  check(
    "lower-revision 409 body carries the current watchedEpisodes",
    JSON.stringify(lowerRevision.json?.progress?.watchedEpisodes) === JSON.stringify(advancingArrays.watchedEpisodes),
    JSON.stringify(lowerRevision.json?.progress)
  );
  check(
    "lower-revision 409 body carries the current revision",
    lowerRevision.json?.progress?.revision === currentRevision,
    lowerRevision.json?.progress?.revision
  );

  console.log("revision guard: PUT with a missing revision is refused with 400");
  const missingRevisionBody = { email: LEADER, watchedEpisodes: ["p1m1e1"], completedModules: ["p1m1"] };
  const missingRevision = await put(missingRevisionBody);
  check("returns 400", missingRevision.status === 400, JSON.stringify(missingRevision.json));

  console.log("revision guard: PUT with a non-numeric revision is refused with 400");
  const nonNumericRevision = await put({
    email: LEADER,
    watchedEpisodes: ["p1m1e1"],
    completedModules: ["p1m1"],
    revision: "not-a-number",
  });
  check("returns 400", nonNumericRevision.status === 400, JSON.stringify(nonNumericRevision.json));

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
  let restoreOk;
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
        revision: leaderBefore.revision,
      })
      .eq("email", LEADER);
    restoreOk = !restoreErr;
    check("restores the leader's original row", restoreOk, restoreErr?.message ?? "");
  } else {
    // The leader had no row before this run: put it back to that state
    // exactly, rather than leaving behind a row this script created.
    const { error: deleteErr } = await db
      .from("leader_training_progress")
      .delete()
      .eq("email", LEADER);
    restoreOk = !deleteErr;
    check("removes the row this run created for the leader", restoreOk, deleteErr?.message ?? "");
  }
  // Report what actually happened, not a fixed message: a failed restore on
  // real leader data is exactly the kind of thing that must not read as
  // success in the log.
  console.log(
    restoreOk
      ? "restored the leader's own record"
      : "FAILED to restore the leader's own record, see the check above"
  );

  const cleanupErr = await cleanupStranger();
  check("cleaned up the temporary stranger row", !cleanupErr, cleanupErr?.message ?? "");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll training API checks passed");
