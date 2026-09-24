// Not guarded with server-only: the Netlify scheduled function imports this in plain Node. The ESLint boundary rule keeps it out of client code.
// Wires the engine to the real world for the Netlify scheduled function:
// a service-role Supabase client, Gmail through the shared sendEmail, a
// real pause between sends. Dry run unless LEADER_EMAILS_DRY_RUN is exactly
// "false". Kept in src/lib so Vitest covers it; the .mts file only calls it.
// It builds its own client rather than using getSupabaseAdmin, which pulls
// next/server into the function bundle.
import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail } from "@/lib/server/mail/transport";
import { runLeaderEmails, SendOutcomeUnknownError, type RunReport } from "./engine";
import { createEngineDb } from "./engineDb";
import { loadSnapshot } from "./loadSnapshot";

export const MAX_SENDS_PER_RUN = 20;
export const SEND_DELAY_MS = 1000;
// Netlify stops a scheduled function at 30 s. Each send opens a fresh Gmail
// SMTP connection (the shared transporter is not pooled), so a run stops
// claiming new work after 20 s and leaves the rest for the next hour.
export const RUN_BUDGET_MS = 20_000;
// Nodemailer's own timeouts are minutes long, so one hung send could run
// past Netlify's 30 s stop with nothing logged. Each send gets 8 s.
export const SEND_TIMEOUT_MS = 8_000;

// Races a send against a timer. On timeout it throws
// SendOutcomeUnknownError, which the engine reports loud without
// releasing the claim (Gmail may still have accepted the email).
export function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SendOutcomeUnknownError(`${what} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

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
    send: (to, message) =>
      withTimeout(
        sendEmail(to, message.subject, message.html, { text: message.text, headers: message.headers }),
        SEND_TIMEOUT_MS,
        `send to ${to}`
      ),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(`[leader-emails] ${line}`),
  });
  console.log(`[leader-emails] report ${JSON.stringify(report)}`);
  return report;
}
