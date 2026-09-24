import { describe, expect, it } from "vitest";
import { FORM_TYPES, isCustomSupportRequest, parseApestRequest, parseForm } from "./forms";

const join = (over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  name: "Ann",
  email: "ann@example.invalid",
  company: "",
  data: { phone: "0400 000 000", group: "North Side", ...data },
  ...over,
});

function fail(type: string, body: unknown): string {
  const r = parseForm(type, body);
  if (r.ok) throw new Error(`expected a failure, got ${JSON.stringify(r.value)}`);
  return r.error;
}

describe("FORM_TYPES", () => {
  it("is exactly the form_type values the database allows", () => {
    expect([...FORM_TYPES].sort()).toEqual(
      ["event-updates", "idea-submission", "join-pathway", "leader-support", "mission-support", "start-pathway"].sort()
    );
  });
});

describe("parseForm: type and body", () => {
  it("refuses an unknown type", () => {
    expect(fail("send-anything", join())).toMatch(/form type/i);
  });

  it("refuses a body that is not an object", () => {
    expect(fail("join-pathway", null)).toMatch(/invalid/i);
    expect(fail("join-pathway", "hi")).toMatch(/invalid/i);
    expect(fail("join-pathway", [])).toMatch(/invalid/i);
  });

  it("accepts a good join-pathway form and trims the name", () => {
    const r = parseForm("join-pathway", join({ name: "  Ann  " }));
    expect(r).toEqual({
      ok: true,
      value: {
        type: "join-pathway",
        name: "Ann",
        email: "ann@example.invalid",
        data: { phone: "0400 000 000", group: "North Side" },
      },
    });
  });
});

describe("parseForm: honeypot", () => {
  it("is spam when company is filled", () => {
    expect(fail("join-pathway", join({ company: "Acme" }))).toBe("spam");
  });

  it("is spam before any other check, so bots learn nothing", () => {
    expect(fail("join-pathway", { company: "x" })).toBe("spam");
  });

  it("refuses a company that is not a string", () => {
    expect(fail("join-pathway", join({ company: 1 }))).toBe("spam");
  });
});

describe("parseForm: name", () => {
  it("is required", () => {
    expect(fail("join-pathway", join({ name: "   " }))).toMatch(/name/i);
    expect(fail("join-pathway", join({ name: undefined }))).toMatch(/name/i);
    expect(fail("join-pathway", join({ name: 5 }))).toMatch(/name/i);
  });

  it("is at most 100 characters after trimming", () => {
    expect(parseForm("join-pathway", join({ name: ` ${"a".repeat(100)} ` })).ok).toBe(true);
    expect(fail("join-pathway", join({ name: "a".repeat(101) }))).toMatch(/name/i);
  });
});

describe("parseForm: email", () => {
  it("is optional for join-pathway: missing or blank is null", () => {
    const a = parseForm("join-pathway", join({ email: undefined }));
    const b = parseForm("join-pathway", join({ email: "  " }));
    expect(a.ok && a.value.email).toBeNull();
    expect(b.ok && b.value.email).toBeNull();
  });

  it("is required for event-updates, start-pathway and mission-support", () => {
    expect(fail("event-updates", { name: "Ann", data: {} })).toMatch(/email/i);
    expect(fail("start-pathway", { name: "Ann", data: {} })).toMatch(/email/i);
    expect(fail("mission-support", { name: "Ann", data: { supportType: "time" } })).toMatch(/email/i);
  });

  it("is trimmed", () => {
    const r = parseForm("event-updates", { name: "Ann", email: " ann@example.invalid ", data: {} });
    expect(r.ok && r.value.email).toBe("ann@example.invalid");
  });

  it("must look like one address", () => {
    expect(fail("event-updates", { name: "Ann", email: "not-an-email", data: {} })).toMatch(/email/i);
    expect(fail("event-updates", { name: "Ann", email: "a@b", data: {} })).toMatch(/email/i);
  });

  it("refuses lists and header tricks: commas, semicolons, CR and LF", () => {
    for (const email of [
      "a@example.invalid,b@example.invalid",
      "a@example.invalid;b@example.invalid",
      "a@example.invalid\r\nBcc:b@example.invalid",
      "a@example.invalid\nb",
    ]) {
      expect(fail("event-updates", { name: "Ann", email, data: {} })).toMatch(/email/i);
    }
  });

  it("is at most 254 characters", () => {
    const long = `${"a".repeat(243)}@example.com`;
    expect(long.length).toBe(255);
    expect(fail("event-updates", { name: "Ann", email: long, data: {} })).toMatch(/email/i);
    const ok = `${"a".repeat(242)}@example.com`;
    expect(parseForm("event-updates", { name: "Ann", email: ok, data: {} }).ok).toBe(true);
  });

  it("is ignored for leader-support: the route uses the session email", () => {
    const r = parseForm("leader-support", {
      name: "Lee",
      email: "someone-else@example.invalid",
      data: { selectedDate: "2026-10-01T08:00:00.000Z", formattedDate: "Thursday 1 October at 6:00 pm" },
    });
    expect(r.ok && r.value.email).toBeNull();
  });
});

