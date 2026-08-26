import { describe, expect, it } from "vitest";
import { mondayOf, recentMondays } from "./weeks";

describe("weeks", () => {
  describe("mondayOf", () => {
    it("maps a Wednesday to that week's Monday", () => {
      // 2026-08-26 is a Wednesday
      const result = mondayOf(new Date(2026, 7, 26));
      expect(result).toBe("2026-08-24");
    });

    it("maps a Monday to itself", () => {
      // 2026-08-24 is a Monday
      const result = mondayOf(new Date(2026, 7, 24));
      expect(result).toBe("2026-08-24");
    });

    it("maps a Sunday to the Monday six days earlier", () => {
      // 2026-08-23 is a Sunday
      // Should map to 2026-08-17 (the Monday of that week)
      const result = mondayOf(new Date(2026, 7, 23));
      expect(result).toBe("2026-08-17");
    });

    it("maps a date in early month across month boundary", () => {
      // 2026-09-02 is a Wednesday in September
      // Monday of that week is 2026-08-31 (in August)
      const result = mondayOf(new Date(2026, 8, 2));
      expect(result).toBe("2026-08-31");
    });

    it("maps a date in early January across year boundary", () => {
      // 2026-01-07 is a Wednesday
      // Monday of that week is 2026-01-05
      const result = mondayOf(new Date(2026, 0, 7));
      expect(result).toBe("2026-01-05");
    });

    it("maps a date in early January across year boundary when it crosses to previous year", () => {
      // 2026-01-03 is a Saturday
      // Monday of that week is 2025-12-29 (in previous year)
      const result = mondayOf(new Date(2026, 0, 3));
      expect(result).toBe("2025-12-29");
    });

    it("uses local date parts, not UTC (late evening crossing midnight UTC)", () => {
      // This test validates that we use local date parts, not UTC.
      // Create a date at 22:00 on a Monday (Australia is UTC+10 or +11).
      // If the implementation uses UTC, and it is already Tuesday UTC,
      // the test would incorrectly map to the following Monday.
      // We construct a date such that locally it is Monday evening,
      // but in UTC it is already Tuesday.
      // For example: Monday 2026-08-24 22:00 local (Melbourne UTC+10)
      // is Tuesday 2026-08-25 12:00 UTC.
      // Using toISOString or getUTCDay would read Tuesday and map to the wrong Monday.
      const localMonday = new Date(2026, 7, 24, 22, 0, 0);
      const result = mondayOf(localMonday);
      // Despite being Tuesday in UTC, the local date is Monday,
      // so it should map to itself
      expect(result).toBe("2026-08-24");
    });
  });

  describe("recentMondays", () => {
    it("returns the specified count of Mondays, newest first", () => {
      // Using 2026-08-26 (Wednesday) as reference
      // Most recent Monday is 2026-08-24
      const result = recentMondays(4, new Date(2026, 7, 26));
      expect(result).toHaveLength(4);
      expect(result[0]).toBe("2026-08-24");
      expect(result[1]).toBe("2026-08-17");
      expect(result[2]).toBe("2026-08-10");
      expect(result[3]).toBe("2026-08-03");
    });

    it("returns Mondays exactly seven days apart", () => {
      const result = recentMondays(5, new Date(2026, 7, 26));
      for (let i = 0; i < result.length - 1; i++) {
        const currentDate = new Date(result[i]);
        const nextDate = new Date(result[i + 1]);
        const diffMs = currentDate.getTime() - nextDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(7);
      }
    });

    it("starts with the Monday of the given date's week", () => {
      // 2026-08-26 is a Wednesday
      // Monday of that week is 2026-08-24
      const result = recentMondays(1, new Date(2026, 7, 26));
      expect(result[0]).toBe("2026-08-24");
    });

    it("includes the Monday when the given date is already a Monday", () => {
      // 2026-08-24 is a Monday
      const result = recentMondays(3, new Date(2026, 7, 24));
      expect(result[0]).toBe("2026-08-24");
      expect(result[1]).toBe("2026-08-17");
      expect(result[2]).toBe("2026-08-10");
    });

    it("returns empty array when count is 0", () => {
      const result = recentMondays(0, new Date(2026, 7, 26));
      expect(result).toEqual([]);
    });
  });
});
