import { isSafeHttpsUrl } from "@/lib/domain/urls";
import { formatDayMonth } from "@/lib/domain/dates/format";

// Study guide dates. study_guides.guide_on is a Postgres date, which the API
// sends as an ISO "YYYY-MM-DD" string. This is the one place that reads it.
// Pure: no fetches, no clock.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isoFromParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// A real calendar date as "YYYY-MM-DD", else null. Never guesses.
export function parseGuideOn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = ISO_DATE.exec(raw.trim());
  if (!m) return null;
  return isoFromParts(Number(m[1]), Number(m[2]), Number(m[3]));
}

// The date as leaders have always seen it: D/M/YYYY without leading zeros,
// e.g. "7/10/2026". Empty for a value that is not a date.
export function formatGuideOn(raw: unknown): string {
  const iso = parseGuideOn(raw);
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day}/${month}/${year}`;
}

export interface StudyGuide {
  id: string;
  guide_on: string; // ISO date, YYYY-MM-DD
  series: string;
  topic: string;
  scripture: string;
  spotify_url: string;
  pdf_url: string | null;
  color: string;
  sort_order: number;
}

export interface WeeklyGuide {
  topic: string;
  series: string;
  scripture: string;
}

export interface UpcomingSeries {
  series: string;
  weeks: { date: string; topic: string; scripture: string }[]; // date as "15 Aug"
}

// The public Pathways "This Week's Topic": the latest guide dated on or
// before today (else the soonest one ahead), and every guide after today
// grouped under its series, in date order. A guide whose date cannot be
// read is left out.
export function weeklyTopic(
  guides: StudyGuide[],
  todayISO: string
): { current: WeeklyGuide | null; upcoming: UpcomingSeries[] } {
  const dated = guides
    .map((g) => ({ g, on: parseGuideOn(g.guide_on) }))
    .filter((x): x is { g: StudyGuide; on: string } => x.on !== null)
    .sort((a, b) => a.on.localeCompare(b.on));
  const past = dated.filter((x) => x.on <= todayISO);
  const pick = past.length > 0 ? past[past.length - 1] : dated[0];
  const current = pick ? { topic: pick.g.topic ?? "", series: pick.g.series ?? "", scripture: pick.g.scripture ?? "" } : null;

  const upcoming: UpcomingSeries[] = [];
  for (const { g, on } of dated.filter((x) => x.on > todayISO)) {
    const series = g.series ?? "Upcoming";
    let group = upcoming.find((x) => x.series === series);
    if (!group) {
      group = { series, weeks: [] };
      upcoming.push(group);
    }
    group.weeks.push({ date: formatDayMonth(on), topic: g.topic ?? "", scripture: g.scripture ?? "" });
  }
  return { current, upcoming };
}

// The columns the site reads, and the ones the admin editor may write.
export const STUDY_GUIDE_COLUMNS = "id, guide_on, series, topic, scripture, spotify_url, pdf_url, color, sort_order";
const WRITABLE = ["guide_on", "series", "topic", "scripture", "spotify_url", "pdf_url", "color", "sort_order"] as const;
const BAD_DATE = "guide_on must be a date (YYYY-MM-DD)";
const BAD_COLOR = "color must be a hex colour like #3b82f6";
// Matches the database check study_guides_color_hex (migration 015).
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LINKS = ["spotify_url", "pdf_url"] as const;

// Picks the writable columns from an admin request body. Anything else (id,
// created_at, the legacy guide_date) is dropped. A create needs a real date;
// an update may leave the date out but may not blank it. Links must be
// https (or empty); an empty PDF link is stored as null. The colour must be
// #rrggbb; an empty colour is stored as null.
export function studyGuideWrite(
  body: unknown,
  mode: "create" | "update"
): { row: Record<string, unknown> } | { error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { error: "Body must be an object" };
  const input = body as Record<string, unknown>;
  const row: Record<string, unknown> = {};
  for (const key of WRITABLE) if (key in input) row[key] = input[key];
  if (mode === "create" || "guide_on" in row) {
    const iso = parseGuideOn(row.guide_on);
    if (!iso) return { error: BAD_DATE };
    row.guide_on = iso;
  }
  for (const key of LINKS) {
    if (!(key in row)) continue;
    const value = row[key];
    if (value === null || value === "") continue;
    if (typeof value !== "string" || !isSafeHttpsUrl(value)) return { error: `${key} must be an https:// link` };
  }
  if (row.pdf_url === "") row.pdf_url = null;
  if ("color" in row) {
    if (row.color === "" || row.color === null) row.color = null;
    else if (typeof row.color !== "string" || !HEX_COLOR.test(row.color)) return { error: BAD_COLOR };
  }
  if (mode === "create") row.sort_order = row.sort_order ?? 0;
  return { row };
}
