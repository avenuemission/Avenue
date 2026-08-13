// Confirms network_people exists with every column the API expects.
// Run: node --env-file=.env.local scripts/check-network-table.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  process.exit(1);
}

const { error } = await createClient(url, key)
  .from("network_people")
  .select(
    "id, email, first_name, last_name, sent_out_by, link_status, added_by_email, joined, created_at, updated_at"
  )
  .limit(1);

if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}

console.log("OK: network_people exists with every expected column");
