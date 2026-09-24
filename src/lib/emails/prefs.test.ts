import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  EMAIL_KIND_INFO,
  EMAIL_KINDS,
  emailTablesError,
  MISSING_TABLES_MESSAGE,
  parseUnsubscribe,
  prefsFromRow,
  recipientsFor,
  unsubscribePatch,
  validatePrefsPatch,
  type LeaderRow,
  type PrefsRow,
} from "./prefs";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const prefsRow = (email: string, over: Partial<PrefsRow> = {}): PrefsRow => ({
  email,
  rpms: true,
  digest: true,
  church_health: true,
  apprentice: true,
  milestones: true,
  unsubscribe_token: TOKEN,
  ...over,
});

const leaders: LeaderRow[] = [
  { email: "zed@example.invalid", name: "Zed", full_access: true },
  { email: " Amy@Example.invalid ", name: null, full_access: true },
  { email: "amy@example.invalid", name: "Amy again", full_access: true },
  { email: "pending@example.invalid", name: "Pending", full_access: false },
];

describe("prefsFromRow", () => {
  it("is all on with no row", () => {
    expect(prefsFromRow(null)).toEqual(DEFAULT_PREFS);
    expect(Object.values(DEFAULT_PREFS).every((v) => v === true)).toBe(true);
  });

  it("turns off only an explicit false", () => {
    expect(prefsFromRow({ digest: false, rpms: null })).toEqual({ ...DEFAULT_PREFS, digest: false });
  });
});

describe("recipientsFor", () => {
  it("keeps full-access leaders only, lowercased, once each, sorted", () => {
    expect(recipientsFor("rpms", leaders, []).map((r) => r.email)).toEqual([
      "amy@example.invalid",
      "zed@example.invalid",
    ]);
  });

  it("drops a leader who turned this kind off, and only this kind", () => {
    const prefs = [prefsRow("zed@example.invalid", { digest: false })];
    expect(recipientsFor("digest", leaders, prefs).map((r) => r.email)).toEqual(["amy@example.invalid"]);
    expect(recipientsFor("rpms", leaders, prefs).map((r) => r.email)).toEqual([
      "amy@example.invalid",
      "zed@example.invalid",
    ]);
  });

  it("carries the unsubscribe token when there is a row and falls back to the email for a name", () => {
    const [amy, zed] = recipientsFor("rpms", leaders, [prefsRow("ZED@example.invalid")]);
    expect(amy).toEqual({ email: "amy@example.invalid", name: "amy", token: null });
    expect(zed).toEqual({ email: "zed@example.invalid", name: "Zed", token: TOKEN });
  });

  it("never includes someone who only has a preferences row", () => {
    const prefs = [prefsRow("stranger@example.invalid")];
    expect(recipientsFor("rpms", [], prefs)).toEqual([]);
  });
});

describe("validatePrefsPatch", () => {
  it("accepts true or false for known kinds", () => {
    expect(validatePrefsPatch({ rpms: false, milestones: true })).toEqual({ patch: { rpms: false, milestones: true } });
  });

  it("rejects anything else", () => {
    expect(validatePrefsPatch(null)).toEqual({ error: "Send an object of email settings" });
    expect(validatePrefsPatch([])).toEqual({ error: "Send an object of email settings" });
    expect(validatePrefsPatch({})).toEqual({ error: "Send at least one email setting" });
    expect(validatePrefsPatch({ email: "x@example.invalid" })).toEqual({ error: "Unknown email setting: email" });
    expect(validatePrefsPatch({ rpms: "no" })).toEqual({ error: "rpms must be true or false" });
  });
});

describe("unsubscribe", () => {
  it("parses a token and one kind, or all kinds", () => {
    expect(parseUnsubscribe(TOKEN, "digest")).toEqual({ token: TOKEN, kinds: ["digest"] });
    expect(parseUnsubscribe(TOKEN.toUpperCase(), "all")).toEqual({ token: TOKEN, kinds: [...EMAIL_KINDS] });
  });

  it("rejects a token that is not a UUID, or an unknown kind", () => {
    const bad = { error: "This unsubscribe link is not valid." };
    expect(parseUnsubscribe("abc", "digest")).toEqual(bad);
    expect(parseUnsubscribe(null, "digest")).toEqual(bad);
    expect(parseUnsubscribe(`${TOKEN}' or '1'='1`, "digest")).toEqual(bad);
    expect(parseUnsubscribe(TOKEN, "everything")).toEqual(bad);
    expect(parseUnsubscribe(TOKEN, null)).toEqual(bad);
  });

  it("can only ever turn emails off", () => {
    expect(unsubscribePatch([...EMAIL_KINDS])).toEqual({
      rpms: false,
      digest: false,
      church_health: false,
      apprentice: false,
      milestones: false,
    });
  });
});

describe("emailTablesError", () => {
  it("explains a missing email table and passes other messages through", () => {
    expect(emailTablesError("Could not find the table 'public.leader_email_prefs' in the schema cache")).toContain(
      MISSING_TABLES_MESSAGE
    );
    expect(emailTablesError('relation "public.leader_email_log" does not exist')).toContain(MISSING_TABLES_MESSAGE);
    expect(emailTablesError("permission denied")).toBe("permission denied");
  });
});

describe("EMAIL_KIND_INFO", () => {
  it("has a label and a one-line description for every kind, with no em dash", () => {
    const dash = String.fromCharCode(0x2014);
    for (const kind of EMAIL_KINDS) {
      expect(EMAIL_KIND_INFO[kind].label.length).toBeGreaterThan(0);
      expect(EMAIL_KIND_INFO[kind].description.length).toBeGreaterThan(0);
      expect(EMAIL_KIND_INFO[kind].label + EMAIL_KIND_INFO[kind].description).not.toContain(dash);
    }
  });
});
