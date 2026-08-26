// Exercises /api/network against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/check-network-api.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const TEST_EMAIL = "network-check-temp@example.invalid";
const STRANGER_EMAIL = "network-check-stranger@example.invalid";

// Depth and apprenticeship-step checks used to register a throwaway `leaders`
// row so they had a viewer with a fully isolated, zero-descendant starting
// point. `leaders` is the entire authorisation gate for this site (every
// route decides who you are purely by whether your email is in it, no
// password involved), so a script that writes to it and then fails to clean
// up perfectly leaves a working leader account in production. The depth and
// apprenticeship-step checks below no longer need that: they hang a small
// extra chain off the real LEADER's own already-owned TEST_EMAIL node
// (`row`, added earlier) and check the DELTA in what LEADER's own GET
// reports, cross-checked against an independent reimplementation of the
// depth walk. That proves the walk is correct without ever inserting into
// `leaders`. APPRENTICE_LEADER_EMAIL is kept only as a cleanup/verification
// target (see cleanup() below): nothing in this script writes it anymore,
// but cleanup still asserts no row exists there, as a safety net in case a
// future edit reintroduces such a write without updating cleanup to match.
const APPRENTICE_LEADER_EMAIL = "network-check-apprentice-leader@example.invalid";
const APPRENTICE_CHILD_EMAIL = "network-check-apprentice-child@example.invalid";
const APPRENTICE_GRANDCHILD_EMAIL = "network-check-apprentice-grandchild@example.invalid";

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

