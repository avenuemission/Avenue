// End-to-end checks that every leader route trusts only the verified session.
// Needs the dev server on :3000. Run: node --env-file=.env.local scripts/check-auth.mjs
import { db, createFixtureLeader, tokenFor, cleanupFixtures } from "./lib/fixtures.mjs";

const BASE = "http://localhost:3000";
const A = "auth-check-a@example.invalid"; // leader, full_access false
const B = "auth-check-b@example.invalid"; // leader, full_access true
const OUTSIDER = "auth-check-outsider@example.invalid"; // auth user, NOT in leaders
const ADDED = "auth-check-added@example.invalid"; // network person A adds, never an auth user
// ADDED goes first: its network row points at A's node, so it is removed before A's.
const ADMIN_TARGET = "auth-check-admin@example.invalid"; // leader the admin route deletes
const ALL = [ADDED, A, B, OUTSIDER, ADMIN_TARGET];

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
  ["PUT", "/api/leader-checkins"],
  ["PUT", "/api/leader-training"],
  ["POST", "/api/leader-training"],
  ["POST", "/api/network"],
  // 401 and 403 come before any table access, so these run even before
  // the leader_people migration exists.
  ["PATCH", "/api/people"],
  ["DELETE", "/api/people?id=00000000-0000-0000-0000-000000000000"],
  ["GET", "/api/worksheets?kind=calling"],
  ["PATCH", "/api/worksheets"],
  ["DELETE", "/api/worksheets?kind=calling"],
];

