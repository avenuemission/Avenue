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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by the Task 7 resource checks
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

  // Task 7 appends: resources, workshops, seed.
  // Task 8 appends: people.
} finally {
  await cleanupFixtures(ALL);
  console.log("fixtures cleaned");
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log("\nall passed");
