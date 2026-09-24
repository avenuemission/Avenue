// Confirms leader_training_progress exists with every column the API expects.
// Run: node --env-file=.env.local scripts/check-training-table.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
  process.exit(1);
}

const { error } = await createClient(url, key)
  .from("leader_training_progress")
  .select(
    "email, watched_episodes, completed_modules, checkpoint_status, " +
      "checkpoint_requested_at, checkpoint_completed_at, checkpoint_completed_by, updated_at, revision"
  )
  .limit(1);

if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}

console.log("OK: leader_training_progress exists with every expected column");
