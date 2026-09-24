// Calling and Launch worksheet shapes and the rules that decide when a
// section or step is complete. Pure. Data arrives from the server as JSON,
// so every rule checks types rather than trusting them.
import type { ApestResults, RoleKey } from "@/lib/apest";
import { SPACES, type Space } from "@/lib/people";

export type Layer = "shared" | "specific" | "seasonal";
export type Willing = "yes" | "notYet" | "unsure";

export const CALLING_STATEMENT_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"] as const;
export const CALLING_SECTION_IDS = ["layers", "callable", "shared", "apest", "seasonal", "conversation"] as const;
export type CallingSectionId = (typeof CALLING_SECTION_IDS)[number];

export interface CallingData {
  layers?: { placements?: Record<string, Layer> };
  callable?: { crowding?: string; shadow?: string; fear?: string; ifCalled?: string; willing?: Willing };
  shared?: { scenario?: "event" | "dinner"; yes?: boolean; date?: string };
  apest?: { answers?: number[]; results?: ApestResults; top?: RoleKey[]; reflection?: string };
  seasonal?: {
    peopleGroup?: string;
    hostingSpace?: Space;
    rice?: { decision?: string; reason?: string; intuition?: string; counsel?: string; experience?: string };
  };
  conversation?: { booked?: boolean; date?: string };
}

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const LAUNCH_STEP_IDS = ["prayer", "mission", "space", "team", "intentional", "rhythm", "invite"] as const;
export type LaunchStepId = (typeof LAUNCH_STEP_IDS)[number];

export interface LaunchData {
  prayer?: { when?: string; who?: string; teamPrayer?: string };
  mission?: { who?: string; needs?: string; gather?: string };
  space?: { hosting?: Space; place?: string };
  team?: { personIds?: string[] };
  intentional?: { commitments?: string[]; needPosition?: string };
  rhythm?: { launchDate?: string; weeklyDay?: Weekday; weeklyTime?: string };
  invite?: { tracking?: string; shepherding?: string };
  arena?: { picks?: { curveball: number; choice: number }[]; done?: boolean };
  actions?: { done?: string[] };
}

export const CALLING_TOTAL = CALLING_SECTION_IDS.length;
export const LAUNCH_TOTAL = LAUNCH_STEP_IDS.length;

const LAYERS: readonly string[] = ["shared", "specific", "seasonal"];
const WILLING: readonly string[] = ["yes", "notYet", "unsure"];
const RESULT_KEYS = ["apostle", "prophet", "evangelist", "shepherd", "teacher"] as const;

export function filled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isSpace(value: unknown): value is Space {
  return typeof value === "string" && (SPACES as readonly string[]).includes(value);
}

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && (WEEKDAYS as readonly string[]).includes(value);
}

// The strings in a stored list, or an empty list when the stored value is
// not an array. Used where a page renders a list read back from the server.
export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

// A stored text field, or "" when it is missing or not a string.
export function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// A stored sub-object, or {} when it is missing, an array or a primitive.
export function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isResults(value: unknown): value is ApestResults {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return RESULT_KEYS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]));
}

export function callingSectionComplete(id: CallingSectionId, data: CallingData): boolean {
  switch (id) {
    case "layers": {
      const placements = (data.layers?.placements ?? {}) as Record<string, unknown>;
      return CALLING_STATEMENT_IDS.every((s) => typeof placements[s] === "string" && LAYERS.includes(placements[s] as string));
    }
    case "callable": {
      const willing = data.callable?.willing;
      return typeof willing === "string" && WILLING.includes(willing);
    }
    case "shared":
      return data.shared?.yes === true;
    case "apest":
      return isResults(data.apest?.results);
    case "seasonal":
      return filled(data.seasonal?.peopleGroup) && isSpace(data.seasonal?.hostingSpace);
    case "conversation":
      return data.conversation?.booked === true;
  }
}

export function callingCompleteCount(data: CallingData): number {
  return CALLING_SECTION_IDS.filter((id) => callingSectionComplete(id, data)).length;
}

// How many of the nine statements sit in the layer the script puts them in.
export function layersScore(placements: Record<string, unknown> | undefined, key: Record<string, Layer>): number {
  if (!placements) return 0;
  return Object.keys(key).filter((id) => placements[id] === key[id]).length;
}

export function launchStepComplete(id: LaunchStepId, data: LaunchData): boolean {
  switch (id) {
    case "prayer":
      return filled(data.prayer?.when);
    case "mission":
      return filled(data.mission?.who);
    case "space":
      return isSpace(data.space?.hosting) && filled(data.space?.place);
    case "team": {
      const raw = data.team?.personIds;
      const ids = Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
      return new Set(ids).size >= 2;
    }
    case "intentional": {
      const c = data.intentional?.commitments;
      return (Array.isArray(c) ? c.filter(filled).length : 0) >= 2;
    }
    case "rhythm": {
      const r = data.rhythm;
      return isIsoDate(r?.launchDate) && (WEEKDAYS as readonly string[]).includes(r?.weeklyDay ?? "") && isTime(r?.weeklyTime);
    }
    case "invite":
      return filled(data.invite?.tracking) && filled(data.invite?.shepherding);
  }
}

export function launchCompleteCount(data: LaunchData): number {
  return LAUNCH_STEP_IDS.filter((id) => launchStepComplete(id, data)).length;
}
