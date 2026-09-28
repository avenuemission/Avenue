// The journey as an avenue at night (spec 2026-09-24 avenue-night, 2.1 and
// 4.1). Pure. Which stops are walked, where the leader stands, the one line
// of status, the next action at the stop they are at, and the greeting.
import { CALLING_TOTAL, LAUNCH_TOTAL, type CallingSectionId, type LaunchWizardStepId } from "@/lib/domain/journey";

export const STOP_IDS = ["phase1", "phase2", "phase3", "phase4", "phase5"] as const;
export type StopId = (typeof STOP_IDS)[number];
export type StopStatus = "walked" | "ongoing" | "here" | "ahead";

export const STOP_NAMES: Record<StopId, string> = {
  phase1: "Foundations",
  phase2: "Calling",
  phase3: "Launch",
  phase4: "Growth",
  phase5: "Multiply",
};

export const STATUS_LABEL: Record<StopStatus, string> = {
  walked: "Walked",
  ongoing: "Ongoing",
  here: "You are here",
  ahead: "Ahead",
};

// Growth and Multiply are rhythms: once started they are never finished,
// so they read "Ongoing" rather than "Walked" (round 3 spec 3).
const RHYTHM_STOPS: ReadonlySet<StopId> = new Set<StopId>(["phase4", "phase5"]);

export interface AvenueStop {
  id: StopId;
  number: number;
  name: string;
  status: StopStatus;
}

export interface AvenueProgress {
  foundationsDone: number;
  foundationsTotal: number;
  callingDone: number;
  launchDone: number;
  checkinCount: number; // every saved weekly check-in, any week
  apprenticesOnRung: number; // people this leader sent out on rung 1 or above
}

// Spec 2.1. Growth and Multiply are rhythms, so they are walked once the
// rhythm has started: one check-in, or one apprentice on the first rung.
export function stopWalked(id: StopId, p: AvenueProgress): boolean {
  switch (id) {
    case "phase1":
      return p.foundationsTotal > 0 && p.foundationsDone >= p.foundationsTotal;
    case "phase2":
      return p.callingDone >= CALLING_TOTAL;
    case "phase3":
      return p.launchDone >= LAUNCH_TOTAL;
    case "phase4":
      return p.checkinCount >= 1;
    case "phase5":
      return p.apprenticesOnRung >= 1;
  }
}

// A walked Growth or Multiply stop is "ongoing"; other walked stops are
// "walked". The first stop that is neither is "here"; every other one is
// "ahead". Nothing is locked: this only decides how each lamp is drawn.
export function avenueStops(p: AvenueProgress): AvenueStop[] {
  let hereTaken = false;
  return STOP_IDS.map((id, i) => {
    let status: StopStatus = RHYTHM_STOPS.has(id) ? "ongoing" : "walked";
    if (!stopWalked(id, p)) {
      status = hereTaken ? "ahead" : "here";
      hereTaken = true;
    }
    return { id, number: i + 1, name: STOP_NAMES[id], status };
  });
}

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five"];

// "Two streetlights on. Launch is next."
export function streetStatusLine(stops: AvenueStop[]): string {
  const here = stops.find((s) => s.status === "here");
  if (!here) return "All five streetlights on.";
  const lit = stops.filter((s) => s.status === "walked" || s.status === "ongoing").length;
  const lights =
    lit === 0 ? "No streetlights on yet." : `${COUNT_WORDS[lit]} ${lit === 1 ? "streetlight" : "streetlights"} on.`;
  return `${lights} ${here.name} is next.`;
}

export interface HereAction {
  text: string;
  label: string;
  href: string;
}

// The one next action shown where the leader stands (phone street).
export function hereActionFor(id: StopId, p: AvenueProgress): HereAction {
  switch (id) {
    case "phase1":
      return {
        text: `${p.foundationsDone} of ${p.foundationsTotal} Foundations modules ticked.`,
        label: p.foundationsDone === 0 ? "Start Foundations" : "Continue Foundations",
        href: "/leaders/training?phase=phase1",
      };
    case "phase2":
      return {
        text: `${p.callingDone} of ${CALLING_TOTAL} Calling sections done.`,
        label: p.callingDone === 0 ? "Start Calling" : "Continue Calling",
        href: "/leaders/training/calling",
      };
    case "phase3":
      return {
        text: `${p.launchDone} of ${LAUNCH_TOTAL} Launch steps done.`,
        label: p.launchDone === 0 ? "Start Launch" : "Continue Launch",
        href: "/leaders/training/launch",
      };
    case "phase4":
      return {
        text: "Your first weekly check-in lights this streetlight.",
        label: "Check in now",
        href: "/leaders/training?phase=phase4",
      };
    case "phase5":
      return {
        text: "Move someone you're apprenticing onto the first rung to light this one.",
        label: "Open Multiply",
        href: "/leaders/training?phase=phase5",
      };
  }
}

// The hour (0 to 23) in Melbourne, daylight saving included.
export function melbourneHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour");
  if (!hour) throw new Error("Could not read the Melbourne hour");
  return Number(hour.value);
}

export function partOfDay(hour: number): "morning" | "afternoon" | "evening" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// "Good evening, Sam." by Melbourne time, first name only.
export function greetingFor(now: Date, name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const part = partOfDay(melbourneHour(now));
  return first ? `Good ${part}, ${first}.` : `Good ${part}.`;
}

export interface RungPerson {
  sentOutBy: string | null;
  apprenticeStep?: number;
}

// People this leader sent out who are on the first apprenticeship rung or
// above (spec 2.1, Multiply). One definition for the hub and the dashboard.
// No viewer yet means nobody can be counted as theirs.
export function apprenticesOnRung(people: RungPerson[], viewerId: string | null): number {
  if (viewerId === null) return 0;
  return people.filter((p) => p.sentOutBy === viewerId && (p.apprenticeStep ?? 0) >= 1).length;
}

// Short labels for the lamp steps (a lamp is 72 px wide).
export const CALLING_LAMP_LABELS: Record<CallingSectionId, string> = {
  layers: "What is a calling",
  callable: "Callable",
  shared: "Shared call",
  apest: "Specific call",
  seasonal: "Seasonal call",
  conversation: "Conversation",
};

export const LAUNCH_LAMP_LABELS: Record<LaunchWizardStepId, string> = {
  prayer: "Pray first",
  mission: "Mission group",
  space: "Space",
  team: "Launch team",
  intentional: "Live it",
  rhythm: "Launch date",
  invite: "Invite",
  metrics: "Metrics",
  arena: "Scenarios",
  plan: "Your plan",
};
