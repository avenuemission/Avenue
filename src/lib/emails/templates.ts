// The five leader emails (spec 3.2). Pure: each takes plain data and
// returns { subject, html, text, headers } through renderEmail. compose.ts
// decides who gets which email with which data.
// Henry to check wording (every string in this file)
import { STOP_NAMES } from "@/lib/avenue";
import { APPRENTICE_HOW_TO, apprenticeStepLabel } from "@/lib/apprentice";
import { METRICS, type Metric } from "@/lib/people";
import { GAUGES, type GaugeScores } from "@/lib/rpms";
import { METRIC_LABELS, type MetricCounts } from "@/lib/churchHealth";
import { dayMonthLabel } from "@/lib/melbourneDate";
import { absoluteUrl, renderEmail, type Block, type RenderedEmail } from "./layout";

export const LINKS = {
  dashboard: "/leaders",
  growth: "/leaders/training?phase=phase4",
  multiply: "/leaders/training?phase=phase5",
  launchPlan: "/leaders/training/launch/plan",
  studyGuides: "/leaders/study-guides",
} as const;

interface Base {
  firstName: string;
  token: string;
}

export function rpmsEmail(input: Base & { lastWeek: GaugeScores | null }): RenderedEmail {
  const blocks: Block[] = [
    {
      type: "p",
      text: "Before the week turns over, take five minutes to check in on your four gauges: Relational, Physical, Mental and Spiritual.",
    },
  ];
  const last = input.lastWeek;
  if (last) {
    blocks.push(
      { type: "h", text: "Last week" },
      { type: "stats", rows: GAUGES.map((g) => ({ label: g.label, value: `${last[g.key]}/10` })) }
    );
  } else {
    blocks.push({ type: "p", text: "There was no check-in last week. This is a good week to start again." });
  }
  blocks.push({ type: "p", text: "A few honest numbers each week show you the trend before it becomes a problem." });
  return renderEmail({
    kind: "rpms",
    token: input.token,
    subject: "Your Sunday check-in",
    preheader: "Five minutes with your four gauges before the week turns over.",
    eyebrow: "Sunday reflection",
    heading: `How are you, really, ${input.firstName}?`,
    blocks,
    cta: { label: "Check in now", href: absoluteUrl(LINKS.growth) },
  });
}

export interface DigestTopic {
  title: string;
  series: string | null;
  passage: string | null;
  href: string;
}

export interface DigestInput extends Base {
  weekOf: string;
  topic: DigestTopic | null;
  trend: { weekStart: string; average: number | null }[];
  followUps: string[];
  next: { text: string; label: string; href: string };
}

export function digestEmail(input: DigestInput): RenderedEmail {
  const blocks: Block[] = [{ type: "h", text: "This week in Pathways" }];
  const t = input.topic;
  if (t) {
    blocks.push({ type: "p", text: t.series ? `${t.title} (${t.series})` : t.title });
    if (t.passage) blocks.push({ type: "p", text: `Read: ${t.passage}` });
    blocks.push({ type: "link", label: "Open the guide", href: t.href });
  } else {
    blocks.push({ type: "p", text: "No Pathways guide is set for this week yet." });
  }

  blocks.push({ type: "h", text: "Your last four weeks" });
  if (input.trend.every((w) => w.average === null)) {
    blocks.push({ type: "p", text: "No check-ins in the last four weeks." });
  } else {
    blocks.push({
      type: "stats",
      rows: input.trend.map((w) => ({
        label: `Week of ${dayMonthLabel(w.weekStart)}`,
        value: w.average === null ? "No check-in" : `${w.average} out of 10`,
      })),
    });
  }

  blocks.push({ type: "h", text: "People to follow up" });
  if (input.followUps.length > 0) {
    blocks.push(
      { type: "p", text: "You added these people in the last 30 days. A message from you this week could mean a lot." },
      { type: "list", items: input.followUps }
    );
  } else {
    blocks.push({ type: "p", text: "No new people in the last 30 days." });
  }

  blocks.push({ type: "h", text: "Your next step" }, { type: "p", text: input.next.text });

  return renderEmail({
    kind: "digest",
    token: input.token,
    subject: t ? `Your week: ${t.title}` : "Your week ahead",
    preheader: t ? `This week in Pathways: ${t.title}.` : "Your week at a glance.",
    eyebrow: `Week of ${dayMonthLabel(input.weekOf)}`,
    heading: `Good morning, ${input.firstName}.`,
    blocks,
    cta: { label: input.next.label, href: input.next.href },
  });
}

export interface ChurchHealthEmailInput extends Base {
  monthLabel: string;
  mine: Record<Metric, { count: number; change: number }>;
  church: MetricCounts;
}

function changeText(change: number): string {
  if (change === 0) return "no change this past month";
  return `${change > 0 ? "+" : ""}${change} this past month`;
}

