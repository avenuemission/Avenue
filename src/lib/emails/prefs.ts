// Leader email kinds and preferences (spec 2026-09-24 church health emails,
// 3.1 and 3.4). Pure, so it is safe in the browser (the Emails panel) and
// on the server (routes and the engine).

export const EMAIL_KINDS = ["rpms", "digest", "church_health", "apprentice", "milestones"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];
export type EmailPrefs = Record<EmailKind, boolean>;

export const DEFAULT_PREFS: EmailPrefs = {
  rpms: true,
  digest: true,
  church_health: true,
  apprentice: true,
  milestones: true,
};

// Henry to check wording
export const EMAIL_KIND_INFO: Record<EmailKind, { label: string; description: string }> = {
  rpms: {
    label: "Sunday check-in reminder",
    description: "Sunday 6 pm: a nudge to do your weekly RPMS check-in.",
  },
  digest: {
    label: "Your week",
    description: "Monday 7 am: this week's Pathways topic, your check-in trend and who to follow up.",
  },
  church_health: {
    label: "Monthly church health",
    description: "1st of the month: update your three lists and see the whole church's numbers.",
  },
  apprentice: {
    label: "Apprentice nudge",
    description: "15th of the month: where each person you are apprenticing is, and their next step.",
  },
  milestones: {
    label: "Milestones",
    description: "When you light a new streetlight, and 30, 7 and 1 days before your launch.",
  },
};

// A well-formed token that matches no row. Previews and dry runs use it for
// leaders who have no preferences row yet.
export const PREVIEW_TOKEN = "00000000-0000-4000-8000-000000000000";

// A single string literal so Supabase's column parser can read it.
export const PREFS_COLUMNS = "email, rpms, digest, church_health, apprentice, milestones, unsubscribe_token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PrefsRow {
  email: string;
  rpms: boolean | null;
  digest: boolean | null;
  church_health: boolean | null;
  apprentice: boolean | null;
  milestones: boolean | null;
  unsubscribe_token: string;
}

export interface LeaderRow {
  email: string;
  name: string | null;
  full_access: boolean;
}

export interface Recipient {
  email: string;
  name: string;
  token: string | null;
}

export function isEmailKind(value: unknown): value is EmailKind {
  return typeof value === "string" && (EMAIL_KINDS as readonly string[]).includes(value);
}

// A missing row, or a missing value, means on. Only an explicit false is off.
export function prefsFromRow(row: Partial<PrefsRow> | null | undefined): EmailPrefs {
  const prefs = { ...DEFAULT_PREFS };
  for (const kind of EMAIL_KINDS) if (row?.[kind] === false) prefs[kind] = false;
  return prefs;
}

// The only people who can ever get an email: `leaders` rows with full
// access, minus anyone who turned this kind off. A preferences row alone
// never makes anyone a recipient. Emails are trimmed and lowercased,
// duplicates dropped, and the list is sorted so every run is repeatable.
export function recipientsFor(kind: EmailKind, leaders: LeaderRow[], prefs: PrefsRow[]): Recipient[] {
  const prefsBy = new Map(prefs.map((p) => [p.email.trim().toLowerCase(), p]));
  const out = new Map<string, Recipient>();
  for (const leader of leaders) {
    if (leader.full_access !== true) continue;
    const email = leader.email.trim().toLowerCase();
    if (!email || out.has(email)) continue;
    const row = prefsBy.get(email);
    if (!prefsFromRow(row)[kind]) continue;
    out.set(email, { email, name: leader.name?.trim() || email.split("@")[0], token: row?.unsubscribe_token ?? null });
  }
  return [...out.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export function validatePrefsPatch(body: unknown): { patch: Partial<EmailPrefs> } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Send an object of email settings" };
  const patch: Partial<EmailPrefs> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!isEmailKind(key)) return { error: `Unknown email setting: ${key}` };
    if (typeof value !== "boolean") return { error: `${key} must be true or false` };
    patch[key] = value;
  }
  if (Object.keys(patch).length === 0) return { error: "Send at least one email setting" };
  return { patch };
}

export function parseUnsubscribe(token: unknown, kind: unknown): { token: string; kinds: EmailKind[] } | { error: string } {
  const invalid = { error: "This unsubscribe link is not valid." };
  if (typeof token !== "string" || !UUID.test(token)) return invalid;
  if (kind === "all") return { token: token.toLowerCase(), kinds: [...EMAIL_KINDS] };
  if (!isEmailKind(kind)) return invalid;
  return { token: token.toLowerCase(), kinds: [kind] };
}

// Unsubscribing can only ever turn emails off.
export function unsubscribePatch(kinds: EmailKind[]): Partial<EmailPrefs> {
  const patch: Partial<EmailPrefs> = {};
  for (const kind of kinds) patch[kind] = false;
  return patch;
}

export const MISSING_TABLES_MESSAGE =
  "Leader email tables are missing. Apply supabase/migrations/009_leader_emails.sql first.";

// Until migration 009 is applied, Supabase reports the tables as missing.
// Say what to do about it, keeping the original message for the log.
export function emailTablesError(message: string): string {
  const aboutEmailTables = /leader_email_(prefs|log)/.test(message);
  const missing = /does not exist|schema cache|PGRST205|42P01/i.test(message);
  return aboutEmailTables && missing ? `${MISSING_TABLES_MESSAGE} (${message})` : message;
}