// A Monday three weeks ago (UTC), same logic as check-checkins-api.mjs:
// a real past Monday, never near the route's future-date boundary.
function mondayWeeksAgo(n) {
  const now = new Date();
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday - n * 7));
  return monday.toISOString().slice(0, 10);
}
const WEEK = mondayWeeksAgo(3);

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

    const ci = await call("PUT", "/api/leader-checkins", {
      token: tokenA,
      body: { email: B, weekStart: WEEK, relational: 7, physical: 6, mental: 8, spiritual: 9 },
    });
    check("check-in PUT succeeds for A", ci.status === 200, JSON.stringify(ci));
    const { data: aCi, error: aCiErr } = await db.from("leader_checkins").select("email").eq("email", A).eq("week_start", WEEK);
    if (aCiErr) throw new Error(aCiErr.message);
    check("A's check-in row exists for that week", aCi.length === 1, `got ${aCi.length}`);
    const { data: bCi, error: bCiErr } = await db.from("leader_checkins").select("email").eq("email", B).eq("week_start", WEEK);
    if (bCiErr) throw new Error(bCiErr.message);
    check("no check-in row for B from A's request", bCi.length === 0, `got ${bCi.length}`);

    const add = await call("POST", "/api/network", {
      token: tokenA,
      body: { action: "add", actorEmail: B, firstName: "Fixture Added", email: ADDED },
    });
    check("network add succeeds for A", add.status === 200 && add.json?.ok === true, JSON.stringify(add));
    const { data: added, error: addedErr } = await db.from("network_people").select("added_by_email").eq("email", ADDED);
    if (addedErr) throw new Error(addedErr.message);
    check("added person's added_by_email is A, not the body's actorEmail", added.length === 1 && added[0].added_by_email === A, JSON.stringify(added));
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

  console.log("workshop admin routes need a full-access leader");
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
    const r = await call("GET", "/api/workshops/sessions", { token: tokenB });
    check("a full-access leader can list workshop sessions", r.status === 200, `got ${r.status}`);
    const denied = await call("GET", "/api/workshops/sessions", { token: tokenA });
    check("a leader without full access is 403 on workshop sessions", denied.status === 403, `got ${denied.status}`);
    const v = await call("POST", "/api/workshops/validate-code", { body: { code: "ZZZZZZ" } });
    check("validate-code stays public (not 401)", v.status !== 401, `got ${v.status}`);
  }

  console.log("admin leader routes manage Supabase leaders (fixtures only)");
  {
    const key = process.env.ADMIN_API_KEY;
    if (!key) {
      console.log("  SKIP admin route checks: ADMIN_API_KEY not set");
    } else {
      const admin = async (method, path, body) => {
        const res = await fetch(`${BASE}${path}`, {
          method,
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: body ? JSON.stringify(body) : undefined,
        });
        let json = null;
        try { json = await res.json(); } catch { /* empty */ }
        return { status: res.status, json };
      };
      const noKey = await call("GET", "/api/leader-access/admin");
      check("admin list without key is 401", noKey.status === 401, `got ${noKey.status}`);
      const list = await admin("GET", "/api/leader-access/admin");
      check("admin list includes fixture A from Supabase", list.status === 200 && list.json?.leaders?.some((l) => l.email === A), `got ${list.status}`);
      const grant = await admin("PUT", "/api/leader-access/admin", { email: A, full_access: true });
      check("admin grant for A is 200", grant.status === 200 && grant.json?.leader?.full_access === true, JSON.stringify(grant));
      const { data: aLeader, error: aLeaderErr } = await db.from("leaders").select("full_access").eq("email", A).single();
      if (aLeaderErr) throw new Error(aLeaderErr.message);
      check("A's Supabase row now has full access", aLeader.full_access === true);
      const revoke = await admin("PUT", "/api/leader-access/admin", { email: A, full_access: false });
      check("admin revoke for A is 200", revoke.status === 200 && revoke.json?.leader?.full_access === false, JSON.stringify(revoke));
      const missingPut = await admin("PUT", "/api/leader-access/admin", { email: "auth-check-nobody@example.invalid", full_access: true });
      check("admin update of a missing leader is 404", missingPut.status === 404, `got ${missingPut.status}`);
      const missingDel = await admin("DELETE", `/api/leader-access/admin?email=${encodeURIComponent("auth-check-nobody@example.invalid")}`);
      check("admin delete of a missing leader is 404", missingDel.status === 404, `got ${missingDel.status}`);
      await createFixtureLeader({ email: ADMIN_TARGET, name: "Auth Check Admin Target", fullAccess: false });
      const del = await admin("DELETE", `/api/leader-access/admin?email=${encodeURIComponent(ADMIN_TARGET)}`);
      check("admin delete of a fixture leader is 200", del.status === 200, JSON.stringify(del));
      const { data: gone, error: goneErr } = await db.from("leaders").select("email").eq("email", ADMIN_TARGET);
      if (goneErr) throw new Error(goneErr.message);
      check("deleted fixture leader is gone from Supabase", gone.length === 0, `got ${gone.length}`);
    }
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

  console.log("worksheets are private to their owner");
  {
    const probe = await db.from("leader_worksheets").select("email").limit(1);
    if (probe.error && /does not exist|schema cache/i.test(probe.error.message)) {
      console.log("  SKIP worksheet checks: leader_worksheets table not created yet (run migration 008)");
    } else if (probe.error) {
      throw new Error(probe.error.message);
    } else {
      const patch = (token, body) => call("PATCH", "/api/worksheets", { token, body });

      const a1 = await patch(tokenA, { kind: "calling", section: "layers", value: { placements: { s1: "shared" } }, email: B });
      check("A saves a calling section", a1.status === 200 && a1.json?.data?.layers?.placements?.s1 === "shared", JSON.stringify(a1));
      const { data: bRows, error: bErr } = await db.from("leader_worksheets").select("email").eq("email", B);
      if (bErr) throw new Error(bErr.message);
      check("body email is ignored: no worksheet row for B", bRows.length === 0, `got ${bRows.length}`);

      const a2 = await patch(tokenA, { kind: "calling", section: "callable", value: { willing: "yes" } });
      check(
        "a second section merges and the first survives",
        a2.status === 200 && a2.json?.data?.layers?.placements?.s1 === "shared" && a2.json?.data?.callable?.willing === "yes",
        JSON.stringify(a2)
      );

      const b1 = await patch(tokenB, { kind: "calling", section: "layers", value: { placements: { s1: "seasonal" } } });
      check("B saves their own calling section", b1.status === 200, JSON.stringify(b1));
      const aRead = await call("GET", "/api/worksheets?kind=calling", { token: tokenA });
      check("A cannot read B's worksheet", aRead.status === 200 && aRead.json?.data?.layers?.placements?.s1 === "shared", JSON.stringify(aRead));
      const aLaunch = await call("GET", "/api/worksheets?kind=launch", { token: tokenA });
      check("an unstarted worksheet reads as {}", aLaunch.status === 200 && JSON.stringify(aLaunch.json?.data) === "{}", JSON.stringify(aLaunch));

      const badKind = await call("GET", "/api/worksheets?kind=profile", { token: tokenA });
      check("invalid kind is 400", badKind.status === 400, `got ${badKind.status}`);
      const badSection = await patch(tokenA, { kind: "calling", section: "arena", value: {} });
      check("invalid section is 400", badSection.status === 400, `got ${badSection.status}`);
      const big = await patch(tokenA, { kind: "launch", section: "invite", value: "x".repeat(20_001) });
      check("oversized value is 400", big.status === 400, `got ${big.status}`);
      const deep = await patch(tokenA, { kind: "launch", section: "invite", value: { a: { b: { c: { d: { e: { f: 1 } } } } } } });
      check("over-deep value is 400", deep.status === 400, `got ${deep.status}`);

      console.log("reset clears only the caller's own worksheet of that kind");
      const aPrayer = await patch(tokenA, { kind: "launch", section: "prayer", value: { when: "Mornings" } });
      check("A saves a launch section before the reset", aPrayer.status === 200, JSON.stringify(aPrayer));
      const reset = await call("DELETE", `/api/worksheets?kind=calling&email=${encodeURIComponent(B)}`, { token: tokenA });
      check("A resets Calling", reset.status === 200 && reset.json?.ok === true, JSON.stringify(reset));
      const aCalling = await call("GET", "/api/worksheets?kind=calling", { token: tokenA });
      check(
        "A's Calling reads as {} after the reset",
        aCalling.status === 200 && JSON.stringify(aCalling.json?.data) === "{}",
        JSON.stringify(aCalling)
      );
      const aLaunchAfter = await call("GET", "/api/worksheets?kind=launch", { token: tokenA });
      check(
        "A's Launch is untouched by a Calling reset",
        aLaunchAfter.status === 200 && aLaunchAfter.json?.data?.prayer?.when === "Mornings",
        JSON.stringify(aLaunchAfter)
      );
      const { data: bCalling, error: bCallingErr } = await db
        .from("leader_worksheets")
        .select("data")
        .eq("email", B)
        .eq("kind", "calling");
      if (bCallingErr) throw new Error(bCallingErr.message);
      check(
        "B's Calling row survives A's reset (the query's email is ignored)",
        bCalling.length === 1 && bCalling[0].data?.layers?.placements?.s1 === "seasonal",
        JSON.stringify(bCalling)
      );
      const { data: aProfile, error: aProfileErr } = await db
        .from("leader_profiles")
        .select("about")
        .eq("email", A)
        .maybeSingle();
      if (aProfileErr) throw new Error(aProfileErr.message);
      check(
        "A's profile is untouched by the reset (no other table)",
        aProfile?.about === "written by A",
        JSON.stringify(aProfile)
      );
      const again = await call("DELETE", "/api/worksheets?kind=calling", { token: tokenA });
      check("a second reset is still ok", again.status === 200 && again.json?.ok === true, JSON.stringify(again));
      const badReset = await call("DELETE", "/api/worksheets?kind=profile", { token: tokenA });
      check("reset with an invalid kind is 400", badReset.status === 400, `got ${badReset.status}`);
      const noAuthReset = await call("DELETE", "/api/worksheets?kind=launch");
      check("reset without a token is 401", noAuthReset.status === 401, `got ${noAuthReset.status}`);
      const aLaunchFinal = await call("GET", "/api/worksheets?kind=launch", { token: tokenA });
      check(
        "A's Launch still holds its answer after the refused reset",
        aLaunchFinal.json?.data?.prayer?.when === "Mornings",
        JSON.stringify(aLaunchFinal)
      );
    }
  }
} finally {
  await cleanupFixtures(ALL);
  console.log("fixtures cleaned");
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log("\nall passed");
