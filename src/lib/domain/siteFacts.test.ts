import { describe, expect, it } from "vitest";
import {
  hourLabel,
  melbourneIsoAt,
  nextPrayerAndPraise,
  nextPrayerAndPraiseTimes,
  PRAYER_AND_PRAISE_WHEN,
  SOCIAL_PROFILES,
  VENUE_LINE,
} from "./siteFacts";

describe("site facts", () => {
  it("formats the venue and the time in plain English", () => {
    expect(VENUE_LINE).toBe("Mont Albert Church, 43 York St, Surrey Hills VIC 3127");
    expect(PRAYER_AND_PRAISE_WHEN).toBe("Wednesdays, 7 pm to 9 pm");
  });

  it("labels hours on a 12-hour clock", () => {
    expect([0, 9, 12, 19, 23].map(hourLabel)).toEqual(["12 am", "9 am", "12 pm", "7 pm", "11 pm"]);
    expect(() => hourLabel(24)).toThrow();
    expect(() => hourLabel(7.5)).toThrow();
  });

  it("lists the social profiles but not the calendar", () => {
    expect(SOCIAL_PROFILES.map((p) => p.name)).toEqual(["Instagram", "Facebook", "YouTube", "LinkedIn"]);
    expect(SOCIAL_PROFILES.some((p) => p.url.includes("calendar"))).toBe(false);
  });

  it("finds the next Wednesday 7 pm in Melbourne", () => {
    // Tuesday 29 Sep 2026, noon in Melbourne (UTC+10).
    expect(nextPrayerAndPraise(new Date("2026-09-29T02:00:00Z")).toISOString()).toBe("2026-09-30T09:00:00.000Z");
    // Wednesday 30 Sep, 7 pm sharp: that one has started, so the next week's.
    expect(nextPrayerAndPraise(new Date("2026-09-30T09:00:00Z")).toISOString()).toBe("2026-10-07T08:00:00.000Z");
  });

  it("writes Melbourne times with the offset of the day, across daylight saving", () => {
    expect(melbourneIsoAt("2026-09-30", 19)).toBe("2026-09-30T19:00:00+10:00");
    expect(melbourneIsoAt("2026-10-07", 19)).toBe("2026-10-07T19:00:00+11:00");
    expect(melbourneIsoAt("2026-10-07", 9)).toBe("2026-10-07T09:00:00+11:00");
  });

  it("gives the start and end of the next Prayer & Praise", () => {
    expect(nextPrayerAndPraiseTimes(new Date("2026-10-01T00:00:00Z"))).toEqual({
      start: "2026-10-07T19:00:00+11:00",
      end: "2026-10-07T21:00:00+11:00",
    });
  });
});
