// Exercises /api/network against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/check-network-api.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const TEST_EMAIL = "network-check-temp@example.invalid";
const STRANGER_EMAIL = "network-check-stranger@example.invalid";

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

const post = (body, headers = {}) =>
  fetch(`${BASE}/api/network`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

async function cleanup() {
  await db.from("network_people").delete().eq("email", TEST_EMAIL);
  await db.from("network_people").delete().eq("email", STRANGER_EMAIL);
}

// The LEADER row is real production data (info@avenuemission.com), not a
// throwaway. The decline test needs an actor that is genuinely a leader, and
// only real leader accounts exist, so we borrow this row, capture its exact
// state first, and put it back in the finally block below. leaderId and
// leaderBefore are captured with the SAME filter (by id) used to restore,
// so a restore can never target a different row than the one we read.
let leaderId = null;
let leaderBefore = null;

await cleanup();

try {
  console.log("GET");
  const res = await fetch(`${BASE}/api/network?email=${encodeURIComponent(LEADER)}`);
  const graph = await res.json();
  check("returns 200", res.status === 200, JSON.stringify(graph).slice(0, 200));
  check("gives the viewer a node", typeof graph.viewerId === "string");
  check("returns a people array", Array.isArray(graph.people));
  leaderId = graph.viewerId;

  const viewerPerson = graph.people?.find((p) => p.id === graph.viewerId);
  check("viewer's own node is present in people", !!viewerPerson);
  const expectedKeys = [
    "avatarUrl",
    "email",
    "firstName",
    "id",
    "joined",
    "linkStatus",
    "lastName",
    "sentOutBy",
  ].sort();
  check(
    "viewer person has exactly the contract's keys",
    JSON.stringify(Object.keys(viewerPerson ?? {}).sort()) === JSON.stringify(expectedKeys),
    JSON.stringify(Object.keys(viewerPerson ?? {}).sort())
  );
  check("viewer.id is a string", typeof viewerPerson?.id === "string");
  check("viewer.firstName is a string", typeof viewerPerson?.firstName === "string");
  check(
    "viewer.lastName is a string or null",
    viewerPerson?.lastName === null || typeof viewerPerson?.lastName === "string"
  );
  check(
    "viewer.email is a string or null",
    viewerPerson?.email === null || typeof viewerPerson?.email === "string"
  );
  check(
    "viewer.avatarUrl is a string or null",
    viewerPerson?.avatarUrl === null || typeof viewerPerson?.avatarUrl === "string"
  );
  check(
    "viewer.sentOutBy is a string or null",
    viewerPerson?.sentOutBy === null || typeof viewerPerson?.sentOutBy === "string"
  );
  check(
    "viewer.linkStatus is pending or confirmed",
    viewerPerson?.linkStatus === "pending" || viewerPerson?.linkStatus === "confirmed"
  );
  check("viewer.joined is a boolean", typeof viewerPerson?.joined === "boolean");

  console.log("GET with an unknown email");
  const denied = await fetch(`${BASE}/api/network?email=nobody@example.invalid`);
  check("GET is refused with 403 (viewer not a leader)", denied.status === 403);

  console.log("add");
  const added = await post({
    action: "add",
    actorEmail: LEADER,
    firstName: "Temp",
    lastName: "Check",
    email: TEST_EMAIL,
  });
  check("add succeeds", added.status === 200, JSON.stringify(added.json));

  const { data: row } = await db
    .from("network_people")
    .select("id, sent_out_by, link_status, joined, first_name")
    .eq("email", TEST_EMAIL)
    .maybeSingle();
  check("stores the person", !!row);
  check("hangs them off the actor", row?.sent_out_by === graph.viewerId, String(row?.sent_out_by));
  check("starts pending", row?.link_status === "pending");
  check("marks them as not joined", row?.joined === false);

  console.log("confirm (actor is a real leader)");
  // link_status = "confirmed" is the write the whole confirm/decline feature
  // turns on, so it needs real coverage, not just refusal paths. Same
  // borrow-and-restore shape as the decline test further down: capture
  // LEADER's row by id with an error check, mutate it to a known pending
  // state, exercise the route, assert the write it made, then restore by
  // that same id with an error-checked named check before moving on. This
  // restore is inline and immediate (not deferred to the outer finally)
  // so the leader's row is back to its real state well before decline's
  // own borrow, and well before the temp-person cleanup at the end.
  const { data: confirmLeaderBefore, error: confirmLeaderReadErr } = await db
    .from("network_people")
    .select("sent_out_by, link_status")
    .eq("id", leaderId)
    .maybeSingle();
  if (confirmLeaderReadErr) throw new Error(confirmLeaderReadErr.message);

  const { error: confirmBorrowErr } = await db
    .from("network_people")
    .update({ sent_out_by: row.id, link_status: "pending" })
    .eq("id", leaderId);
  if (confirmBorrowErr) throw new Error(confirmBorrowErr.message);

  const confirmed = await post({ action: "confirm", actorEmail: LEADER });
  check("confirm succeeds", confirmed.status === 200, JSON.stringify(confirmed.json));
  const { data: confirmedRow } = await db
    .from("network_people")
    .select("link_status")
    .eq("id", leaderId)
    .maybeSingle();
  check("confirm sets link_status to confirmed", confirmedRow?.link_status === "confirmed");

  const { error: confirmRestoreErr } = await db
    .from("network_people")
    .update({
      sent_out_by: confirmLeaderBefore.sent_out_by,
      link_status: confirmLeaderBefore.link_status,
    })
    .eq("id", leaderId);
  check(
    "restores the leader's own record after confirm",
    !confirmRestoreErr,
    confirmRestoreErr?.message ?? ""
  );

  console.log("confirm with nothing pending (expected refusal)");
  // Run right after the restore above, while the leader's own sent_out_by
  // is genuinely null again, so this is testing the "Nothing to confirm"
  // branch rather than fighting leftover state from the previous test.
  const nothingToConfirm = await post({ action: "confirm", actorEmail: LEADER });
  check(
    "confirm is refused with 400 (nothing to confirm)",
    nothingToConfirm.status === 400,
    JSON.stringify(nothingToConfirm.json)
  );

  console.log("confirm as a non-leader actor (expected refusal)");
  // ensureNode() checks `leaders` FIRST and unconditionally, before it ever
  // looks at network_people or at the confirm logic's own sent_out_by
  // check. TEST_EMAIL has a network_people row (from the earlier "add"),
  // but it is not a row in `leaders`, so ensureNode() returns null and the
  // route refuses with 403 before the confirm logic ever runs. No setup on
  // TEST_EMAIL's own row is needed or relevant here: the request never gets
  // far enough to read it.
  const confirmAsStranger = await post({ action: "confirm", actorEmail: TEST_EMAIL });
  check(
    "confirm is refused with 403 (actor not a leader)",
    confirmAsStranger.status === 403,
    JSON.stringify(confirmAsStranger.json)
  );

  console.log("act as an actor unknown to the system entirely");
  // This address has never had a network_people row and is not in `leaders`,
  // so ensureNode() finds nothing on either lookup and the route correctly
  // refuses with 403. Nothing is created for a rejected actor, so there is
  // nothing to clean up afterwards.
  const unknownActor = await post({
    action: "confirm",
    actorEmail: "network-check-unknown-actor@example.invalid",
  });
  check(
    "confirm is refused with 403 (actor unknown to the system)",
    unknownActor.status === 403,
    JSON.stringify(unknownActor.json)
  );

  console.log("add the same person twice");
  const dup = await post({
    action: "add",
    actorEmail: LEADER,
    firstName: "Temp",
    email: TEST_EMAIL,
  });
  check("is refused with 409", dup.status === 409, JSON.stringify(dup.json));

  console.log("remove");
  const removed = await post({ action: "remove", actorEmail: LEADER, id: row.id });
  check("remove succeeds", removed.status === 200, JSON.stringify(removed.json));
  const { data: after } = await db
    .from("network_people")
    .select("sent_out_by")
    .eq("id", row.id)
    .maybeSingle();
  check("clears the sender", after?.sent_out_by === null);

  console.log("add again after removal (adopt path)");
  const readded = await post({
    action: "add",
    actorEmail: LEADER,
    firstName: "Temp",
    email: TEST_EMAIL,
  });
  check("re-add succeeds", readded.status === 200, JSON.stringify(readded.json));
  check("reports adopted:true", readded.json?.adopted === true, JSON.stringify(readded.json));

  console.log("remove a person you have no link to");
  const { data: stranger, error: strangerErr } = await db
    .from("network_people")
    .insert({
      email: STRANGER_EMAIL,
      first_name: "Temp",
      last_name: "Stranger",
      sent_out_by: null,
      link_status: "pending",
      joined: false,
      added_by_email: STRANGER_EMAIL,
    })
    .select("id")
    .single();
  if (strangerErr) throw new Error(strangerErr.message);
  const notYours = await post({ action: "remove", actorEmail: LEADER, id: stranger.id });
  check(
    "remove is refused with 403 (not your link)",
    notYours.status === 403,
    JSON.stringify(notYours.json)
  );

  console.log("decline (actor is a real leader)");
  // Borrow LEADER's own row to prove decline works for a genuine leader
  // account, then restore whatever it held before (see leaderBefore/finally).
  // Captured by id here; the finally block restores by that same id (see
  // leaderId above), so restore can never target a different row than the
  // one we actually read.
  const { data: leaderRow, error: leaderReadErr } = await db
    .from("network_people")
    .select("sent_out_by, link_status")
    .eq("id", leaderId)
    .maybeSingle();
  if (leaderReadErr) throw new Error(leaderReadErr.message);
  leaderBefore = leaderRow;

  const { error: leaderBorrowErr } = await db
    .from("network_people")
    .update({ sent_out_by: row.id, link_status: "pending" })
    .eq("id", leaderId);
  if (leaderBorrowErr) throw new Error(leaderBorrowErr.message);

  const declined = await post({ action: "decline", actorEmail: LEADER });
  check("decline succeeds", declined.status === 200, JSON.stringify(declined.json));
  const { data: leaderAfter } = await db
    .from("network_people")
    .select("sent_out_by")
    .eq("id", leaderId)
    .maybeSingle();
  check("clears the leader's own sender", leaderAfter?.sent_out_by === null);

  console.log("reparent without an Authorization header");
  const reparentNoAuth = await post({ action: "reparent", id: row.id, newParentId: null });
  check("is refused with 401", reparentNoAuth.status === 401, JSON.stringify(reparentNoAuth.json));

  console.log("unknown action");
  const bogus = await post({ action: "nonsense", actorEmail: LEADER });
  check("is refused with 400", bogus.status === 400);
} finally {
  if (leaderBefore) {
    const { error: restoreErr } = await db
      .from("network_people")
      .update({
        sent_out_by: leaderBefore.sent_out_by,
        link_status: leaderBefore.link_status,
      })
      .eq("id", leaderId);
    check("restores the leader's own record", !restoreErr, restoreErr?.message ?? "");
    console.log("restored the leader's own record");
  }
  await cleanup();
  console.log("cleaned up the temporary people");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll network API checks passed");
