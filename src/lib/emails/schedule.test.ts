import { describe, expect, it } from "vitest";
import { dueKinds, periodKeyFor } from "./schedule";

const at = (iso: string) => dueKinds(new Date(iso));

// Melbourne is UTC+11 (AEDT) until 3:00 am on Sunday 5 April 2026, UTC+10
// (AEST) until 2:00 am on Sunday 4 October 2026, then UTC+11 again.
describe("dueKinds", () => {
  it("has nothing due at 5:59 pm on a Sunday (AEST)", () => {
    expect(at("2026-09-27T07:59:00Z")).toEqual([]);
  });

  it("makes the RPMS reminder due at 6 pm Sunday (AEST)", () => {
    expect(at("2026-09-27T08:00:00Z")).toEqual(["rpms"]);
  });

  it("keeps RPMS due until 23:59 Sunday and drops everything at midnight", () => {
    expect(at("2026-09-27T13:59:00Z")).toEqual(["rpms"]);
    expect(at("2026-09-27T14:00:00Z")).toEqual([]);
  });

  it("uses 6 pm AEDT on the Sunday daylight saving starts", () => {
    expect(at("2026-10-04T06:59:00Z")).toEqual([]);
    expect(at("2026-10-04T07:00:00Z")).toEqual(["rpms"]);
  });

  it("makes the Monday digest due at 7 am AEDT", () => {
    expect(at("2026-10-04T19:59:00Z")).toEqual([]);
    expect(at("2026-10-04T20:00:00Z")).toEqual(["digest", "milestones"]);
  });

  it("uses 6 pm AEST on the Sunday daylight saving ends", () => {
    expect(at("2026-04-05T07:59:00Z")).toEqual([]);
    expect(at("2026-04-05T08:00:00Z")).toEqual(["rpms"]);
  });

  it("uses 7 am AEST on the Monday after daylight saving ends", () => {
    expect(at("2026-04-05T20:59:00Z")).toEqual([]);
    expect(at("2026-04-05T21:00:00Z")).toEqual(["digest", "milestones"]);
  });

  it("makes church health due at 7 am on the 1st, a UTC day early", () => {
    expect(at("2026-09-30T20:59:00Z")).toEqual([]);
    expect(at("2026-09-30T21:00:00Z")).toEqual(["church_health", "milestones"]);
  });

  it("makes the apprentice nudge due at 7 am on the 15th", () => {
    expect(at("2026-10-14T20:00:00Z")).toEqual(["apprentice", "milestones"]);
  });

  it("sends the digest and church health together when the 1st is a Monday", () => {
    expect(at("2027-01-31T19:59:00Z")).toEqual([]);
    expect(at("2027-01-31T20:00:00Z")).toEqual(["digest", "church_health", "milestones"]);
  });

  it("checks milestones from 7 am to 9:59 am only, never in the afternoon or evening", () => {
    // Thursday 24 September 2026 (AEST).
    expect(at("2026-09-23T20:59:00Z")).toEqual([]);
    expect(at("2026-09-23T21:00:00Z")).toEqual(["milestones"]);
    expect(at("2026-09-23T23:59:00Z")).toEqual(["milestones"]);
    expect(at("2026-09-24T00:00:00Z")).toEqual([]);
    expect(at("2026-09-24T03:00:00Z")).toEqual([]);
  });
});

describe("periodKeyFor", () => {
  it("keys weekly kinds by Melbourne date and monthly kinds by Melbourne month", () => {
    expect(periodKeyFor("rpms", new Date("2026-09-27T09:00:00Z"))).toBe("2026-09-27");
    expect(periodKeyFor("digest", new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
    expect(periodKeyFor("church_health", new Date("2026-09-30T21:00:00Z"))).toBe("2026-10");
    expect(periodKeyFor("apprentice", new Date("2026-10-14T20:00:00Z"))).toBe("2026-10");
  });
});
