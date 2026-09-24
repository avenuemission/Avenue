import { APEST_ORDER, type ApestResults } from "./apest";

// The public forms: which ones exist, what each may carry, and the one
// parser every submission goes through before anything is saved or sent.
// Pure, so the route and its tests share it.

// Exactly the form_type values the form_submissions CHECK allows.
export const FORM_TYPES = [
  "start-pathway",
  "join-pathway",
  "mission-support",
  "idea-submission",
  "leader-support",
  "event-updates",
] as const;

export type FormType = (typeof FORM_TYPES)[number];

export interface FormSubmission {
  type: FormType;
  name: string;
  email: string | null;
  data: Record<string, string>;
}

export type FormParse = { ok: true; value: FormSubmission } | { ok: false; error: string };

// One address, no display name. Commas, semicolons, CR and LF are refused
// separately so nothing can become a list or an extra mail header.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const NAME_MAX = 100;
const VALUE_MAX = 2000;
const DATA_MAX_BYTES = 10000;

interface FormRule {
  // "none": the address comes from somewhere else (the leader's session),
  // so any email in the body is ignored.
  email: "required" | "optional" | "none";
  keys: readonly string[];
  required: readonly string[];
  // Extra per-type checks on the data; returns an error or null.
  check?: (data: Record<string, string>) => string | null;
}

const RULES: Record<FormType, FormRule> = {
  "start-pathway": { email: "required", keys: ["phone", "suburb"], required: [] },
  "join-pathway": { email: "optional", keys: ["phone", "group"], required: ["phone", "group"] },
  "mission-support": {
    email: "required",
    keys: ["supportType", "message"],
    required: ["supportType"],
    check: (d) => (d.supportType === "time" || d.supportType === "resources" ? null : "supportType must be time or resources"),
  },
  "idea-submission": { email: "optional", keys: ["idea"], required: ["idea"] },
  "leader-support": {
    email: "none",
    keys: ["selectedDate", "formattedDate", "requestedDate", "requestedTime", "custom"],
    required: [],
    check: (d) => {
      const need = isCustomSupportRequest(d) ? ["requestedDate", "requestedTime"] : ["selectedDate", "formattedDate"];
      const missing = need.find((k) => !d[k]?.trim());
      return missing ? `${missing} is required` : null;
    },
  },
  "event-updates": { email: "required", keys: [], required: [] },
};

// A leader-support form is either a booked Thursday/Saturday call or a
// request for a custom time. The custom one carries the requested date.
export function isCustomSupportRequest(data: Record<string, string>): boolean {
  return Boolean(data.requestedDate || data.requestedTime);
}

function isFormType(type: string): type is FormType {
  return (FORM_TYPES as readonly string[]).includes(type);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEmail(raw: unknown, rule: FormRule["email"]): { ok: true; email: string | null } | { ok: false } {
  if (rule === "none") return { ok: true, email: null };
  if (raw !== undefined && raw !== null && typeof raw !== "string") return { ok: false };
  const email = (raw ?? "").trim();
  if (!email) return rule === "optional" ? { ok: true, email: null } : { ok: false };
  if (email.length > EMAIL_MAX || /[,;\r\n]/.test(email) || !EMAIL_PATTERN.test(email)) return { ok: false };
  return { ok: true, email };
}

export function parseForm(type: string, body: unknown): FormParse {
  if (!isFormType(type)) return { ok: false, error: "Unknown form type" };
  if (!isPlainObject(body)) return { ok: false, error: "Invalid form" };

  // Honeypot first: a filled (or non-string) company field is a bot, and
  // the caller answers as if it worked.
  if (body.company !== undefined && body.company !== "") return { ok: false, error: "spam" };

  const rule = RULES[type];

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > NAME_MAX) return { ok: false, error: `Please give a name of 1 to ${NAME_MAX} characters` };

  const email = parseEmail(body.email, rule.email);
  if (!email.ok) return { ok: false, error: "Please give one valid email address" };

  const rawData = body.data ?? {};
  if (!isPlainObject(rawData)) return { ok: false, error: "Invalid form data" };

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (!rule.keys.includes(key)) return { ok: false, error: `Unexpected field: ${key}` };
    if (typeof value !== "string") return { ok: false, error: `${key} must be text` };
    if (value.length > VALUE_MAX) return { ok: false, error: `${key} is too long (max ${VALUE_MAX} characters)` };
    data[key] = value;
  }
  if (new TextEncoder().encode(JSON.stringify(data)).length > DATA_MAX_BYTES) {
    return { ok: false, error: "Form is too large" };
  }

  const missing = rule.required.find((k) => !data[k]?.trim());
  if (missing) return { ok: false, error: `${missing} is required` };
  const extra = rule.check?.(data);
  if (extra) return { ok: false, error: extra };

  return { ok: true, value: { type, name, email: email.email, data } };
}

// The APEST quiz is not a form_submissions form: its results go to
// /api/apest-results, which writes a signed reflection, and, when an email
// is given, emails the results with that same reflection. The reflection
// comes back from the browser only with the server's signature, which the
// route verifies before using it.
export interface ApestRequest {
  results: ApestResults;
  email: string | null;
  name: string;
  signedReflection: { text: string; signature: string } | null;
}

export const REFLECTION_MAX = 5000;

export type ApestParse = { ok: true; value: ApestRequest } | { ok: false; error: string };

const APEST_KEYS = new Set(["results", "email", "name", "company", "reflection", "signature"]);

export function parseApestRequest(body: unknown): ApestParse {
  if (!isPlainObject(body)) return { ok: false, error: "Invalid request" };
  if (body.company !== undefined && body.company !== "") return { ok: false, error: "spam" };
  const unknown = Object.keys(body).find((k) => !APEST_KEYS.has(k));
  if (unknown) return { ok: false, error: `Unexpected field: ${unknown}` };

  const raw = body.results;
  if (!isPlainObject(raw) || Object.keys(raw).length !== APEST_ORDER.length) {
    return { ok: false, error: "Invalid results" };
  }
  const results = {} as ApestResults;
  for (const role of APEST_ORDER) {
    const value = raw[role];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false, error: "Invalid results" };
    }
    results[role] = value;
  }

  const email = parseEmail(body.email, "optional");
  if (!email.ok) return { ok: false, error: "Please give one valid email address" };

  if (body.name !== undefined && typeof body.name !== "string") return { ok: false, error: "Invalid name" };
  const name = (body.name ?? "").trim();
  if (name.length > NAME_MAX) return { ok: false, error: `Please keep the name to ${NAME_MAX} characters` };

  const { reflection, signature } = body;
  let signedReflection: ApestRequest["signedReflection"] = null;
  if (reflection !== undefined || signature !== undefined) {
    if (typeof reflection !== "string" || typeof signature !== "string" || !reflection.trim() || signature.length > 128) {
      return { ok: false, error: "Invalid reflection" };
    }
    if (reflection.length > REFLECTION_MAX) return { ok: false, error: "Reflection is too long" };
    signedReflection = { text: reflection, signature };
  }

  return { ok: true, value: { results, email: email.email, name, signedReflection } };
}
