// Shared shape and validation for My People (leader_people). Pure, so the
// API route and its tests share one definition. Owner and id are never
// accepted from input: the route sets owner_email from the session.

import { isUuid } from "@/lib/domain/ids";

export const SPACES = ["first", "second", "third"] as const;
export const METRICS = ["pathways", "intersections", "streetlights"] as const;
export type Space = (typeof SPACES)[number];
export type Metric = (typeof METRICS)[number];

export const MAX_PEOPLE = 500;
const MAX_NAME = 80;
const MAX_ICNU = 2000;

export interface Person {
  id: string;
  firstName: string;
  lastName: string | null;
  spaces: Space[];
  metrics: Metric[];
  invitee: boolean;
  icnu: string | null;
  networkPersonId: string | null;
}

export interface PersonRow {
  id: string;
  first_name: string;
  last_name: string | null;
  spaces: string[];
  metrics: string[];
  invitee: boolean;
  icnu: string | null;
  network_person_id: string | null;
}

export const PERSON_COLUMNS = "id, first_name, last_name, spaces, metrics, invitee, icnu, network_person_id";

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    spaces: (row.spaces ?? []) as Space[],
    metrics: (row.metrics ?? []) as Metric[],
    invitee: row.invitee,
    icnu: row.icnu,
    networkPersonId: row.network_person_id,
  };
}

// Where an ICNU editor starts: the last text the leader typed for this
// network person this page lifetime, if any, else the linked person's
// saved note. A collapse and reopen before a save returns must not start
// from the stale linked row (the next edit would overwrite newer text).
export function icnuStartText(draft: string | undefined, linked: Pick<Person, "icnu"> | undefined): string {
  return draft ?? linked?.icnu ?? "";
}

function tagList(value: unknown, field: string, allowed: readonly string[]): { list: string[] } | { error: string } {
  if (!Array.isArray(value)) return { error: `${field} must be an array` };
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !allowed.includes(v)) return { error: `${field} contains an invalid value: ${JSON.stringify(v)}` };
    if (!out.includes(v)) out.push(v);
  }
  return { list: out };
}

export function validatePersonInput(body: unknown, mode: "create" | "update"): { values: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("firstName" in b) {
    const first = typeof b.firstName === "string" ? b.firstName.trim() : "";
    if (!first) return { error: "First name is required" };
    if (first.length > MAX_NAME) return { error: `First name must be ${MAX_NAME} characters or fewer` };
    values.first_name = first;
  } else if (mode === "create") {
    return { error: "First name is required" };
  }

  if ("lastName" in b) {
    if (b.lastName !== null && typeof b.lastName !== "string") return { error: "lastName must be text or null" };
    const last = typeof b.lastName === "string" ? b.lastName.trim() : "";
    if (last.length > MAX_NAME) return { error: `Last name must be ${MAX_NAME} characters or fewer` };
    values.last_name = last || null;
  }

  if ("spaces" in b) {
    const r = tagList(b.spaces, "spaces", SPACES);
    if ("error" in r) return r;
    values.spaces = r.list;
  }

  if ("metrics" in b) {
    const r = tagList(b.metrics, "metrics", METRICS);
    if ("error" in r) return r;
    values.metrics = r.list;
  }

  if ("invitee" in b) {
    if (typeof b.invitee !== "boolean") return { error: "invitee must be true or false" };
    values.invitee = b.invitee;
  }

  if ("icnu" in b) {
    if (b.icnu !== null && typeof b.icnu !== "string") return { error: "icnu must be text or null" };
    const icnu = typeof b.icnu === "string" ? b.icnu.trim() : "";
    if (icnu.length > MAX_ICNU) return { error: `ICNU must be ${MAX_ICNU} characters or fewer` };
    values.icnu = icnu || null;
  }

  if ("networkPersonId" in b) {
    if (b.networkPersonId !== null && !isUuid(b.networkPersonId)) {
      return { error: "networkPersonId must be a uuid or null" };
    }
    values.network_person_id = b.networkPersonId;
  }

  return { values };
}
