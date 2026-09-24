import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  addMonthsKey,
  dayMonthLabel,
  daysBetweenISO,
  melbourneDateOf,
  melbourneParts,
  mondayOfISO,
  monthLabel,
} from "./melbourneDate";

describe("melbourneParts", () => {
  it("reads Melbourne time in standard time (AEST, UTC+10)", () => {
    expect(melbourneParts(new Date("2026-09-27T08:00:00Z"))).toEqual({
      date: "2026-09-27",
      year: 2026,
      month: 9,
      day: 27,
      hour: 18,
      weekday: 0,
    });
  });

  it("jumps from 1:59 to 3:00 when daylight saving starts on 4 October 2026", () => {
    expect(melbourneParts(new Date("2026-10-03T15:59:00Z"))).toMatchObject({ date: "2026-10-04", hour: 1 });
    expect(melbourneParts(new Date("2026-10-03T16:00:00Z"))).toMatchObject({ date: "2026-10-04", hour: 3 });
  });

  it("is already tomorrow in Melbourne while UTC is still today", () => {
    expect(melbourneParts(new Date("2026-09-30T21:00:00Z"))).toMatchObject({
      date: "2026-10-01",
      day: 1,
      hour: 7,
      weekday: 4,
    });
  });

  it("rolls the year at Melbourne midnight", () => {
    expect(melbourneParts(new Date("2026-12-31T13:00:00Z"))).toMatchObject({
      date: "2027-01-01",
      year: 2027,
      month: 1,
      hour: 0,
      weekday: 5,
    });
  });

  it("throws on an invalid date", () => {
    expect(() => melbourneParts(new Date("not a date"))).toThrow("invalid date");
  });
});

describe("ISO date arithmetic", () => {
  it("adds days across months, years and a leap day", () => {
    expect(addDaysISO("2026-09-28", -7)).toBe("2026-09-21");
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysISO("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("counts whole days, ignoring the daylight saving hour", () => {
    expect(daysBetweenISO("2026-10-03", "2026-10-05")).toBe(2);
    expect(daysBetweenISO("2026-10-05", "2026-10-03")).toBe(-2);
  });

  it("finds the Monday of the week, Sunday belonging to the week before", () => {
    expect(mondayOfISO("2026-09-27")).toBe("2026-09-21");
    expect(mondayOfISO("2026-09-28")).toBe("2026-09-28");
    expect(mondayOfISO("2026-09-30")).toBe("2026-09-28");
  });

  it("throws on a date that is not YYYY-MM-DD", () => {
    expect(() => addDaysISO("27/09/2026", 1)).toThrow("Not a YYYY-MM-DD date");
  });

  it("moves month keys across years", () => {
    expect(addMonthsKey("2026-01", -11)).toBe("2025-02");
    expect(addMonthsKey("2026-12", 1)).toBe("2027-01");
    expect(addMonthsKey("2026-10", 0)).toBe("2026-10");
  });

  it("labels months and days in words", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(dayMonthLabel("2026-10-05")).toBe("5 October");
  });

  it("gives the Melbourne calendar date of a UTC timestamp", () => {
    expect(melbourneDateOf("2025-11-30T14:30:00Z")).toBe("2025-12-01");
  });
});
