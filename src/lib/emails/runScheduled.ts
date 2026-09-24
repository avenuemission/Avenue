// Wires the engine to the real world for the Netlify scheduled function:
// a service-role Supabase client, Gmail through the shared sendEmail, a
// real pause between sends. Dry run unless LEADER_EMAILS_DRY_RUN is exactly
// "false". Kept in src/lib so Vitest covers it; the .mts file only calls it.
// It builds its own client rather than using getSupabaseAdmin, which pulls
// next/server into the function bundle.
import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { runLeaderEmails, type RunReport } from "./engine";
import { createEngineDb } from "./engineDb";
import { loadSnapshot } from "./loadSnapshot";

export const MAX_SENDS_PER_RUN = 20;
export const SEND_DELAY_MS = 1000;
// Netlify stops a scheduled function at 30 s. Each send opens a fresh Gmail
// SMTP connection (the shared transporter is not pooled), so a run stops
// claiming new work after 20 s and leaves the rest for the next hour.
export const RUN_BUDGET_MS = 20_000;

type Env = Record<string, string | undefined>;

export function isDryRun(env: Env = process.env): boolean {
  return env.LEADER_EMAILS_DRY_RUN !== "false";
}

export async function runScheduled(now: Date = new Date(), env: Env = process.env): Promise<RunReport> {
  const dryRun = isDryRun(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("leader-emails: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  if (!dryRun && !isEmailConfigured()) {
    throw new Error("leader-emails: GMAIL_USER and GMAIL_APP_PASSWORD must be set for a live run");
  }
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const report = await runLeaderEmails({
    now,
    dryRun,
    maxSends: MAX_SENDS_PER_RUN,
    delayMs: SEND_DELAY_MS,
    budgetMs: RUN_BUDGET_MS,
    clock: () => Date.now(),
    loadSnapshot: () => loadSnapshot(db, now),
    ...createEngineDb(db),
    send: (to, message) => sendEmail(to, message.subject, message.html, { text: message.text, headers: message.headers }),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(`[leader-emails] ${line}`),
  });
  console.log(`[leader-emails] report ${JSON.stringify(report)}`);
  return report;
}
