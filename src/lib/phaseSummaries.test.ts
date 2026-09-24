import { describe, expect, it } from "vitest";
import {
  CHURCH_HEALTH_INTRO,
  churchHealthSummary,
  LEADER_HEALTH_INTRO,
  leaderHealthStartsOpen,
  leaderHealthStatus,
  leaderHealthSummary,
  multiplySummary,
  NOT_CHECKED_IN,
  SAVE_FAILED,
  SAVING,
} from "./phaseSummaries";

const week = (weekStart: string, relational: number, physical: number, mental: number, spiritual: number) => ({
  weekStart,
  relational,
  physical,
  mental,
  spiritual,
});

describe("leaderHealthSummary", () => {
  it("shows this week's four scores", () => {
    const checkins = [week("2026-09-21", 7, 5, 6, 8), week("2026-09-14", 1, 1, 1, 1)];
    expect(leaderHealthSummary(checkins, "2026-09-21")).toBe("This week: R 7 · P 5 · M 6 · S 8");
  });
  it("says not checked in when only older weeks exist", () => {
    expect(leaderHealthSummary([week("2026-09-14", 7, 5, 6, 8)], "2026-09-21")).toBe(NOT_CHECKED_IN);
    expect(NOT_CHECKED_IN).toBe("Not checked in this week");
  });
});

describe("leaderHealthStartsOpen", () => {
  it("opens when this week's check-in is not saved yet", () => {
    expect(leaderHealthStartsOpen([], "2026-09-21")).toBe(true);
    expect(leaderHealthStartsOpen([{ weekStart: "2026-09-14" }], "2026-09-21")).toBe(true);
  });
  it("starts closed once this week is saved", () => {
    expect(leaderHealthStartsOpen([{ weekStart: "2026-09-21" }], "2026-09-21")).toBe(false);
  });
});

describe("leaderHealthStatus", () => {
  it("says a save is in flight, and a failed save wins over the scores", () => {
    expect(leaderHealthStatus(NOT_CHECKED_IN, true, null)).toBe(SAVING);
    expect(SAVING).toBe("Saving...");
    expect(leaderHealthStatus("This week: R 7 · P 5 · M 6 · S 8", false, "Network down")).toBe(SAVE_FAILED);
    expect(SAVE_FAILED).toBe("Could not save. Open to try again.");
  });
  it("passes the summary through when nothing is saving or failed", () => {
    expect(leaderHealthStatus(NOT_CHECKED_IN, false, null)).toBe(NOT_CHECKED_IN);
  });
});

describe("churchHealthSummary", () => {
  it("counts each list separately; one person can sit in more than one", () => {
    const people = [
      { metrics: ["pathways" as const, "intersections" as const] },
      { metrics: ["pathways" as const] },
      { metrics: ["pathways" as const] },
    ];
    expect(churchHealthSummary(people)).toBe("Named: 3 · 1 · 0");
  });
  it("reads zero for every list when nobody is named", () => {
    expect(churchHealthSummary([])).toBe("Named: 0 · 0 · 0");
  });
});

describe("multiplySummary", () => {
  it("says nobody is sent out yet", () => {
    expect(multiplySummary({ people: 0, generations: 0 })).toBe("Nobody sent out yet");
  });
  it("uses the singular for one person and one generation", () => {
    expect(multiplySummary({ people: 1, generations: 1 })).toBe(
      "1 person multiplying through 1 generation below you"
    );
  });
  it("uses the plural otherwise", () => {
    expect(multiplySummary({ people: 5, generations: 2 })).toBe(
      "5 people multiplying through 2 generations below you"
    );
  });
});

describe("Growth intros", () => {
  it("keeps the two intros exactly as specced, with no em dash", () => {
    expect(LEADER_HEALTH_INTRO).toBe(
      "How you are doing, in four gauges from Dave Ferguson's Multiplier. One check-in a week."
    );
    expect(CHURCH_HEALTH_INTRO).toBe(
      "Who is moving in your community, in three lists: Pathways, Intersections, Streetlights."
    );
    expect(LEADER_HEALTH_INTRO + CHURCH_HEALTH_INTRO).not.toContain(String.fromCharCode(0x2014));
  });
});
