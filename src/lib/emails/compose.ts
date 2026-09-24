import "server-only";
// Who gets which email with what data (spec 3.2). Pure: loadSnapshot.ts
// reads the tables once per run, and composeFor turns one recipient and one
// kind into zero or more ready-to-send emails. Every email it returns is
// addressed to that recipient and nobody else.
import { apprenticesOnRung, avenueStops, hereActionFor, stopWalked, type AvenueProgress } from "@/lib/domain/avenue";
import {
  callingCompleteCount,
  isIsoDate,
  launchCompleteCount,
  recordOf,
  type CallingData,
  type LaunchData,
} from "@/lib/domain/journey";
import { METRICS, type Metric } from "@/lib/domain/people";
import {
  countMetrics,
  fullName,
  normEmail,
  type HealthCheckinRow,
  type HealthPersonRow,
  type HealthProfileRow,
} from "@/lib/domain/churchHealth";
import {
  addDaysISO,
  addMonthsKey,
  daysBetweenISO,
  melbourneDateOf,
  melbourneParts,
  mondayOfISO,
  monthKeyOf,
  monthLabel,
} from "@/lib/domain/dates/melbourne";
import { absoluteUrl, isHttpUrl, type RenderedEmail } from "./layout";
import { PREVIEW_TOKEN, type EmailKind, type LeaderRow, type PrefsRow, type Recipient } from "./prefs";
import { periodKeyFor } from "./schedule";
import {
  apprenticeEmail,
  churchHealthEmail,
  digestEmail,
  LINKS,
  milestoneEmail,
  rpmsEmail,
  type DigestTopic,
  type Milestone,
} from "./templates";
import { topicForWeek, type GuideRow } from "./topic";

export interface NetworkRow {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  sent_out_by: string | null;
  apprentice_step: number | null;
}

export interface TrainingRow {
  email: string;
  completed_modules: string[] | null;
}

export interface WorksheetRow {
  email: string;
  kind: string;
  data: unknown;
}

export interface Snapshot {
  now: Date;
  leaders: LeaderRow[];
  prefs: PrefsRow[];
  profiles: HealthProfileRow[];
  checkins: HealthCheckinRow[];
  people: HealthPersonRow[];
  network: NetworkRow[];
  training: TrainingRow[];
  worksheets: WorksheetRow[];
  guides: GuideRow[];
  foundationsModuleIds: string[];
}

export interface Outgoing {
  kind: EmailKind;
  email: string;
  periodKey: string;
  // True for milestones a leader can already have had before emails were
  // switched on (walked and ongoing stops). The engine records those as a
  // baseline on a leader's first live run instead of sending them.
  baselineable: boolean;
  message: RenderedEmail;
}

const FOLLOW_UP_DAYS = 30;
const FOLLOW_UP_MAX = 3;
const LAUNCH_COUNTDOWN = [30, 7, 1] as const;

function sheetOf(snap: Snapshot, email: string, kind: "calling" | "launch"): Record<string, unknown> {
  return recordOf(snap.worksheets.find((w) => normEmail(w.email) === email && w.kind === kind)?.data);
}

function nodeOf(snap: Snapshot, email: string): NetworkRow | undefined {
  return snap.network.find((n) => n.email !== null && normEmail(n.email) === email);
}

export function firstNameOf(recipient: Recipient, snap: Snapshot): string {
  const display = snap.profiles.find((p) => normEmail(p.email) === recipient.email)?.display_name?.trim();
  return (display || recipient.name).split(/\s+/)[0] || recipient.name;
}

// The same AvenueProgress the dashboard builds, from the snapshot.
export function progressFor(email: string, snap: Snapshot): AvenueProgress {
  const done = new Set(snap.training.find((t) => normEmail(t.email) === email)?.completed_modules ?? []);
  const me = nodeOf(snap, email);
  return {
    foundationsDone: snap.foundationsModuleIds.filter((id) => done.has(id)).length,
    foundationsTotal: snap.foundationsModuleIds.length,
    callingDone: callingCompleteCount(sheetOf(snap, email, "calling") as CallingData),
    launchDone: launchCompleteCount(sheetOf(snap, email, "launch") as LaunchData),
    checkinCount: snap.checkins.filter((c) => normEmail(c.email) === email).length,
    apprenticesOnRung: apprenticesOnRung(
      snap.network.map((n) => ({ sentOutBy: n.sent_out_by, apprenticeStep: n.apprentice_step ?? 0 })),
      me?.id ?? null
    ),
  };
}

// Every milestone the leader has right now. The log decides which are new.
export function milestonesFor(email: string, snap: Snapshot): Milestone[] {
  const p = progressFor(email, snap);
  const out: Milestone[] = [];
  for (const stop of ["phase1", "phase2", "phase3"] as const) if (stopWalked(stop, p)) out.push({ type: "walked", stop });
  for (const stop of ["phase4", "phase5"] as const) if (stopWalked(stop, p)) out.push({ type: "ongoing", stop });
  const launchDate = recordOf(sheetOf(snap, email, "launch").rhythm).launchDate;
  if (isIsoDate(launchDate)) {
    const days = daysBetweenISO(melbourneParts(snap.now).date, launchDate);
    for (const n of LAUNCH_COUNTDOWN) if (days === n) out.push({ type: "launch", daysBefore: n, launchDate });
  }
  return out;
}