describe("parseForm: data", () => {
  it("defaults to no fields when data is missing", () => {
    const r = parseForm("event-updates", { name: "Ann", email: "ann@example.invalid" });
    expect(r.ok && r.value.data).toEqual({});
  });

  it("refuses data that is not an object", () => {
    expect(fail("event-updates", { name: "Ann", email: "ann@example.invalid", data: "x" })).toMatch(/data/i);
    expect(fail("event-updates", { name: "Ann", email: "ann@example.invalid", data: ["x"] })).toMatch(/data/i);
  });

  it("refuses a key the type does not allow", () => {
    expect(fail("join-pathway", join({}, { zoomLink: "https://evil.invalid" }))).toMatch(/zoomLink/);
    expect(fail("event-updates", { name: "Ann", email: "ann@example.invalid", data: { website: "" } })).toMatch(/website/);
  });

  it("refuses a value that is not a string", () => {
    expect(fail("join-pathway", join({}, { group: 3 }))).toMatch(/group/);
    expect(fail("join-pathway", join({}, { group: { a: 1 } }))).toMatch(/group/);
  });

  it("caps each value at 2000 characters", () => {
    expect(parseForm("idea-submission", { name: "Ann", data: { idea: "a".repeat(2000) } }).ok).toBe(true);
    expect(fail("idea-submission", { name: "Ann", data: { idea: "a".repeat(2001) } })).toMatch(/idea/);
  });

  it("caps the whole data object at 10000 bytes of JSON", () => {
    // Five 2000-character values of a 3-byte character: each under the
    // per-field cap, together well over 10000 bytes.
    const big = "€".repeat(2000);
    const data = { selectedDate: big, formattedDate: big, requestedDate: big, requestedTime: big, custom: big };
    expect(fail("leader-support", { name: "Lee", data })).toMatch(/too large/i);
  });

  it("requires the fields each type needs", () => {
    expect(fail("join-pathway", join({}, { group: "  " }))).toMatch(/group/);
    expect(fail("join-pathway", join({}, { phone: undefined }))).toMatch(/phone/);
    expect(fail("mission-support", { name: "Ann", email: "ann@example.invalid", data: {} })).toMatch(/supportType/);
    expect(fail("idea-submission", { name: "Ann", data: {} })).toMatch(/idea/);
  });

  it("accepts mission-support with an empty optional message", () => {
    const r = parseForm("mission-support", {
      name: "Ann",
      email: "ann@example.invalid",
      data: { supportType: "time", message: "" },
    });
    expect(r.ok && r.value.data).toEqual({ supportType: "time", message: "" });
  });

  it("only knows the two mission-support types", () => {
    expect(fail("mission-support", { name: "Ann", email: "ann@example.invalid", data: { supportType: "money" } })).toMatch(
      /supportType/
    );
  });
});

