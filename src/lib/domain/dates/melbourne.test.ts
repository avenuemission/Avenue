import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  addMonthsKey,
  dayMonthLabel,
  daysBetweenISO,
  melbourneDateOf,
  melbourneInstant,
  melbourneParts,
  mondayOf,
  mondayOfISO,
  monthLabel,
  nextMelbourneWeekly,
  recentMondays,
} from "./melbourne";

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

// The browser-local rule check-ins used before weeks moved to Melbourne time.
// Kept here only to prove the switch never moves a stored week_start for a
// leader whose browser runs in Melbourne.
function localMondayOf(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inZone<T>(tz: string, run: () => T): T {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

describe("mondayOf (Melbourne weeks)", () => {
  it("keeps Sunday 11:30 pm in the week that started six days earlier", () => {
    // Sunday 27 Sep 2026, 11:30 pm AEST (UTC+10).
    expect(mondayOf(new Date("2026-09-27T13:30:00Z"))).toBe("2026-09-21");
    // Sunday 1 Nov 2026, 11:30 pm AEDT (UTC+11).
    expect(mondayOf(new Date("2026-11-01T12:30:00Z"))).toBe("2026-10-26");
  });

  it("starts a new week at 12:30 am Monday", () => {
    // Monday 28 Sep 2026, 12:30 am AEST: still Sunday in UTC.
    expect(mondayOf(new Date("2026-09-27T14:30:00Z"))).toBe("2026-09-28");
    // Monday 2 Nov 2026, 12:30 am AEDT.
    expect(mondayOf(new Date("2026-11-01T13:30:00Z"))).toBe("2026-11-02");
  });

  it("does not depend on the machine's time zone", () => {
    const sundayNight = new Date("2026-09-27T13:30:00Z");
    for (const tz of ["UTC", "America/New_York", "Asia/Tokyo", "Australia/Melbourne"]) {
      expect(inZone(tz, () => mondayOf(sundayNight))).toBe("2026-09-21");
    }
  });

  it("gives the same week_start as the old browser-local rule for a browser in Melbourne, every half hour for a year", () => {
    inZone("Australia/Melbourne", () => {
      // Guard: the zone switch really took effect (AEST is UTC+10).
      expect(new Date("2026-07-01T00:00:00Z").getTimezoneOffset()).toBe(-600);
      const start = Date.UTC(2026, 0, 1);
      const end = Date.UTC(2027, 0, 1);
      for (let t = start; t < end; t += 30 * 60 * 1000) {
        const instant = new Date(t);
        if (mondayOf(instant) !== localMondayOf(instant)) {
          throw new Error(`week key moved at ${instant.toISOString()}`);
        }
      }
    });
  });

  it("maps each weekday to its Monday across month and year ends", () => {
    expect(mondayOf(new Date("2026-09-02T02:00:00Z"))).toBe("2026-08-31");
    expect(mondayOf(new Date("2026-01-03T02:00:00Z"))).toBe("2025-12-29");
    expect(mondayOf(new Date("2026-08-24T02:00:00Z"))).toBe("2026-08-24");
  });
});

describe("recentMondays", () => {
  it("returns the Mondays newest first, seven days apart, starting with this week", () => {
    expect(recentMondays(4, new Date("2026-08-26T02:00:00Z"))).toEqual([
      "2026-08-24",
      "2026-08-17",
      "2026-08-10",
      "2026-08-03",
    ]);
  });

  it("is the same in any machine time zone", () => {
    const now = new Date("2026-08-26T02:00:00Z");
    const expected = ["2026-08-24", "2026-08-17", "2026-08-10", "2026-08-03", "2026-07-27"];
    for (const tz of ["UTC", "America/New_York", "Australia/Melbourne"]) {
      expect(inZone(tz, () => recentMondays(5, now))).toEqual(expected);
    }
  });

  it("is empty for a count of 0", () => {
    expect(recentMondays(0, new Date("2026-08-26T02:00:00Z"))).toEqual([]);
  });
});

describe("melbourneInstant", () => {
  it("reads a Melbourne wall-clock time in standard time and in daylight saving", () => {
    expect(melbourneInstant("2026-09-30", 19, 0).toISOString()).toBe("2026-09-30T09:00:00.000Z");
    expect(melbourneInstant("2026-10-07", 19, 0).toISOString()).toBe("2026-10-07T08:00:00.000Z");
    expect(melbourneInstant("2026-10-07", 9, 30).toISOString()).toBe("2026-10-06T22:30:00.000Z");
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(() => melbourneInstant("7/10/2026", 19, 0)).toThrow();
  });
});

describe("nextMelbourneWeekly", () => {
  const WEDNESDAY = 3;
  it("is later today when the time has not passed yet", () => {
    // Wednesday 30 Sep 2026, 6 pm AEST.
    const now = new Date("2026-09-30T08:00:00Z");
    expect(nextMelbourneWeekly(now, WEDNESDAY, 19).toISOString()).toBe("2026-09-30T09:00:00.000Z");
  });

  it("is next week once the time has passed, following daylight saving", () => {
    // Wednesday 30 Sep 2026, 7 pm AEST exactly: the next one is 7 Oct, AEDT.
    const now = new Date("2026-09-30T09:00:00Z");
    expect(nextMelbourneWeekly(now, WEDNESDAY, 19).toISOString()).toBe("2026-10-07T08:00:00.000Z");
  });

  it("uses Melbourne's weekday, not UTC's", () => {
    // Thursday 1 Oct 2026, 1 am AEST is still Wednesday in UTC.
    const now = new Date("2026-09-30T15:00:00Z");
    expect(nextMelbourneWeekly(now, WEDNESDAY, 19).toISOString()).toBe("2026-10-07T08:00:00.000Z");
  });
});
