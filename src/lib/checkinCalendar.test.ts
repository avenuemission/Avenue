import { describe, expect, it } from "vitest";
import { canShift, compareMonths, monthBounds, monthWeeks, shiftMonth, type MonthBounds } from "./checkinCalendar";

const SEPT_2026 = { year: 2026, month: 8 };
const entry = (weekStart: string) => ({ weekStart, relational: 7, physical: 5, mental: 6, spiritual: 8 });

describe("monthWeeks", () => {
  it("starts September 2026 on Monday 31 August and gives five rows of seven days", () => {
    const weeks = monthWeeks(SEPT_2026, [], "2026-09-21");
    expect(weeks.map((w) => w.weekStart)).toEqual([
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
    for (const w of weeks) expect(w.days).toHaveLength(7);
    expect(weeks[0].days.map((d) => d.day)).toEqual([31, 1, 2, 3, 4, 5, 6]);
    expect(weeks[0].days[1].iso).toBe("2026-09-01");
  });
  it("marks the days that fall outside the month", () => {
    const weeks = monthWeeks(SEPT_2026, [], "2026-09-21");
    expect(weeks[0].days.map((d) => d.inMonth)).toEqual([false, true, true, true, true, true, true]);
    expect(weeks[4].days.map((d) => d.day)).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(weeks[4].days.map((d) => d.inMonth)).toEqual([true, true, true, false, false, false, false]);
  });
  it("needs six rows for March 2026, which starts on a Sunday", () => {
    const weeks = monthWeeks({ year: 2026, month: 2 }, [], "2026-09-21");
    expect(weeks.map((w) => w.weekStart)).toEqual([
      "2026-02-23",
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
    ]);
  });
  it("starts June 2026 on its own first day, which is a Monday", () => {
    const weeks = monthWeeks({ year: 2026, month: 5 }, [], "2026-09-21");
    expect(weeks[0].weekStart).toBe("2026-06-01");
    expect(weeks[0].days[0].inMonth).toBe(true);
    expect(weeks).toHaveLength(5);
  });
  it("attaches each week's check-in and leaves the other weeks empty", () => {
    const checkin = entry("2026-09-14");
    const weeks = monthWeeks(SEPT_2026, [checkin, entry("2026-06-01")], "2026-09-21");
    expect(weeks.map((w) => w.checkin)).toEqual([null, null, checkin, null, null]);
  });
  it("flags the current week and the weeks after it", () => {
    const weeks = monthWeeks(SEPT_2026, [], "2026-09-21");
    expect(weeks.map((w) => w.isCurrent)).toEqual([false, false, false, true, false]);
    expect(weeks.map((w) => w.isFuture)).toEqual([false, false, false, false, true]);
  });
});

describe("monthBounds", () => {
  const today = new Date(2026, 8, 24);
  it("goes back twelve weeks (to July 2026) and forward to this month when no check-in is older", () => {
    expect(monthBounds(["2026-09-14"], today)).toEqual({ min: { year: 2026, month: 6 }, max: SEPT_2026 });
  });
  it("reaches back to the month of an older check-in", () => {
    expect(monthBounds(["2026-09-21", "2026-03-02"], today)).toEqual({
      min: { year: 2026, month: 2 },
      max: SEPT_2026,
    });
  });
});

describe("month navigation", () => {
  it("shifts across the year boundary both ways", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 });
    expect(compareMonths({ year: 2026, month: 0 }, { year: 2025, month: 11 })).toBe(1);
  });
  it("stops at both bounds", () => {
    const bounds: MonthBounds = { min: { year: 2026, month: 6 }, max: SEPT_2026 };
    expect(canShift(SEPT_2026, 1, bounds)).toBe(false);
    expect(canShift(SEPT_2026, -1, bounds)).toBe(true);
    expect(canShift({ year: 2026, month: 6 }, -1, bounds)).toBe(false);
    expect(canShift({ year: 2026, month: 6 }, 1, bounds)).toBe(true);
  });
});
