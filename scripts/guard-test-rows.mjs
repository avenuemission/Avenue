// Fails loudly if any @example.invalid fixture is left in production.
// Read only. Run: npm run guard
import { db, FIXTURE_DOMAIN, listAuthUserEmails } from "./lib/fixtures.mjs";

const COLUMNS = [
  ["leaders", "email"],
  ["leader_profiles", "email"],
  ["network_people", "email"],
  ["network_people", "added_by_email"],
  ["leader_training_progress", "email"],
  ["leader_checkins", "email"],
  ["leader_people", "owner_email"],
];

const hits = [];
for (const [table, column] of COLUMNS) {
  const { data, error } = await db.from(table).select(column).ilike(column, `%${FIXTURE_DOMAIN}`);
  if (error) {
    if (table === "leader_people" && /does not exist|schema cache/i.test(error.message)) continue;
    console.error(`ERROR reading ${table}.${column}: ${error.message}`);
    process.exit(2);
  }
  for (const row of data ?? []) hits.push(`${table}.${column} = ${row[column]}`);
}
for (const email of await listAuthUserEmails()) {
  if (email.endsWith(FIXTURE_DOMAIN)) hits.push(`auth.users.email = ${email}`);
}

if (hits.length) {
  console.error(`FIXTURE ROWS IN PRODUCTION (${hits.length}):`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log("clean");
