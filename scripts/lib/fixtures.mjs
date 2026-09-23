// Shared helpers for scripts that exercise the API against production.
// There is no staging database, so every fixture email MUST end in
// @example.invalid and every delete matches one exact literal email.
import { createClient } from "@supabase/supabase-js";

export const FIXTURE_DOMAIN = "@example.invalid";

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function assertFixtureEmail(email) {
  if (typeof email !== "string" || !email.endsWith(FIXTURE_DOMAIN) || email !== email.toLowerCase()) {
    throw new Error(`Refusing to touch non-fixture email: ${email}`);
  }
}

export async function createFixtureLeader({ email, name, fullAccess }) {
  assertFixtureEmail(email);
  const { error } = await db
    .from("leaders")
    .insert({ id: `fixture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, email, name, full_access: fullAccess });
  if (error) throw new Error(`createFixtureLeader ${email}: ${error.message}`);
}

async function findAuthUserId(email) {
  // listUsers pages at 50 by default; production has only a handful of users.
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  throw new Error("listUsers: too many pages");
}

// Returns a real access token for an email without sending any email:
// the admin API mints a magic link, and its hashed token is verified
// directly with the anon client, exactly as the browser would.
export async function tokenFor(email) {
  const { error: createErr } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (createErr && !/already|registered|exists/i.test(createErr.message)) {
    throw new Error(`createUser ${email}: ${createErr.message}`);
  }
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyErr) throw new Error(`verifyOtp ${email}: ${verifyErr.message}`);
  return verified.session.access_token;
}

const EMAIL_TABLES = [
  ["leader_profiles", "email"],
  ["leader_checkins", "email"],
  ["leader_training_progress", "email"],
  ["network_people", "email"],
  ["leaders", "email"],
];

// Deletes every trace of each fixture email, one exact email at a time.
// leader_people is added in Task 8; its delete is skipped until the table exists.
export async function cleanupFixtures(emails) {
  const problems = [];
  for (const email of emails) {
    assertFixtureEmail(email);
    const { error: peopleErr } = await db.from("leader_people").delete().eq("owner_email", email);
    if (peopleErr && !/does not exist|schema cache/i.test(peopleErr.message)) problems.push(`leader_people ${email}: ${peopleErr.message}`);
    for (const [table, column] of EMAIL_TABLES) {
      const { error } = await db.from(table).delete().eq(column, email);
      if (error) problems.push(`${table} ${email}: ${error.message}`);
    }
    const id = await findAuthUserId(email);
    if (id) {
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) problems.push(`auth user ${email}: ${error.message}`);
    }
  }
  if (problems.length) throw new Error(`Cleanup incomplete:\n${problems.join("\n")}`);
}

export async function listAuthUserEmails() {
  const emails = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    emails.push(...data.users.map((u) => (u.email ?? "").toLowerCase()));
    if (data.users.length < 200) return emails;
  }
  throw new Error("listUsers: too many pages");
}
