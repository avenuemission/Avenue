// Worksheets: one private JSON document per leader per kind (calling,
// launch), split into named sections. Pure validation shared by
// /api/worksheets and its tests. The caller's email never comes from
// input: the route takes it from the verified session.

export const WORKSHEET_KINDS = ["calling", "launch"] as const;
export type WorksheetKind = (typeof WORKSHEET_KINDS)[number];

export const WORKSHEET_SECTIONS = {
  calling: ["layers", "callable", "shared", "apest", "seasonal", "conversation"],
  launch: ["prayer", "mission", "space", "team", "intentional", "rhythm", "invite", "arena", "actions"],
} as const satisfies Record<WorksheetKind, readonly string[]>;

export const MAX_DEPTH = 5;
export const MAX_VALUE_CHARS = 20_000;

export interface WorksheetPatch {
  kind: WorksheetKind;
  section: string;
  value: unknown;
}

export function parseKind(value: unknown): WorksheetKind | null {
  return typeof value === "string" && (WORKSHEET_KINDS as readonly string[]).includes(value)
    ? (value as WorksheetKind)
    : null;
}

export function isSectionOf(kind: WorksheetKind, section: unknown): section is string {
  return typeof section === "string" && (WORKSHEET_SECTIONS[kind] as readonly string[]).includes(section);
}

// Depth of a plain JSON value: a primitive is 0, an array or object is one
// more than its deepest child (an empty one is 1). Returns -1 for anything
// JSON cannot carry faithfully. Stops walking as soon as it passes
// MAX_DEPTH, so a hostile payload cannot make it recurse deeply.
export function jsonDepth(value: unknown): number {
  return measure(value, 1);
}

// `level` is the depth this value reaches if it is a container.
function measure(value: unknown, level: number): number {
  if (value === null || typeof value === "string" || typeof value === "boolean") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? 0 : -1;
  if (typeof value !== "object") return -1;
  if (level > MAX_DEPTH) return level;
  if (!Array.isArray(value)) {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return -1;
  }
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  let deepest = level;
  for (const child of children) {
    const d = measure(child, level + 1);
    if (d < 0) return -1;
    if (d > deepest) deepest = d;
    if (deepest > MAX_DEPTH) return deepest;
  }
  return deepest;
}

export function validateWorksheetPatch(body: unknown): WorksheetPatch | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;

  const kind = parseKind(b.kind);
  if (!kind) return { error: "kind must be calling or launch" };
  if (!isSectionOf(kind, b.section)) {
    return { error: `section must be one of: ${WORKSHEET_SECTIONS[kind].join(", ")}` };
  }
  if (!("value" in b)) return { error: "value is required" };

  const depth = jsonDepth(b.value);
  if (depth < 0) return { error: "value must be plain JSON" };
  if (depth > MAX_DEPTH) return { error: `value is nested too deeply (max ${MAX_DEPTH} levels)` };
  if (JSON.stringify(b.value).length > MAX_VALUE_CHARS) {
    return { error: `value is too large (max ${MAX_VALUE_CHARS} characters)` };
  }
  return { kind, section: b.section, value: b.value };
}
