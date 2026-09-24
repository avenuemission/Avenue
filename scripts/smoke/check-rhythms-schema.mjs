// Confirms the Growth and Multiplication schema is in place:
// the leader_checkins table, and apprentice_step on network_people.
// Run: node --env-file=.env.local scripts/check-rhythms-schema.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  process.exit(1);
}

const db = createClient(url, key);
let failures = 0;

const checkins = await db
  .from("leader_checkins")
  .select(
    "email, week_start, relational, physical, mental, spiritual, reflection, created_at, updated_at"
  )
  .limit(1);

if (checkins.error) {
  console.error("FAIL leader_checkins:", checkins.error.message);
  failures++;
} else {
  console.log("OK: leader_checkins exists with every expected column");
}

const step = await db.from("network_people").select("id, apprentice_step").limit(1);

if (step.error) {
  console.error("FAIL network_people.apprentice_step:", step.error.message);
  failures++;
} else {
  console.log("OK: network_people.apprentice_step exists");
}

process.exit(failures === 0 ? 0 : 1);