export function churchHealthEmail(input: ChurchHealthEmailInput): RenderedEmail {
  const blocks: Block[] = [
    {
      type: "p",
      text: "Take ten minutes to bring your Pathways, Intersections and Streetlights lists up to date. Add the new names, and thank God for each one.",
    },
    { type: "h", text: "Your lists" },
    {
      type: "stats",
      rows: METRICS.map((m) => ({
        label: METRIC_LABELS[m],
        value: `${input.mine[m].count} (${changeText(input.mine[m].change)})`,
      })),
    },
    { type: "h", text: "Across Avenue" },
    { type: "stats", rows: METRICS.map((m) => ({ label: METRIC_LABELS[m], value: String(input.church[m]) })) },
    { type: "p", text: "Every name is a person someone is praying for. Thank you for being part of it." },
  ];
  return renderEmail({
    kind: "church_health",
    token: input.token,
    subject: `Church health for ${input.monthLabel}`,
    preheader: "A moment to update your three lists, and to see what God is doing across Avenue.",
    eyebrow: "Monthly church health",
    heading: `${input.monthLabel}: your three lists`,
    blocks,
    cta: { label: "Update your lists", href: absoluteUrl(LINKS.growth) },
  });
}

export interface ApprenticeInput extends Base {
  apprentices: { name: string; step: number }[];
}

export function apprenticeEmail(input: ApprenticeInput): RenderedEmail {
  const blocks: Block[] = [
    {
      type: "p",
      text: "Here is where each person you have sent out is on Hero Maker's five steps, and one way to help them take the next one.",
    },
  ];
  for (const a of input.apprentices) {
    blocks.push({ type: "h", text: a.name }, { type: "p", text: `Now: ${apprenticeStepLabel(a.step)}.` });
    blocks.push(
      a.step < 5
        ? { type: "p", text: `Next: ${apprenticeStepLabel(a.step + 1)}. ${APPRENTICE_HOW_TO[a.step + 1]}` }
        : { type: "p", text: `They are on the last step. ${APPRENTICE_HOW_TO[5]}` }
    );
  }
  return renderEmail({
    kind: "apprentice",
    token: input.token,
    subject: "Your apprentices this month",
    preheader: "Where each person you are apprenticing is, and the next step.",
    eyebrow: "Multiply",
    heading: `Who are you raising up, ${input.firstName}?`,
    blocks,
    cta: { label: "Open Multiply", href: absoluteUrl(LINKS.multiply) },
  });
}

export type Milestone =
  | { type: "walked"; stop: "phase1" | "phase2" | "phase3" }
  | { type: "ongoing"; stop: "phase4" | "phase5" }
  | { type: "launch"; daysBefore: 30 | 7 | 1; launchDate: string };

const WALKED_NEXT: Record<"phase1" | "phase2" | "phase3", string> = {
  phase1: "Calling is next: discovering the people and the place God is sending you to.",
  phase2: "Launch is next: turning your calling into a plan and a first gathering.",
  phase3: "Growth is next: a weekly check-in to keep you healthy as you lead.",
};

const ONGOING_TEXT: Record<"phase4" | "phase5", string> = {
  phase4:
    "You have done your first weekly check-in. Growth is a rhythm, not a finish line, so this streetlight stays on while you keep coming back.",
  phase5: "You have started apprenticing someone. Multiply is a rhythm too: every leader you raise up can raise up another.",
};

const LAUNCH_COPY: Record<30 | 7 | 1, { subject: string; heading: string; text: string }> = {
  30: {
    subject: "30 days until you launch",
    heading: "A month to go",
    text: "A month out is the time to confirm your space and start inviting.",
  },
  7: {
    subject: "One week until you launch",
    heading: "One week to go",
    text: "This week: confirm your team, pray together, and send a personal invite to everyone on your list.",
  },
  1: {
    subject: "You launch tomorrow",
    heading: "Tomorrow is the day",
    text: "Pray, prepare the space, and expect God to be at work.",
  },
};

export function milestoneEmail(input: Base & { milestone: Milestone }): RenderedEmail {
  const m = input.milestone;
  if (m.type === "walked") {
    const name = STOP_NAMES[m.stop];
    return renderEmail({
      kind: "milestones",
      token: input.token,
      subject: `You walked ${name}`,
      preheader: "Another streetlight on your avenue is lit.",
      eyebrow: "Milestone",
      heading: `A streetlight is on, ${input.firstName}.`,
      blocks: [
        { type: "p", text: `You have walked ${name}. That streetlight on your avenue is now lit.` },
        { type: "p", text: WALKED_NEXT[m.stop] },
      ],
      cta: { label: "Open your avenue", href: absoluteUrl(LINKS.dashboard) },
    });
  }
  if (m.type === "ongoing") {
    const name = STOP_NAMES[m.stop];
    return renderEmail({
      kind: "milestones",
      token: input.token,
      subject: `${name} is lit`,
      preheader: `${name} is a rhythm you have now started.`,
      eyebrow: "Milestone",
      heading: `${name} is lit, ${input.firstName}.`,
      blocks: [{ type: "p", text: ONGOING_TEXT[m.stop] }],
      cta:
        m.stop === "phase4"
          ? { label: "Open Growth", href: absoluteUrl(LINKS.growth) }
          : { label: "Open Multiply", href: absoluteUrl(LINKS.multiply) },
    });
  }
  const copy = LAUNCH_COPY[m.daysBefore];
  return renderEmail({
    kind: "milestones",
    token: input.token,
    subject: copy.subject,
    preheader: copy.text,
    eyebrow: "Launch countdown",
    heading: `${copy.heading}, ${input.firstName}.`,
    blocks: [
      { type: "p", text: `Your launch date is ${dayMonthLabel(m.launchDate)} ${m.launchDate.slice(0, 4)}.` },
      { type: "p", text: copy.text },
    ],
    cta: { label: "Open your Launch Plan", href: absoluteUrl(LINKS.launchPlan) },
  });
}
