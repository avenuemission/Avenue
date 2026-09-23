// The Arena: a six-month rehearsal that reads the leader's own Launch plan
// and presses on its gaps (spec 5.1). Pure and deterministic. The content
// lives in src/app/leaders/training/launch/arenaContent.ts, transcribed
// from docs/launch-arena-content.md. No grade anywhere.
import type { LaunchData } from "@/lib/journey";
import type { Space } from "@/lib/people";

export const COUNTER_KEYS = ["pathways", "intersections", "streetlights"] as const;
export type CounterKey = (typeof COUNTER_KEYS)[number];
export type Counters = Record<CounterKey, number>;
export type Capacity = "strained" | "restored" | "drained";

export interface CounterMove {
  delta: Counters;
  capacity: Capacity | null;
}

const zero = (): Counters => ({ pathways: 0, intersections: 0, streetlights: 0 });

// Capacity notes are not a counter (spec 5.1 names three); they are kept
// as a note so the Arena can say how the leader is holding up.
const CAPACITY_PHRASES: Record<string, Capacity> = {
  "leader capacity strained": "strained",
  "capacity restored": "restored",
  "capacity drained": "drained",
};

// Reads the doc's Counters column verbatim: "Pathways +1, Streetlights +1",
// "No change", "Pathways +1, leader capacity strained", "Capacity restored".
export function parseCounters(text: string): CounterMove {
  const move: CounterMove = { delta: zero(), capacity: null };
  if (text.trim().toLowerCase() === "no change") return move;
  for (const raw of text.split(",")) {
    const part = raw.trim().toLowerCase();
    const capacity = CAPACITY_PHRASES[part];
    if (capacity) {
      if (move.capacity) throw new Error(`Two capacity notes in "${text}"`);
      move.capacity = capacity;
      continue;
    }
    const m = /^(pathways|intersections|streetlights) ([+-]\d+)$/.exec(part);
    if (!m) throw new Error(`Unrecognised counter text "${raw.trim()}" in "${text}"`);
    move.delta[m[1] as CounterKey] += Number(m[2]);
  }
  return move;
}

export const GAP_IDS = ["thinTeam", "noMissionGroup", "homeHosting", "noRhythm", "noApprentice"] as const;
export type GapId = (typeof GAP_IDS)[number];

// bites: shown on a curveball the gap makes harder. thin and action: the
// ending and the Launch Plan's "Where your plan is thin". Draft for Henry:
// this wording is not in docs/launch-arena-content.md and he has not
// reviewed it.
export const GAP_TEXT: Record<GapId, { bites: string; thin: string; action: string }> = {
  thinTeam: {
    bites: "Your launch team has fewer than two people, so this lands with less slack.",
    thin: "Your launch team has fewer than two people.",
    action: "Name at least two people to pray and plan with you, as Nehemiah did before he told anyone.",
  },
  noMissionGroup: {
    bites: "Your plan names no mission group, so there is no obvious answer here.",
    thin: "You have not named who you are on mission for.",
    action: "Write one sentence naming the people you are on mission for.",
  },
  homeHosting: {
    bites: "You are hosting in your home, so the room fills sooner.",
    thin: "You are hosting in your home, and homes fill up fast.",
    action: "Decide now where the group goes when the room is full, and who leads the second table.",
  },
  noRhythm: {
    bites: "Your plan sets no weekly rhythm, so drift is harder to notice.",
    thin: "You have no weekly rhythm set.",
    action: "Pick the night and time you will meet every week.",
  },
  noApprentice: {
    bites: "Your plan names no apprentice, so there is no one to hand this to.",
    thin: "You have not named an apprentice.",
    action: "Name one person and start them on the first rung: I do, you watch.",
  },
};

export interface ArenaPlan {
  teamCount: number;
  missionGroup: string;
  hosting: Space | null;
  weeklyDay: string;
  weeklyTime: string;
  // People the leader has sent out with apprentice_step at least 1. Null
  // when the network did not load: the gap is then not claimed.
  apprenticeCount: number | null;
}