// Deletes every temporary row this script could have created, by exact
// email, one table/email pair at a time. Every delete's `error` is captured
// and surfaced through check() (never dropped), so a failed delete shows up
// as a failing check and a non-zero exit instead of a silent no-op. The
// `leaders` row gets an extra, independent re-read afterwards: even if the
// delete above reported no error, this confirms by direct query that no row
// for APPRENTICE_LEADER_EMAIL actually exists in `leaders`, because that
// table is the entire authorisation gate for the site and a leftover row
// there is a working leader account in production, not just messy test data.
async function cleanup() {
  const targets = [
    ["network_people", TEST_EMAIL],
    ["network_people", STRANGER_EMAIL],
    ["network_people", APPRENTICE_LEADER_EMAIL],
    ["network_people", APPRENTICE_CHILD_EMAIL],
    ["network_people", APPRENTICE_GRANDCHILD_EMAIL],
    ["leaders", APPRENTICE_LEADER_EMAIL],
  ];
  for (const [table, email] of targets) {
    const { error } = await db.from(table).delete().eq("email", email);
    check(`cleanup: ${table} delete for ${email}`, !error, error?.message ?? "");
  }

  const { data: leftoverLeader, error: leftoverLeaderErr } = await db
    .from("leaders")
    .select("email")
    .eq("email", APPRENTICE_LEADER_EMAIL)
    .maybeSingle();
  check(
    "cleanup: could re-read the leaders table to confirm it is clean",
    !leftoverLeaderErr,
    leftoverLeaderErr?.message ?? ""
  );
  check(
    "cleanup: no leftover leaders row for the temp apprentice-leader email",
    !leftoverLeader,
    leftoverLeader ? JSON.stringify(leftoverLeader) : ""
  );
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
    "apprenticeStep",
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
  check(
    "viewer.apprenticeStep is an integer",
    Number.isInteger(viewerPerson?.apprenticeStep),
    String(viewerPerson?.apprenticeStep)
  );
  check(
    "GET response carries a depth object",
    typeof graph.depth === "object" && graph.depth !== null,
    JSON.stringify(graph.depth)
  );
  check(
    "depth.generations is a non-negative integer",
    Number.isInteger(graph.depth?.generations) && graph.depth.generations >= 0,
    String(graph.depth?.generations)
  );
  check(
    "depth.people is a non-negative integer",
    Number.isInteger(graph.depth?.people) && graph.depth.people >= 0,
    String(graph.depth?.people)
  );

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
  // that same id with an error-checked named check before moving on.
  //
  // The exercise-and-restore step is wrapped in its own try/finally, NOT
  // left to run inline and NOT deferred to the outer script-level finally.
  // The outer finally only restores from `leaderBefore`, and that variable
  // is not assigned until the decline test further down - so if anything
  // between the borrow above and an inline restore were to throw (a network
  // hiccup on the confirm POST, for instance), execution would jump straight
  // to the outer finally while leaderBefore was still null, and the outer
  // restore would silently do nothing. That would leave LEADER's real row
  // holding link_status: "confirmed" with a borrowed (and soon to be
  // deleted) sender. A local try/finally guarantees the restore below runs
  // immediately after the borrow no matter what happens in between, so the
  // leader's row is back to its real state well before decline's own
  // borrow, and well before the temp-person cleanup at the end, regardless
  // of any failure along the way.
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

  try {
    const confirmed = await post({ action: "confirm", actorEmail: LEADER });
    check("confirm succeeds", confirmed.status === 200, JSON.stringify(confirmed.json));
    const { data: confirmedRow } = await db
      .from("network_people")
      .select("link_status")
      .eq("id", leaderId)
      .maybeSingle();
    check("confirm sets link_status to confirmed", confirmedRow?.link_status === "confirmed");
  } finally {
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
  }

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

  console.log("apprentice step: set on your own person succeeds and stores it");
  // `row` (TEST_EMAIL) has sent_out_by === leaderId ever since the re-add
  // (adopt path) above, and nothing since has changed that, so this is a
  // genuine "person you sent out" for LEADER.
  const ownStep = await post({ action: "set-apprentice-step", actorEmail: LEADER, id: row.id, step: 3 });
  check("own-person step set succeeds", ownStep.status === 200, JSON.stringify(ownStep.json));
  const { data: ownStepRow } = await db
    .from("network_people")
    .select("apprentice_step")
    .eq("id", row.id)
    .maybeSingle();
  check(
    "own-person step is stored as 3",
    ownStepRow?.apprentice_step === 3,
    String(ownStepRow?.apprentice_step)
  );

  console.log("apprentice step: refused for someone you are not sending out");
  // `stranger` has sent_out_by === null, so LEADER is not their sender.
  const notMineStep = await post({
    action: "set-apprentice-step",
    actorEmail: LEADER,
    id: stranger.id,
    step: 2,
  });
  check(
    "step on someone else's person is refused with 403",
    notMineStep.status === 403,
    JSON.stringify(notMineStep.json)
  );

  console.log("apprentice step: rejects out-of-range and non-integer values");
  const stepTooHigh = await post({ action: "set-apprentice-step", actorEmail: LEADER, id: row.id, step: 6 });
  check("step of 6 is refused with 400", stepTooHigh.status === 400, JSON.stringify(stepTooHigh.json));

  const stepNegative = await post({ action: "set-apprentice-step", actorEmail: LEADER, id: row.id, step: -1 });
  check("step of -1 is refused with 400", stepNegative.status === 400, JSON.stringify(stepNegative.json));

  const stepFractional = await post({
    action: "set-apprentice-step",
    actorEmail: LEADER,
    id: row.id,
    step: 2.5,
  });
  check(
    "step of 2.5 is refused with 400",
    stepFractional.status === 400,
    JSON.stringify(stepFractional.json)
  );

  const stepString = await post({ action: "set-apprentice-step", actorEmail: LEADER, id: row.id, step: "3" });
  check(
    'step of "3" (a string, not a number) is refused with 400',
    stepString.status === 400,
    JSON.stringify(stepString.json)
  );

  console.log("none of the rejected step writes touched the stored value");
  const { data: unchangedStepRow } = await db
    .from("network_people")
    .select("apprentice_step")
    .eq("id", row.id)
    .maybeSingle();
  check(
    "rejected 400s left apprentice_step at 3",
    unchangedStepRow?.apprentice_step === 3,
    String(unchangedStepRow?.apprentice_step)
  );

  console.log("GET carries apprenticeStep for every person");
  const stepGraphRes = await fetch(`${BASE}/api/network?email=${encodeURIComponent(LEADER)}`);
  const stepGraph = await stepGraphRes.json();
  check(
    "every person in GET has an integer apprenticeStep",
    Array.isArray(stepGraph.people) &&
      stepGraph.people.length > 0 &&
      stepGraph.people.every(
        (p) => typeof p.apprenticeStep === "number" && Number.isInteger(p.apprenticeStep)
      ),
    JSON.stringify(stepGraph.people?.map((p) => p.apprenticeStep))
  );

  // Reimplements computeDepth() from src/app/api/network/route.ts against
  // the same `people` array a GET response already returns. Running this
  // independently and comparing it to the server's own `depth` field
  // cross-checks the real algorithm against real, current data, with no
  // need for an isolated fixture leader.
  function depthFromPeople(people, viewerId) {
    const childrenOf = new Map();
    for (const p of people ?? []) {
      if (p.sentOutBy) {
        const list = childrenOf.get(p.sentOutBy) ?? [];
        list.push(p.id);
        childrenOf.set(p.sentOutBy, list);
      }
    }
    const visited = new Set([viewerId]);
    let peopleCount = 0;
    let generations = 0;
    let frontier = [viewerId];
    while (frontier.length > 0) {
      const next = [];
      for (const id of frontier) {
        for (const childId of childrenOf.get(id) ?? []) {
          if (visited.has(childId)) continue;
          visited.add(childId);
          next.push(childId);
          peopleCount++;
        }
      }
      if (next.length === 0) break;
      generations++;
      frontier = next;
    }
    return { generations, people: peopleCount };
  }

  console.log("depth: server's depth matches an independent BFS reimplementation on LEADER's real graph");
  // No isolated fixture leader needed for this: LEADER is a real leader
  // account, its real graph (whatever shape production has given it) is
  // fair game to check the algorithm against, and nothing here writes to
  // `leaders`.
  const beforeChainRes = await fetch(`${BASE}/api/network?email=${encodeURIComponent(LEADER)}`);
  const beforeChainGraph = await beforeChainRes.json();
  const localDepthBefore = depthFromPeople(beforeChainGraph.people, leaderId);
  check(
    "matches before any chain is added",
    localDepthBefore.generations === beforeChainGraph.depth?.generations &&
      localDepthBefore.people === beforeChainGraph.depth?.people,
    JSON.stringify({ local: localDepthBefore, server: beforeChainGraph.depth })
  );

  console.log("depth: counts a two-generation chain hung off an already-owned node correctly");
  // `row` (TEST_EMAIL) has been sent_out_by === leaderId since the adopt-path
  // re-add above, and it was only just created this run, so it has no
  // children of its own yet. Hanging two more generations off it - direct
  // inserts, the same shape a real grandchild link takes, no `leaders` row
  // involved - extends LEADER's tree by exactly these two new, freshly
  // created people, which is checkable against the "before" snapshot above
  // as a delta, regardless of whatever else LEADER's real graph contains.
  const { data: chainChildRow, error: chainChildErr } = await db
    .from("network_people")
    .insert({
      email: APPRENTICE_CHILD_EMAIL,
      first_name: "Apprentice",
      last_name: "Child",
      sent_out_by: row.id,
      link_status: "pending",
      joined: false,
      added_by_email: TEST_EMAIL,
    })
    .select("id")
    .single();
  if (chainChildErr) throw new Error(chainChildErr.message);

  const { data: grandchildRow, error: grandchildErr } = await db
    .from("network_people")
    .insert({
      email: APPRENTICE_GRANDCHILD_EMAIL,
      first_name: "Apprentice",
      last_name: "Grandchild",
      sent_out_by: chainChildRow.id,
      link_status: "pending",
      joined: false,
      added_by_email: APPRENTICE_CHILD_EMAIL,
    })
    .select("id")
    .single();
  if (grandchildErr) throw new Error(grandchildErr.message);

  const chainRes = await fetch(`${BASE}/api/network?email=${encodeURIComponent(LEADER)}`);
  const chainGraph = await chainRes.json();
  const localDepthAfter = depthFromPeople(chainGraph.people, leaderId);
  check(
    "server depth still matches the independent BFS reimplementation after the chain is added",
    localDepthAfter.generations === chainGraph.depth?.generations &&
      localDepthAfter.people === chainGraph.depth?.people,
    JSON.stringify({ local: localDepthAfter, server: chainGraph.depth })
  );
  check(
    "adding the two-person chain increases depth.people by exactly 2",
    chainGraph.depth?.people === (beforeChainGraph.depth?.people ?? 0) + 2,
    JSON.stringify({ before: beforeChainGraph.depth, after: chainGraph.depth })
  );
  check(
    "adding the 3-hop chain (LEADER -> row -> child -> grandchild) sets generations to max(before, 3)",
    chainGraph.depth?.generations === Math.max(beforeChainGraph.depth?.generations ?? 0, 3),
    JSON.stringify({ before: beforeChainGraph.depth, after: chainGraph.depth })
  );

  console.log("apprentice step: refused when the person is a generation out of reach");
  // The grandchild's sent_out_by is the chain's CHILD node, not LEADER, so
  // LEADER trying to set the grandchild's step must be refused even though
  // LEADER can see the grandchild in their own network graph.
  const grandchildStepAttempt = await post({
    action: "set-apprentice-step",
    actorEmail: LEADER,
    id: grandchildRow.id,
    step: 1,
  });
  check(
    "skipping a generation to set a step is refused with 403",
    grandchildStepAttempt.status === 403,
    JSON.stringify(grandchildStepAttempt.json)
  );

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
