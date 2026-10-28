import { describe, expect, it } from "vitest";
import { ONRAMP_ERRORS, parseOnrampSignup, signupsCsv, workshopCounts, workshopsError, type OnrampRow } from "./onramp";

const good = { name: "  Ann   Lee ", email: " Ann@Example.Invalid ", workshops: ["digital", "worship"], company: "" };

describe("parseOnrampSignup", () => {
  it("accepts a good sign-up, tidies the name and email, and keeps the page's workshop order", () => {
    expect(parseOnrampSignup(good)).toEqual({
      ok: true,
      value: { name: "Ann Lee", email: "ann@example.invalid", workshops: ["worship", "digital"] },
    });
  });

  it("treats a filled honeypot as spam", () => {
    expect(parseOnrampSignup({ ...good, company: "Acme" })).toEqual({ ok: false, spam: true });
  });

  it("needs a name", () => {
    for (const name of ["", "   ", undefined, 5]) {
      expect(parseOnrampSignup({ ...good, name })).toEqual({ ok: false, error: ONRAMP_ERRORS.name });
    }
    expect(parseOnrampSignup({ ...good, name: "x".repeat(101) })).toEqual({ ok: false, error: ONRAMP_ERRORS.nameLong });
  });

  it("needs one valid email", () => {
    for (const email of ["", "ann", "ann@", "ann@x", "a@x.invalid, b@y.invalid", "a@x.invalid\nBcc: b@y.invalid", undefined]) {
      expect(parseOnrampSignup({ ...good, email })).toEqual({ ok: false, error: ONRAMP_ERRORS.email });
    }
  });

  it("needs 1 or 2 known workshops", () => {
    expect(parseOnrampSignup({ ...good, workshops: [] })).toEqual({ ok: false, error: ONRAMP_ERRORS.workshopsNone });
    expect(parseOnrampSignup({ ...good, workshops: ["worship", "digital", "creative"] })).toEqual({
      ok: false,
      error: ONRAMP_ERRORS.workshopsTooMany,
    });
    expect(parseOnrampSignup({ ...good, workshops: ["worship", "cooking"] })).toEqual({ ok: false, error: ONRAMP_ERRORS.invalid });
    expect(parseOnrampSignup({ ...good, workshops: "worship" })).toEqual({ ok: false, error: ONRAMP_ERRORS.invalid });
    expect(parseOnrampSignup({ ...good, workshops: ["creative"] }).ok).toBe(true);
  });

  it("counts a repeated workshop once", () => {
    expect(parseOnrampSignup({ ...good, workshops: ["worship", "worship"] })).toEqual({
      ok: true,
      value: { name: "Ann Lee", email: "ann@example.invalid", workshops: ["worship"] },
    });
  });

  it("refuses a body that is not an object", () => {
    for (const body of [null, "x", [], 3]) expect(parseOnrampSignup(body)).toEqual({ ok: false, error: ONRAMP_ERRORS.invalid });
  });
});

describe("workshopsError", () => {
  it("allows 1 or 2", () => {
    expect(workshopsError(["worship"])).toBeNull();
    expect(workshopsError(["worship", "digital"])).toBeNull();
    expect(workshopsError([])).toBe(ONRAMP_ERRORS.workshopsNone);
    expect(workshopsError(["a", "b", "c"])).toBe(ONRAMP_ERRORS.workshopsTooMany);
  });
});

const row = (over: Partial<OnrampRow>): OnrampRow => ({
  id: "1",
  name: "Ann",
  email: "ann@example.invalid",
  workshops: ["worship"],
  created_at: "2026-10-31T01:00:00Z",
  updated_at: "2026-10-31T01:00:00Z",
  ...over,
});

describe("workshopCounts", () => {
  it("counts each workshop in the page's order", () => {
    const counts = workshopCounts([row({ workshops: ["worship", "digital"] }), row({ workshops: ["digital"] })]);
    expect(counts.map((c) => [c.id, c.count])).toEqual([
      ["worship", 1],
      ["communication", 0],
      ["digital", 2],
      ["creative", 0],
    ]);
  });
});

describe("signupsCsv", () => {
  it("writes a header and one quoted row per sign-up, oldest first", () => {
    const csv = signupsCsv([
      row({ id: "2", name: "Bo", created_at: "2026-10-31T02:00:00Z", workshops: ["creative"] }),
      row({ id: "1", name: 'Ann "AJ"', workshops: ["worship", "digital"] }),
    ]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe('"Name","Email","Workshop 1","Workshop 2","Signed up","Last updated"');
    expect(lines[1]).toBe(
      '"Ann ""AJ""","ann@example.invalid","Worship leading (Matt)","Digital mission: comms, social media + tech (Zoey)","2026-10-31T01:00:00Z","2026-10-31T01:00:00Z"'
    );
    expect(lines[2]).toContain('"Bo"');
    expect(lines[2]).toContain('"Running creative evangelistic spaces (Ash)",""');
  });

  it("defuses a value that a spreadsheet would run as a formula", () => {
    expect(signupsCsv([row({ name: "=HYPERLINK(1)" })])).toContain(`"'=HYPERLINK(1)"`);
  });
});
