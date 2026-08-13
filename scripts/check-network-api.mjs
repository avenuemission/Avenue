// Exercises /api/network against the local dev server, then cleans up.
// Run: node --env-file=.env.local scripts/check-network-api.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const LEADER = "info@avenuemission.com";
const TEST_EMAIL = "network-check-temp@example.invalid";

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

const post = (body) =>
  fetch(`${BASE}/api/network`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

async function cleanup() {
  await db.from("network_people").delete().eq("email", TEST_EMAIL);
}

await cleanup();

try {
  console.log("GET");
  const res = await fetch(`${BASE}/api/network?email=${encodeURIComponent(LEADER)}`);
  const graph = await res.json();
  check("returns 200", res.status === 200, JSON.stringify(graph).slice(0, 200));
  check("gives the viewer a node", typeof graph.viewerId === "string");
  check("returns a people array", Array.isArray(graph.people));

  console.log("GET with an unknown email");
  const denied = await fetch(`${BASE}/api/network?email=nobody@example.invalid`);
  check("is refused with 403", denied.status === 403);

  console.log("add");
  const added = await post({
    action: "add",
    actorEmail: LEADER,
    firstName: "Temp",
    lastName: "Check",
    email: TEST_EMAIL,
  });
  check("succeeds", added.status === 200, JSON.stringify(added.json));

  const { data: row } = await db
    .from("network_people")
    .select("id, sent_out_by, link_status, joined, first_name")
    .eq("email", TEST_EMAIL)
    .maybeSingle();
  check("stores the person", !!row);
  check("hangs them off the actor", !!row?.sent_out_by);
  check("starts pending", row?.link_status === "pending");
  check("marks them as not joined", row?.joined === false);

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
  check("succeeds", removed.status === 200, JSON.stringify(removed.json));
  const { data: after } = await db
    .from("network_people")
    .select("sent_out_by")
    .eq("id", row.id)
    .maybeSingle();
  check("clears the sender", after?.sent_out_by === null);

  console.log("remove someone you are not linked to");
  const notYours = await post({ action: "remove", actorEmail: LEADER, id: row.id });
  check("is refused with 403", notYours.status === 403, JSON.stringify(notYours.json));

  console.log("unknown action");
  const bogus = await post({ action: "nonsense", actorEmail: LEADER });
  check("is refused with 400", bogus.status === 400);
} finally {
  await cleanup();
  console.log("cleaned up the temporary person");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll network API checks passed");
