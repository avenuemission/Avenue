// What the admin API may write. Each mapper picks named columns out of a
// request body (never a spread of whatever was sent) and checks their
// values, so a bad value is a 400 with a clear message rather than a
// database error. Pure: the routes do the reads and writes.

import { isUuid } from "@/lib/domain/ids";
import { parseGuideOn } from "@/lib/domain/studyGuides";

export type Picked<T> = { row: T } | { error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

// A bigint primary key sent as a number or as its digits.
export function positiveIntId(value: unknown): number | null {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

function asObject(body: unknown): Record<string, unknown> | null {
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

const NOT_OBJECT = { error: "Body must be an object" } as const;

// ---------- pathway_groups ----------

export interface PathwayGroupRow {
  name?: string;
  latitude?: number;
  longitude?: number;
  time?: string | null;
  coordinator?: string | null;
  phone?: string | null;
  running?: boolean;
  description?: string | null;
  sort_order?: number;
}

const GROUP_TEXT = ["time", "coordinator", "phone", "description"] as const;

function inRange(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -limit && value <= limit;
}

export function pathwayGroupWrite(body: unknown, mode: "create" | "update"): Picked<PathwayGroupRow> {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  const row: PathwayGroupRow = {};

  if (mode === "create" || "name" in input) {
    if (typeof input.name !== "string" || input.name.trim() === "") return { error: "name is required" };
    row.name = input.name;
  }
  if (mode === "create" || "latitude" in input) {
    if (!inRange(input.latitude, 90)) return { error: "latitude must be a number between -90 and 90" };
    row.latitude = input.latitude;
  }
  if (mode === "create" || "longitude" in input) {
    if (!inRange(input.longitude, 180)) return { error: "longitude must be a number between -180 and 180" };
    row.longitude = input.longitude;
  }
  for (const key of GROUP_TEXT) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value !== null && typeof value !== "string") return { error: `${key} must be text` };
    row[key] = value;
  }
  if (mode === "create" || "running" in input) row.running = !!input.running;
  if ("sort_order" in input) {
    if (!Number.isSafeInteger(input.sort_order)) return { error: "sort_order must be a whole number" };
    row.sort_order = input.sort_order as number;
  } else if (mode === "create") {
    row.sort_order = 0;
  }
  return { row };
}

// ---------- intersection_events / intersection_event_dates ----------

export interface IntersectionEventRow {
  title?: string;
  description?: string | null;
  location?: string | null;
  time?: string | null;
}

const EVENT_TEXT = ["description", "location", "time"] as const;

export function intersectionEventWrite(body: unknown): { key: string; row: IntersectionEventRow } | { error: string } {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  if (typeof input.key !== "string" || input.key === "") return { error: "key required" };
  const row: IntersectionEventRow = {};
  if ("title" in input) {
    if (typeof input.title !== "string" || input.title.trim() === "") return { error: "title is required" };
    row.title = input.title;
  }
  for (const key of EVENT_TEXT) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value !== null && typeof value !== "string") return { error: `${key} must be text` };
    row[key] = value;
  }
  return { key: input.key, row };
}

export interface IntersectionDateRow {
  event_key: string;
  event_date: string;
  event_time: string;
}

export function intersectionDateWrite(body: unknown): Picked<IntersectionDateRow> {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  if (typeof input.event_key !== "string" || input.event_key === "" || !input.event_date) {
    return { error: "event_key and event_date required" };
  }
  // parseGuideOn is the shared strict YYYY-MM-DD reader.
  const date = parseGuideOn(input.event_date);
  if (!date) return { error: "event_date must be a date (YYYY-MM-DD)" };
  const time = input.event_time ?? "19:00";
  if (typeof time !== "string" || !HH_MM.test(time)) return { error: "event_time must be HH:MM" };
  return { row: { event_key: input.event_key, event_date: date, event_time: time } };
}

// ---------- site_stats ----------

export interface SiteStatRow {
  key: string;
  value: number;
  label?: string | null;
}

export function siteStatWrite(body: unknown): Picked<SiteStatRow> {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  if (typeof input.key !== "string" || input.key === "" || typeof input.value !== "number") {
    return { error: "key and value required" };
  }
  if (!Number.isSafeInteger(input.value) || input.value < 0) return { error: "value must be a whole number, 0 or more" };
  const row: SiteStatRow = { key: input.key, value: input.value };
  if ("label" in input) {
    if (input.label !== null && typeof input.label !== "string") return { error: "label must be text" };
    row.label = input.label;
  }
  return { row };
}

// ---------- leaders ----------

export interface LeaderCreateRow {
  id?: string;
  email: string;
  name: string;
  full_access: boolean;
}

export function leaderCreateWrite(body: unknown): Picked<LeaderCreateRow> {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!email || !name) return { error: "email and name required" };
  if (!EMAIL.test(email)) return { error: "email must be an email address" };
  const row: LeaderCreateRow = { email, name, full_access: input.full_access === true };
  if (typeof input.id === "string" && input.id !== "") row.id = input.id;
  return { row };
}

export function leaderAccessWrite(body: unknown): { email: string; full_access: boolean } | { error: string } {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  if (typeof input.email !== "string" || input.email.trim() === "" || typeof input.full_access !== "boolean") {
    return { error: "email and full_access (boolean) required" };
  }
  return { email: input.email.trim().toLowerCase(), full_access: input.full_access };
}

// ---------- form_submissions ----------

export function submissionArchiveWrite(body: unknown): { id: string; archived: boolean } | { error: string } {
  const input = asObject(body);
  if (!input) return NOT_OBJECT;
  if (!isUuid(input.id)) return { error: "id must be a uuid" };
  return { id: input.id, archived: !!input.archived };
}
