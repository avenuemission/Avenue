// End-to-end checks that every leader route trusts only the verified session.
// Needs the dev server on :3000. Run: node --env-file=.env.local scripts/check-auth.mjs
import { db, createFixtureLeader, tokenFor, cleanupFixtures } from "./lib/fixtures.mjs";

const BASE = "http://localhost:3000";
const A = "auth-check-a@example.invalid"; // leader, full_access false
const B = "auth-check-b@example.invalid"; // leader, full_access true
const OUTSIDER = "auth-check-outsider@example.invalid"; // auth user, NOT in leaders
const ALL = [A, B, OUTSIDER];

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${detail}`); }
}

async function call(method, path, { token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body, e.g. a file */ }
  return { status: res.status, json };
}

// Leader routes: each must refuse a missing or garbage token with 401.
const GUARDED = [
  ["GET", "/api/leader-access"],
  ["GET", "/api/leader-profile"],
  ["PUT", "/api/leader-profile"],
  ["GET", "/api/leader-checkins"],
  ["GET", "/api/leader-training"],
  ["GET", "/api/network"],
];

try {
  await cleanupFixtures(ALL); // leftovers from an interrupted run
  await createFixtureLeader({ email: A, name: "Auth Check A", fullAccess: false });
  await createFixtureLeader({ email: B, name: "Auth Check B", fullAccess: true });
  const tokenA = await tokenFor(A);
  const tokenB = await tokenFor(B);
  const tokenOutsider = await tokenFor(OUTSIDER);

  console.log("request-code");
  {
    const r = await call("POST", "/api/auth/request-code", { body: { email: "auth-check-nobody@example.invalid" } });
    check("unknown email gets the neutral 200", r.status === 200 && r.json?.ok === true, JSON.stringify(r));
    const bad = await call("POST", "/api/auth/request-code", { body: { email: "not-an-email" } });
    check("malformed email is 400", bad.status === 400);
  }

  console.log("no token, garbage token, non-leader token");
  for (const [method, path] of GUARDED) {
    const none = await call(method, path, { body: method === "GET" ? undefined : {} });
    check(`${method} ${path} without token is 401`, none.status === 401, `got ${none.status}`);
    const junk = await call(method, path, { token: "not-a-jwt", body: method === "GET" ? undefined : {} });
    check(`${method} ${path} with garbage token is 401`, junk.status === 401, `got ${junk.status}`);
    const outsider = await call(method, path, { token: tokenOutsider, body: method === "GET" ? undefined : {} });
    check(`${method} ${path} for a non-leader is 403`, outsider.status === 403, `got ${outsider.status}`);
  }

  console.log("body email is ignored");
  {
    const r = await call("PUT", "/api/leader-profile", { token: tokenA, body: { email: B, about: "written by A" } });
    check("profile PUT succeeds for A", r.status === 200, JSON.stringify(r));
    const { data: bRow, error: bErr } = await db.from("leader_profiles").select("about").eq("email", B).maybeSingle();
    if (bErr) throw new Error(bErr.message);
    check("B's profile untouched by A's request", !bRow || bRow.about !== "written by A");
    const { data: aRow, error: aErr } = await db.from("leader_profiles").select("about").eq("email", A).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    check("A's own profile holds the write", aRow?.about === "written by A");
  }

  console.log("leader-access returns the caller's own row");
  {
    const r = await call("GET", `/api/leader-access?email=${encodeURIComponent(B)}`, { token: tokenA });
    check("A asking about B still gets A", r.status === 200 && r.json?.name === "Auth Check A" && r.json?.full_access === false, JSON.stringify(r));
  }

  console.log("resources need full access");
  {
    const a = await call("GET", "/api/leader-resources", { token: tokenA });
    check("A (no full access) is 403 on resources", a.status === 403, `got ${a.status}`);
    const b = await call("GET", "/api/leader-resources", { token: tokenB });
    check("B (full access) lists resources", b.status === 200 && Array.isArray(b.json?.resources), `got ${b.status}`);
    const none = await call("GET", "/api/leader-resources");
    check("resources without token is 401", none.status === 401);

    const listed = b.json?.resources ?? [];
    const nested = listed.find((r) => typeof r.name === "string" && r.name.includes("/"));
    if (nested) {
      const dl = await fetch(`${BASE}/api/leader-resources/${encodeURIComponent(nested.name)}`, {
        headers: { authorization: `Bearer ${tokenB}` },
      });
      check("B downloads a file in a subfolder", dl.status === 200, `got ${dl.status} for ${nested.name}`);
    } else {
      console.log("  SKIP no nested resource listed");
    }
    const escape = await fetch(`${BASE}/api/leader-resources/${encodeURIComponent("../../package.json")}`, {
      headers: { authorization: `Bearer ${tokenB}` },
    });
    check("path traversal is refused", escape.status === 404, `got ${escape.status}`);
  }

  console.log("workshop admin routes need a leader");
  for (const [method, path] of [
    ["GET", "/api/workshops/results?code=ALL"],
    ["GET", "/api/workshops/sessions"],
    ["POST", "/api/workshops/sessions"],
    ["DELETE", "/api/workshops/clear?code=ZZZZZZ"],
    ["POST", "/api/workshops/ai-speak"],
    ["POST", "/api/workshops/ai-recommendation"],
  ]) {
    const r = await call(method, path, { body: method === "GET" || method === "DELETE" ? undefined : {} });
    check(`${method} ${path} without token is 401`, r.status === 401, `got ${r.status}`);
  }
  {
    const r = await call("GET", "/api/workshops/sessions", { token: tokenA });
    check("a leader can list workshop sessions", r.status === 200, `got ${r.status}`);
    const v = await call("POST", "/api/workshops/validate-code", { body: { code: "ZZZZZZ" } });
    check("validate-code stays public (not 401)", v.status !== 401, `got ${v.status}`);
  }

  console.log("seed route needs admin");
  {
    const r = await call("POST", "/api/leader-access/seed");
    check("seed without admin key is 401", r.status === 401, `got ${r.status}`);
  }

  console.log("people are private to their owner");
  {
    const probe = await db.from("leader_people").select("id").limit(1);
    if (probe.error && /does not exist|schema cache/i.test(probe.error.message)) {
      console.log("  SKIP people checks: leader_people table not created yet (run migration 007)");
    } else if (probe.error) {
      throw new Error(probe.error.message);
    } else {
      const none = await call("GET", "/api/people");
      check("people without token is 401", none.status === 401);
      const created = await call("POST", "/api/people", { token: tokenA, body: { firstName: "Fixture Friend", spaces: ["third"], owner_email: B } });
      check("A creates a person", created.status === 201 && created.json?.person?.firstName === "Fixture Friend", JSON.stringify(created));
      const id = created.json?.person?.id;
      const { data: row, error } = await db.from("leader_people").select("owner_email").eq("id", id).single();
      if (error) throw new Error(error.message);
      check("owner is A even though the body said B", row.owner_email === A);
      const bList = await call("GET", "/api/people", { token: tokenB });
      check("B cannot see A's person", bList.status === 200 && !bList.json.people.some((p) => p.id === id));
      const bPatch = await call("PATCH", "/api/people", { token: tokenB, body: { id, icnu: "hijack" } });
      check("B cannot edit A's person (404)", bPatch.status === 404, `got ${bPatch.status}`);
      const bDelete = await call("DELETE", `/api/people?id=${id}`, { token: tokenB });
      check("B cannot delete A's person (404)", bDelete.status === 404, `got ${bDelete.status}`);
      const aPatch = await call("PATCH", "/api/people", { token: tokenA, body: { id, metrics: ["pathways", "streetlights"], icnu: "I see a shepherd" } });
      check("A edits their person", aPatch.status === 200 && aPatch.json?.person?.metrics?.length === 2, JSON.stringify(aPatch));
      const badTag = await call("PATCH", "/api/people", { token: tokenA, body: { id, spaces: ["fourth"] } });
      check("invalid space is 400", badTag.status === 400);
      const aDelete = await call("DELETE", `/api/people?id=${id}`, { token: tokenA });
      check("A deletes their person", aDelete.status === 200);
    }
  }

  // Task 8 appends: people.
} finally {
  await cleanupFixtures(ALL);
  console.log("fixtures cleaned");
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log("\nall passed");