export function milestoneKey(m: Milestone): string {
  switch (m.type) {
    case "walked":
      return `${m.stop}-walked`;
    case "ongoing":
      return `${m.stop}-ongoing`;
    case "launch":
      return `launch-${m.launchDate}-${m.daysBefore}d`;
  }
}

function gaugeAverage(row: HealthCheckinRow): number {
  return Math.round(((row.relational + row.physical + row.mental + row.spiritual) / 4) * 10) / 10;
}

function digestTopic(guides: GuideRow[], monday: string): DigestTopic | null {
  const found = topicForWeek(guides, monday).topic;
  if (!found) return null;
  const topic = found.guide.topic?.trim() || "";
  const series = found.guide.series?.trim() || "";
  const pdf = found.guide.pdf_url?.trim();
  return {
    // Henry to check wording
    title: topic || series || "This week's guide",
    series: topic && series ? series : null,
    passage: found.guide.scripture?.trim() || null,
    // A guide link that is not a web address falls back to the guides page.
    href: isHttpUrl(pdf) ? pdf : absoluteUrl(LINKS.studyGuides),
  };
}

export function composeFor(kind: EmailKind, recipient: Recipient, snap: Snapshot): Outgoing[] {
  const email = recipient.email;
  const token = recipient.token ?? PREVIEW_TOKEN;
  const firstName = firstNameOf(recipient, snap);
  const today = melbourneParts(snap.now).date;
  const thisMonday = mondayOfISO(today);
  const myCheckins = snap.checkins.filter((c) => normEmail(c.email) === email);
  const one = (periodKey: string, message: RenderedEmail, baselineable = false): Outgoing => ({
    kind,
    email,
    periodKey,
    baselineable,
    message,
  });

  switch (kind) {
    case "rpms": {
      const row = myCheckins.find((c) => c.week_start === addDaysISO(thisMonday, -7));
      const lastWeek = row
        ? { relational: row.relational, physical: row.physical, mental: row.mental, spiritual: row.spiritual }
        : null;
      return [one(periodKeyFor("rpms", snap.now), rpmsEmail({ firstName, token, lastWeek }))];
    }
    case "digest": {
      const trend = [28, 21, 14, 7].map((back) => {
        const weekStart = addDaysISO(thisMonday, -back);
        const row = myCheckins.find((c) => c.week_start === weekStart);
        return { weekStart, average: row ? gaugeAverage(row) : null };
      });
      const since = addDaysISO(today, -FOLLOW_UP_DAYS);
      const followUps = snap.people
        .filter((p) => normEmail(p.owner_email) === email && melbourneDateOf(p.created_at) >= since)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, FOLLOW_UP_MAX)
        .map(fullName);
      const progress = progressFor(email, snap);
      const here = avenueStops(progress).find((s) => s.status === "here");
      const action = here
        ? hereActionFor(here.id, progress)
        : // Henry to check wording
          { text: "All five streetlights on.", label: "Open Growth", href: LINKS.growth };
      return [
        one(
          periodKeyFor("digest", snap.now),
          digestEmail({
            firstName,
            token,
            weekOf: thisMonday,
            topic: digestTopic(snap.guides, thisMonday),
            trend,
            followUps,
            next: { ...action, href: absoluteUrl(action.href) },
          })
        ),
      ];
    }
    case "church_health": {
      const leaderEmails = new Set(snap.leaders.map((l) => normEmail(l.email)));
      const mine = snap.people.filter((p) => normEmail(p.owner_email) === email);
      // "This past month": people recorded since the 1st of last month.
      const cutoff = `${addMonthsKey(monthKeyOf(today), -1)}-01`;
      const now = countMetrics(mine);
      const before = countMetrics(mine.filter((p) => melbourneDateOf(p.created_at) < cutoff));
      const counts = {} as Record<Metric, { count: number; change: number }>;
      for (const m of METRICS) counts[m] = { count: now[m], change: now[m] - before[m] };
      const church = countMetrics(snap.people.filter((p) => leaderEmails.has(normEmail(p.owner_email))));
      return [
        one(
          periodKeyFor("church_health", snap.now),
          churchHealthEmail({ firstName, token, monthLabel: monthLabel(monthKeyOf(today)), mine: counts, church })
        ),
      ];
    }
    case "apprentice": {
      const me = nodeOf(snap, email);
      if (!me) return [];
      const apprentices = snap.network
        .filter((n) => n.sent_out_by === me.id)
        .map((n) => ({ name: fullName(n), step: Math.min(5, Math.max(0, Math.trunc(n.apprentice_step ?? 0))) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (apprentices.length === 0) return [];
      return [one(periodKeyFor("apprentice", snap.now), apprenticeEmail({ firstName, token, apprentices }))];
    }
    case "milestones":
      return milestonesFor(email, snap).map((milestone) =>
        one(milestoneKey(milestone), milestoneEmail({ firstName, token, milestone }), milestone.type !== "launch")
      );
  }
}