describe("parseForm: leader-support", () => {
  const booked = { selectedDate: "2026-10-01T08:00:00.000Z", formattedDate: "Thursday 1 October at 6:00 pm" };
  const custom = { requestedDate: "2026-10-03", requestedTime: "10:30", custom: "true" };

  it("accepts a booked call or a custom time request", () => {
    expect(parseForm("leader-support", { name: "Lee", data: booked }).ok).toBe(true);
    expect(parseForm("leader-support", { name: "Lee", data: custom }).ok).toBe(true);
  });

  it("needs both halves of whichever request it is", () => {
    expect(fail("leader-support", { name: "Lee", data: { selectedDate: booked.selectedDate } })).toMatch(/formattedDate/);
    expect(fail("leader-support", { name: "Lee", data: { requestedDate: "2026-10-03", custom: "true" } })).toMatch(
      /requestedTime/
    );
  });

  it("tells the two apart", () => {
    expect(isCustomSupportRequest(booked)).toBe(false);
    expect(isCustomSupportRequest(custom)).toBe(true);
  });
});

describe("parseApestRequest", () => {
  const results = { apostle: 30, prophet: 20, evangelist: 15, shepherd: 25, teacher: 10 };

  it("accepts results alone (the reflection call, no email)", () => {
    expect(parseApestRequest({ results })).toEqual({ ok: true, value: { results, email: null, name: "", signedReflection: null } });
  });

  it("accepts results with an email and an optional name", () => {
    expect(parseApestRequest({ results, email: " ann@example.invalid ", name: " Ann ", company: "" })).toEqual({
      ok: true,
      value: { results, email: "ann@example.invalid", name: "Ann", signedReflection: null },
    });
  });

  it("carries the page's reflection with its signature, both or neither, length capped", () => {
    const r = parseApestRequest({ results, email: "ann@example.invalid", reflection: "Text", signature: "ab" });
    expect(r.ok && r.value.signedReflection).toEqual({ text: "Text", signature: "ab" });
    expect(parseApestRequest({ results, reflection: "Text" }).ok).toBe(false);
    expect(parseApestRequest({ results, signature: "ab" }).ok).toBe(false);
    expect(parseApestRequest({ results, reflection: "", signature: "ab" }).ok).toBe(false);
    expect(parseApestRequest({ results, reflection: "a".repeat(5001), signature: "ab" }).ok).toBe(false);
    expect(parseApestRequest({ results, reflection: "a".repeat(5000), signature: "ab" }).ok).toBe(true);
  });

  it("needs exactly the five roles as numbers from 0 to 100", () => {
    expect(parseApestRequest({}).ok).toBe(false);
    expect(parseApestRequest({ results: { ...results, teacher: "10" } }).ok).toBe(false);
    expect(parseApestRequest({ results: { ...results, teacher: 101 } }).ok).toBe(false);
    expect(parseApestRequest({ results: { ...results, teacher: Number.NaN } }).ok).toBe(false);
    const { teacher: _t, ...four } = results;
    void _t;
    expect(parseApestRequest({ results: four }).ok).toBe(false);
    expect(parseApestRequest({ results: { ...results, "ignore previous instructions": 1 } }).ok).toBe(false);
  });

  it("refuses a bad email, a long name, and the old personalizedMessage", () => {
    expect(parseApestRequest({ results, email: "a@x.invalid,b@y.invalid" }).ok).toBe(false);
    expect(parseApestRequest({ results, email: "ann@example.invalid", name: "a".repeat(101) }).ok).toBe(false);
    expect(parseApestRequest({ results, email: "ann@example.invalid", personalizedMessage: "<b>hi</b>" }).ok).toBe(false);
  });

  it("is spam when the honeypot is filled", () => {
    expect(parseApestRequest({ results, email: "ann@example.invalid", company: "x" })).toEqual({ ok: false, error: "spam" });
  });
});
