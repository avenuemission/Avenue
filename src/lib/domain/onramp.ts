// Avenue On-Ramp sign-ups: what a sign-up must look like, the per-workshop
// counts and the CSV the admin page downloads. Pure; the route, the form
// and the admin page share it.
import { isOneEmail, NAME_MAX } from "./forms";
import {
  ONRAMP_MAX_WORKSHOPS,
  ONRAMP_MIN_WORKSHOPS,
  ONRAMP_WORKSHOPS,
  type OnrampWorkshopId,
} from "@/content/onramp";

interface OnrampSignup {
  name: string;
  email: string;
  workshops: OnrampWorkshopId[];
}

// One row as the admin API returns it.
export interface OnrampRow extends OnrampSignup {
  id: string;
  created_at: string;
  updated_at: string;
}

type Parsed = { ok: true; value: OnrampSignup } | { ok: false; spam: true } | { ok: false; error: string };

// The words the form shows and the route answers with, so both agree.
export const ONRAMP_ERRORS = {
  name: "Please enter your name.",
  nameLong: `Please keep your name under ${NAME_MAX} characters.`,
  email: "Please enter a valid email address.",
  workshopsNone: "Please pick at least 1 workshop.",
  workshopsTooMany: "Please pick no more than 2 workshops.",
  invalid: "Something went wrong with the form. Please try again.",
} as const;

const WORKSHOP_IDS: readonly string[] = ONRAMP_WORKSHOPS.map((w) => w.id);

function isWorkshopId(value: unknown): value is OnrampWorkshopId {
  return typeof value === "string" && WORKSHOP_IDS.includes(value);
}

// The first problem with a workshop choice, or null when it is 1 or 2
// known workshops. Duplicates count once.
export function workshopsError(picked: readonly string[]): string | null {
  const unique = new Set(picked);
  if (unique.size < ONRAMP_MIN_WORKSHOPS) return ONRAMP_ERRORS.workshopsNone;
  if (unique.size > ONRAMP_MAX_WORKSHOPS) return ONRAMP_ERRORS.workshopsTooMany;
  return null;
}

export function parseOnrampSignup(body: unknown): Parsed {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: ONRAMP_ERRORS.invalid };
  const b = body as Record<string, unknown>;

  // Honeypot: a filled company field is a bot. The route answers as if it worked.
  if (b.company !== undefined && b.company !== "") return { ok: false, spam: true };

  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: ONRAMP_ERRORS.name };
  if (name.length > NAME_MAX) return { ok: false, error: ONRAMP_ERRORS.nameLong };

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!isOneEmail(email)) return { ok: false, error: ONRAMP_ERRORS.email };

  const picked: unknown = b.workshops;
  if (!Array.isArray(picked) || !picked.every(isWorkshopId)) return { ok: false, error: ONRAMP_ERRORS.invalid };
  const problem = workshopsError(picked);
  if (problem) return { ok: false, error: problem };
  // Stored in the page's order, whatever order they were ticked in.
  const workshops = ONRAMP_WORKSHOPS.map((w) => w.id).filter((id) => picked.includes(id));

  return { ok: true, value: { name, email, workshops } };
}

// How many sign-ups picked each workshop, in the page's order.
export function workshopCounts(rows: readonly { workshops: readonly string[] }[]): { id: OnrampWorkshopId; label: string; count: number }[] {
  return ONRAMP_WORKSHOPS.map((w) => ({
    id: w.id,
    label: w.label,
    count: rows.filter((r) => r.workshops.includes(w.id)).length,
  }));
}

export function workshopLabel(id: string): string {
  const w = ONRAMP_WORKSHOPS.find((x) => x.id === id);
  return w ? `${w.label} (${w.host})` : id;
}

// A spreadsheet cell: quoted, and a leading = + - @ is defused so a name
// like "=HYPERLINK(...)" opens as text, not a formula.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// The sign-ups as CSV, one row each, oldest first.
export function signupsCsv(rows: readonly OnrampRow[]): string {
  const header = ["Name", "Email", "Workshop 1", "Workshop 2", "Signed up", "Last updated"];
  const lines = [...rows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) =>
      [r.name, r.email, workshopLabel(r.workshops[0] ?? ""), r.workshops[1] ? workshopLabel(r.workshops[1]) : "", r.created_at, r.updated_at]
        .map(csvCell)
        .join(",")
    );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
