// Signs up a throwaway leader, checks a network node appeared, cleans up.
// Run: node --env-file=.env.local scripts/check-network-signup.mjs
import { createClient } from "@supabase/supabase-js";
import { tokenFor, cleanupFixtures } from "../lib/fixtures.mjs";

const BASE = "http://localhost:3000";
const EMAIL = "signup-check-temp@example.invalid";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Both deletes filter on the exact literal EMAIL above. Never widen this to
// neq/like/prefix matching and never touch info@avenuemission.com or
// henry.jamcmahon@gmail.com.
async function cleanup() {
  await db.from("network_people").delete().eq("email", EMAIL);
  await db.from("leaders").delete().eq("email", EMAIL);
}

await cleanup();

let failures = 0;

try {
  // A discipler names them before they ever sign up.
  const { data: seed, error: seedErr } = await db
    .from("network_people")
    .insert({ email: EMAIL, first_name: "Placeholder", joined: false })
    .select("id")
    .single();
  if (seedErr) throw new Error(seedErr.message);

  const res = await fetch(`${BASE}/api/leader-access`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, name: "Temp Signup" }),
  });
  console.log("signup status:", res.status);

  const { data: node } = await db
    .from("network_people")
    .select("id, joined, first_name")
    .eq("email", EMAIL)
    .maybeSingle();

  if (!node) { console.log("FAIL no node"); failures++; }
  if (node && node.id !== seed.id) { console.log("FAIL created a duplicate instead of claiming"); failures++; }
  if (node && node.joined !== true) { console.log("FAIL node was not marked joined"); failures++; }
  if (node && node.first_name !== "Placeholder") {
    console.log("FAIL discipler-entered first_name was overwritten:", node.first_name);
    failures++;
  }

  // The access check now reads the caller from a verified session, never
  // from the query string: a token for the new leader sees their own row,
  // and no token at all is refused.
  const token = await tokenFor(EMAIL);
  const accessRes = await fetch(`${BASE}/api/leader-access`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const access = await accessRes.json().catch(() => null);
  if (accessRes.status !== 200 || access?.found !== true || access?.full_access !== false) {
    console.log("FAIL access GET with the new leader's token:", accessRes.status, JSON.stringify(access));
    failures++;
  }
  const noTokenRes = await fetch(`${BASE}/api/leader-access`);
  if (noTokenRes.status !== 401) {
    console.log("FAIL access GET with no token was not 401:", noTokenRes.status);
    failures++;
  }

  console.log(failures === 0 ? "OK: signup claims the existing node" : `${failures} failure(s)`);
} finally {
  await cleanup();
  // Also removes the auth user tokenFor created, by exact fixture email.
  await cleanupFixtures([EMAIL]);
  console.log("cleaned up the temporary rows");
}

process.exit(failures === 0 ? 0 : 1);
