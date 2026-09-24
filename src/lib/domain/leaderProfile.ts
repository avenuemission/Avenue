// The leader profile as the API sends it. Pure: the route reads and writes
// leader_profiles, these rules shape the rows.
//
// The pathway group is a link (leader_profiles.pathway_group_id) to
// pathway_groups. The API answers with the id plus the group's name for
// display, embedded by PostgREST through that link.

export const PROFILE_TEXT_FIELDS = [
  "display_name",
  "avatar_url",
  "birthday",
  "baptism_anniversary",
  "favourite_verse",
  "favourite_verse_ref",
  "role",
  "apest",
  "about",
  "favourite_song",
  "coffee_order",
] as const;

// The choices the profile editor offers. The database checks the same lists
// (leader_profiles_role_allowed and leader_profiles_apest_allowed, migration
// 015), so a new role needs a migration as well.
export const PROFILE_ROLES = ["Leader", "Apprentice", "Coordinator", "Member"] as const;
export const PROFILE_APEST = ["Apostle", "Prophet", "Evangelist", "Shepherd", "Teacher"] as const;

// role and apest after normalising ("" is already null): null or a listed
// value, else the message to send back.
export function profileChoiceError(row: { role?: unknown; apest?: unknown }): string | null {
  const lists = { role: PROFILE_ROLES, apest: PROFILE_APEST } as const;
  for (const key of ["role", "apest"] as const) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (!(lists[key] as readonly unknown[]).includes(value)) return `${key} must be one of ${lists[key].join(", ")}`;
  }
  return null;
}

export const PROFILE_COLUMNS = `${PROFILE_TEXT_FIELDS.join(", ")}, pathway_group_id, pathway_groups(name)`;

export type ProfileResponse = Record<string, unknown> & {
  pathwayGroupId: number | null;
  pathwayGroupName: string | null;
};

// Only the profile text fields that are present on the row, plus the group.
export function profileResponse(row: Record<string, unknown> | null): ProfileResponse | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_TEXT_FIELDS) if (key in row) out[key] = row[key];
  const group = row.pathway_groups as { name?: unknown } | null | undefined;
  return {
    ...out,
    pathwayGroupId: typeof row.pathway_group_id === "number" ? row.pathway_group_id : null,
    pathwayGroupName: typeof group?.name === "string" ? group.name : null,
  };
}

// The picker sends a group id (a number, or its digits as a string) or null
// / "" for no group. Anything else is refused, never guessed at.
export function pathwayGroupIdFrom(value: unknown): { id: number | null } | { error: string } {
  if (value === null || value === "") return { id: null };
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) return { id };
  return { error: "pathwayGroupId must be a pathway group id or null" };
}
