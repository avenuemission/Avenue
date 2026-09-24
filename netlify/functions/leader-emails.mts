// Hourly leader emails (spec 2026-09-24 church health emails, 3.3).
// Netlify runs this at minute 0 of every UTC hour; runScheduled works out
// what is due in Melbourne. Dry run unless LEADER_EMAILS_DRY_RUN is exactly
// "false". Scheduled functions run only on the published deploy and stop
// after 30 seconds, which is why each run sends at most 20 emails and
// claims nothing new after 20 seconds.
import type { Config } from "@netlify/functions";
import { runScheduled } from "../../src/lib/emails/runScheduled";

export default async function leaderEmails(): Promise<Response> {
  const report = await runScheduled();
  return new Response(JSON.stringify(report), { headers: { "content-type": "application/json" } });
}

export const config: Config = {
  schedule: "@hourly",
};
