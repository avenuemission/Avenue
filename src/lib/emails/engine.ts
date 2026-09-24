// The hourly leader email run (spec 3.3). The database, the mailer, the
// clock and the pause between sends are injected, so the whole flow is
// unit tested without Supabase or Gmail.
//
// Safety, in order:
// 1. Nothing is loaded unless a kind is due this hour (Melbourne time).
// 2. Recipients come only from recipientsFor: full-access leaders who have
//    not turned the kind off. An email for any other address, or for an
//    address that is not one plain address, is refused.
// 3. Dry run (the default) renders and reports; it never sends or writes.
// 4. What is already done comes from one log read per due kind. Live, the
//    log row is claimed BEFORE sending. A duplicate claim means another run
//    has it, so nothing is sent. A failed send releases the claim so a
//    later run that day retries, and is reported loud. A send that timed
//    out (SendOutcomeUnknownError) keeps its claim: Gmail may have taken
//    it, and a retry could send it twice. It is reported loud instead.
// 4b. A live send needs the recipient's real unsubscribe token (a UUID);
//    without one it is refused, so no email goes out with a dead link.
// 5. One recipient failing never stops the others. Sends are sequential,
//    paused before each claim after the first, capped per run, and stop
//    once the time budget is spent (the rest wait for the next hour).
import { melbourneParts, mondayOfISO } from "@/lib/melbourneDate";
import { composeFor, type Outgoing, type Snapshot } from "./compose";
import type { RenderedEmail } from "./layout";
import { recipientsFor, type EmailKind, type PrefsRow } from "./prefs";
import { dueKinds, periodKeyFor } from "./schedule";
import { topicForWeek } from "./topic";

export type LogStatus = "sent" | "baseline";

export interface EngineDb {
  // Makes sure every email has a preferences row (and so a token); returns all rows.
  ensurePrefs(emails: string[]): Promise<PrefsRow[]>;
  // Every "<email>|<period_key>" already logged for one kind, in one read:
  // this period's rows for a periodic kind, every row for milestones (null).
  loggedKeys(kind: EmailKind, periodKey: string | null): Promise<Set<string>>;
  // Inserts the log row. False when it already exists (unique constraint).
  claim(email: string, kind: EmailKind, periodKey: string, status: LogStatus): Promise<boolean>;
  // Deletes a "sent" claim after a failed send.
  release(email: string, kind: EmailKind, periodKey: string): Promise<void>;
}

export interface EngineDeps extends EngineDb {
  now: Date;
  dryRun: boolean;
  maxSends: number;
  delayMs: number;
  // A live run claims nothing new once this many ms have passed since it
  // started (Netlify stops a scheduled function at 30 s).
  budgetMs: number;
  clock(): number;
  loadSnapshot(): Promise<Snapshot>;
  send(to: string, message: RenderedEmail): Promise<void>;
  sleep(ms: number): Promise<void>;
  log(line: string): void;
}

export interface RunReport {
  dryRun: boolean;
  due: EmailKind[];
  wouldSend: string[];
  sent: string[];
  skipped: string[];
  baselined: string[];
  failed: string[];
  deferred: string[];
  unparseableGuides: string[];
}

export const BASELINE_KEY = "baseline";

// Thrown by a send that did not finish in time. Whether the mail server
// accepted the email is unknown, so the engine keeps the claim.
export class SendOutcomeUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendOutcomeUnknownError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One address and nothing else: no spaces, commas, semicolons, quotes or
// angle brackets, any of which could turn one "to" into several.
const PLAIN_ADDRESS = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

const label = (o: { kind: EmailKind; email: string; periodKey: string }) => `${o.kind} ${o.email} ${o.periodKey}`;

// A leader's first milestones run (no baseline marker in the log) records
// what they already have without sending it. Launch countdowns are dated,
// so they are never baselined. Returns what is left to send.
async function baselineFirst(deps: EngineDeps, email: string, outgoing: Outgoing[], report: RunReport): Promise<Outgoing[]> {
  const already = outgoing.filter((o) => o.baselineable);
  for (const o of already) {
    if (!deps.dryRun) await deps.claim(email, "milestones", o.periodKey, "baseline");
    report.baselined.push(label(o));
  }
  if (!deps.dryRun) await deps.claim(email, "milestones", BASELINE_KEY, "baseline");
  deps.log(`${deps.dryRun ? "would baseline" : "baselined"} ${already.length} milestone(s) for ${email}`);
  return outgoing.filter((o) => !o.baselineable);
}