export function arenaPlanFrom(data: LaunchData, apprenticeCount: number | null): ArenaPlan {
  const raw = data.team?.personIds;
  const ids = Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  const who = data.mission?.who;
  const day = data.rhythm?.weeklyDay;
  const time = data.rhythm?.weeklyTime;
  return {
    teamCount: new Set(ids).size,
    missionGroup: typeof who === "string" ? who : "",
    hosting: data.space?.hosting ?? null,
    weeklyDay: typeof day === "string" ? day : "",
    weeklyTime: typeof time === "string" ? time : "",
    apprenticeCount,
  };
}

export function detectGaps(plan: ArenaPlan): GapId[] {
  const gaps: GapId[] = [];
  if (plan.teamCount < 2) gaps.push("thinTeam");
  if (!plan.missionGroup.trim()) gaps.push("noMissionGroup");
  if (plan.hosting === "first") gaps.push("homeHosting");
  if (!plan.weeklyDay || !plan.weeklyTime) gaps.push("noRhythm");
  if (plan.apprenticeCount !== null && plan.apprenticeCount < 1) gaps.push("noApprentice");
  return gaps;
}

export interface ArenaChoice {
  label: string;
  verdict: string;
  counters: string;
  principle: string;
  anchor: string;
}

export interface Curveball {
  id: number;
  title: string;
  when: string;
  situation: string;
  bitesIfNote: string;
  bitesIf: GapId[];
  choices: ArenaChoice[];
}

export interface ArenaPick {
  curveball: number;
  choice: number;
}

export interface EarnedPrinciple {
  month: number;
  curveball: number;
  choiceLabel: string;
  principle: string;
  anchor: string;
}

export interface ArenaState {
  counters: Counters;
  capacity: Capacity | null;
  earned: EarnedPrinciple[];
  month: number; // months played so far
  finished: boolean;
}

// Replays the saved picks from zero. Counters floor at 0 after every month.
// Picks that do not match the order throw: a saved run that no longer fits
// the content must be seen, not quietly re-scored.
export function playArena(curveballs: Curveball[], order: readonly number[], picks: ArenaPick[]): ArenaState {
  if (picks.length > order.length) throw new Error("More picks than months");
  const byId = new Map(curveballs.map((c) => [c.id, c]));
  const counters = zero();
  let capacity: Capacity | null = null;
  const earned: EarnedPrinciple[] = [];

  picks.forEach((pick, i) => {
    if (pick.curveball !== order[i]) {
      throw new Error(`Month ${i + 1} should be curveball ${order[i]}, got ${pick.curveball}`);
    }
    const curveball = byId.get(pick.curveball);
    if (!curveball) throw new Error(`Unknown curveball ${pick.curveball}`);
    const choice = curveball.choices[pick.choice];
    if (!choice) throw new Error(`Curveball ${curveball.id} has no choice ${pick.choice}`);

    const move = parseCounters(choice.counters);
    for (const k of COUNTER_KEYS) counters[k] = Math.max(0, counters[k] + move.delta[k]);
    if (move.capacity) capacity = move.capacity;
    earned.push({ month: i + 1, curveball: curveball.id, choiceLabel: choice.label, principle: choice.principle, anchor: choice.anchor });
  });

  return { counters, capacity, earned, month: picks.length, finished: picks.length === order.length };
}

export function bitesFor(curveball: Curveball, gaps: GapId[]): GapId[] {
  return curveball.bitesIf.filter((g) => gaps.includes(g));
}

export interface ThinSpot {
  gap: GapId;
  monthsHarder: number;
}

// Every gap in the plan, in GAP_IDS order, with how many of the played
// months it made harder.
export function thinSpots(curveballs: Curveball[], order: readonly number[], gaps: GapId[]): ThinSpot[] {
  const byId = new Map(curveballs.map((c) => [c.id, c]));
  return GAP_IDS.filter((g) => gaps.includes(g)).map((gap) => ({
    gap,
    monthsHarder: order.filter((id) => byId.get(id)?.bitesIf.includes(gap)).length,
  }));
}

export function thinSentence(spot: ThinSpot): string {
  const base = GAP_TEXT[spot.gap].thin;
  if (spot.monthsHarder === 0) return base;
  if (spot.monthsHarder === 1) return `${base} It made one of your months harder.`;
  return `${base} It made ${spot.monthsHarder} of your months harder.`;
}
