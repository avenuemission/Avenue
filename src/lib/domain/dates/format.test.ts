import { describe, expect, it } from "vitest";
import {
  formatDayMonth,
  formatEventDay,
  formatLong,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatWeekdayDayMonth,
} from "./format";

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

describe("calendar dates (YYYY-MM-DD)", () => {
  it("formats day and month, short or long", () => {
    expect(formatDayMonth("2026-08-14")).toBe("14 Aug");
    expect(formatDayMonth("2026-08-14", "long")).toBe("14 August");
  });

  it("formats the long date, the short date and the month", () => {
    expect(formatLong("2026-09-24")).toBe("24 September 2026");
    expect(formatShortDate("2026-08-04")).toBe("4 Aug 2026");
    expect(formatMonthYear("2026-09-01")).toBe("September 2026");
    expect(formatWeekdayDayMonth("2026-09-24")).toBe("Thursday 24 September");
  });

  it("shows the same calendar day in every machine time zone", () => {
    for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Australia/Melbourne"]) {
      expect(inZone(tz, () => formatLong("2026-01-01"))).toBe("1 January 2026");
    }
  });

  it("throws for text that is not a calendar date", () => {
    expect(() => formatLong("24/09/2026")).toThrow();
    expect(() => formatDayMonth("2026-02-31")).toThrow();
  });
});

describe("instants (shown in Melbourne time)", () => {
  // 9:30 am UTC on 30 Sep 2026 is 7:30 pm AEST.
  const instant = new Date("2026-09-30T09:30:00Z");

  it("reads the Melbourne calendar day and clock time", () => {
    expect(formatLong(instant)).toBe("30 September 2026");
    expect(formatTime(instant)).toBe("7:30 pm");
    expect(formatEventDay(instant)).toMatch(/^Wed,? 30 Sept? 2026$/);
  });

  it("is already the next day in Melbourne late in the UTC evening", () => {
    // 3 pm UTC on 30 Sep is 1 am on 1 Oct in Melbourne.
    expect(formatDayMonth(new Date("2026-09-30T15:00:00Z"), "long")).toBe("1 October");
  });

  it("does not depend on the machine's time zone", () => {
    for (const tz of ["UTC", "America/New_York", "Australia/Melbourne"]) {
      expect(inZone(tz, () => formatTime(instant))).toBe("7:30 pm");
    }
  });
});
