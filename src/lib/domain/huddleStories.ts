// "Stories, not seats": the Metrics of Success as numbers only. Each
// Pathway Huddle adds one entry of people NEW this year per category; the
// dashboard shows the year's totals. Pure; the routes and pages share it.

export const STORY_CATEGORIES = [
  {
    key: "pathways",
    name: "Pathways",
    verb: "Belong",
    line: "found a Pathway that feels like family and are inviting others",
  },
  {
    key: "intersections",
    name: "Intersections",
    verb: "Commit",
    line: "were baptised or made a decision of faith, and are being apprenticed",
  },
  {
    key: "streetlights",
    name: "Streetlights",
    verb: "Step out",
    line: "stepped out to plant, lead or serve in something new",
  },
] as const;

export type StoryKey = (typeof STORY_CATEGORIES)[number]["key"];

export interface HuddleEntry {
  label: string;
  heldOn: string; // YYYY-MM-DD
  pathways: number;
  intersections: number;
  streetlights: number;
}

export interface HuddleRow {
  id: string;
  label: string;
  held_on: string;
  pathways: number;
  intersections: number;
  streetlights: number;
}

export interface YearStories {
  year: number;
  totals: Record<StoryKey, number>;
  latest: { label: string; heldOn: string; added: number } | null;
}

const MAX = 999;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX ? v : null;
}

export function parseHuddleEntry(body: unknown): { ok: true; value: HuddleEntry } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: "Invalid entry" };
  const b = body as Record<string, unknown>;
  const label = typeof b.label === "string" ? b.label.trim() : "";
  if (!label || label.length > 60) return { ok: false, error: "Give the huddle a name of 1 to 60 characters" };
  const heldOn = typeof b.heldOn === "string" ? b.heldOn : "";
  if (!DATE.test(heldOn) || Number.isNaN(Date.parse(`${heldOn}T00:00:00Z`))) return { ok: false, error: "Give a valid date" };
  const pathways = count(b.pathways);
  const intersections = count(b.intersections);
  const streetlights = count(b.streetlights);
  if (pathways === null || intersections === null || streetlights === null) {
    return { ok: false, error: `Each number must be a whole number from 0 to ${MAX}` };
  }
  return { ok: true, value: { label, heldOn, pathways, intersections, streetlights } };
}

// The totals for one calendar year, and the most recent huddle in it.
export function yearStories(rows: readonly HuddleRow[], year: number): YearStories {
  const inYear = rows.filter((r) => r.held_on.startsWith(`${year}-`));
  const totals = { pathways: 0, intersections: 0, streetlights: 0 };
  for (const r of inYear) {
    totals.pathways += r.pathways;
    totals.intersections += r.intersections;
    totals.streetlights += r.streetlights;
  }
  const last = [...inYear].sort((a, b) => b.held_on.localeCompare(a.held_on))[0];
  return {
    year,
    totals,
    latest: last
      ? { label: last.label, heldOn: last.held_on, added: last.pathways + last.intersections + last.streetlights }
      : null,
  };
}
