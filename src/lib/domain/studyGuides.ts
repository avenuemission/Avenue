import { isSafeHttpsUrl } from "@/lib/domain/urls";

// Study guide dates. study_guides.guide_on is a Postgres date, which the API
// sends as an ISO "YYYY-MM-DD" string. This is the one place that reads it.
// Pure: no fetches, no clock.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MONTH_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

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

// Local midnight on the guide's day, for comparing with the viewer's clock.
export function guideOnToLocalDate(raw: unknown): Date | null {
  const iso = parseGuideOn(raw);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// The legacy DD/MM/YYYY text (the old guide_date column and
// public/data/study_guides.csv) as an ISO date, else null.
export function dayMonthYearToGuideOn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = DAY_MONTH_YEAR.exec(raw.trim());
  if (!m) return null;
  return isoFromParts(Number(m[3]), Number(m[2]), Number(m[1]));
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