export async function runLeaderEmails(deps: EngineDeps): Promise<RunReport> {
  const started = deps.clock();
  const outOfTime = () => deps.clock() - started >= deps.budgetMs;
  const report: RunReport = {
    dryRun: deps.dryRun,
    due: dueKinds(deps.now),
    wouldSend: [],
    sent: [],
    skipped: [],
    baselined: [],
    failed: [],
    deferred: [],
    unparseableGuides: [],
  };
  if (report.due.length === 0) {
    deps.log("nothing due this hour");
    return report;
  }
  deps.log(`${deps.dryRun ? "DRY RUN" : "LIVE"}: due ${report.due.join(", ")}`);

  // Throws (loud) on any read error, including missing email tables.
  let snap = await deps.loadSnapshot();
  const fullAccess = new Set(
    snap.leaders
      .filter((l) => l.full_access === true)
      .map((l) => l.email.trim().toLowerCase())
      .filter((email) => PLAIN_ADDRESS.test(email))
  );
  if (!deps.dryRun) snap = { ...snap, prefs: await deps.ensurePrefs([...fullAccess].sort()) };

  // What is already done: one read per due kind, so a run spends its time
  // on new work rather than re-checking old sends one by one. The claim
  // below stays the guarantee (another run may claim in between).
  const logged = new Map<EmailKind, Set<string>>();
  for (const kind of report.due) {
    logged.set(kind, await deps.loggedKeys(kind, kind === "milestones" ? null : periodKeyFor(kind, deps.now)));
  }
  const isLogged = (kind: EmailKind, email: string, periodKey: string) =>
    logged.get(kind)?.has(`${email}|${periodKey}`) ?? false;

  if (report.due.includes("digest")) {
    report.unparseableGuides = topicForWeek(snap.guides, mondayOfISO(melbourneParts(deps.now).date)).unparseable;
    for (const g of report.unparseableGuides) deps.log(`study guide skipped, date not DD/MM/YYYY: ${g}`);
  }

  let sends = 0;
  for (const kind of report.due) {
    for (const recipient of recipientsFor(kind, snap.leaders, snap.prefs)) {
      try {
        if (!fullAccess.has(recipient.email)) {
          throw new Error(`refusing ${kind} to ${recipient.email}: not one plain full-access address`);
        }
        let outgoing = composeFor(kind, recipient, snap);
        for (const out of outgoing) {
          if (out.email !== recipient.email) {
            throw new Error(`refusing to send ${out.kind} to ${out.email}: not this recipient`);
          }
        }
        if (kind === "milestones" && !isLogged("milestones", recipient.email, BASELINE_KEY)) {
          if (!deps.dryRun && outOfTime()) {
            for (const out of outgoing) report.deferred.push(label(out));
            continue;
          }
          outgoing = await baselineFirst(deps, recipient.email, outgoing, report);
        }

        for (const out of outgoing) {
          if (isLogged(out.kind, out.email, out.periodKey)) {
            report.skipped.push(label(out));
            continue;
          }
          if (deps.dryRun) {
            report.wouldSend.push(label(out));
            deps.log(`would send ${label(out)}: ${out.message.subject}`);
            continue;
          }
          if (sends >= deps.maxSends || outOfTime()) {
            report.deferred.push(label(out));
            continue;
          }
          if (typeof recipient.token !== "string" || !UUID.test(recipient.token)) {
            throw new Error(`refusing ${out.kind} to ${out.email}: no unsubscribe token`);
          }
          // Pause BEFORE claiming: a run stopped mid-pause leaves no
          // claimed-but-unsent row that would drop this email for the period.
          if (sends > 0) await deps.sleep(deps.delayMs);
          if (!(await deps.claim(out.email, out.kind, out.periodKey, "sent"))) {
            report.skipped.push(label(out));
            continue;
          }
          sends += 1;
          try {
            await deps.send(out.email, out.message);
            report.sent.push(label(out));
            deps.log(`sent ${label(out)}`);
          } catch (e) {
            if (e instanceof SendOutcomeUnknownError) {
              report.failed.push(`${label(out)}: ${e.message}: outcome unknown, not retried`);
              console.error(`[leader-emails] SEND OUTCOME UNKNOWN ${label(out)}: claim kept, not retried`, e);
              continue;
            }
            report.failed.push(`${label(out)}: ${(e as Error).message}`);
            console.error(`[leader-emails] SEND FAILED ${label(out)}`, e);
            await deps.release(out.email, out.kind, out.periodKey);
          }
        }
      } catch (e) {
        report.failed.push(`${kind} ${recipient.email}: ${(e as Error).message}`);
        console.error(`[leader-emails] FAILED ${kind} ${recipient.email}`, e);
      }
    }
  }

  deps.log(
    `done: ${report.sent.length} sent, ${report.wouldSend.length} would send, ${report.skipped.length} skipped, ` +
      `${report.deferred.length} deferred, ${report.failed.length} failed`
  );
  return report;
}
