import { describe, expect, it } from "vitest";
import { buildPlanActions, formatIsoDate, gapActions, gatheringsInFirstSixMonths, weeksUntil } from "./launch";

const today = new Date(2026, 8, 24); // 24 September 2026, local time

describe("weeksUntil", () => {
  it("rounds part weeks up", () => {
    expect(weeksUntil("2026-10-05", today)).toBe(2);
    expect(weeksUntil("2026-10-01", today)).toBe(1);
  });
  it("is 0 on or after the date", () => {
    expect(weeksUntil("2026-09-24", today)).toBe(0);
    expect(weeksUntil("2026-09-20", today)).toBe(0);
  });
  it("is null for a bad date", () => expect(weeksUntil("soon", today)).toBeNull());
});

describe("gatheringsInFirstSixMonths", () => {
  // 1 March 2027 is a Monday; six calendar months later is 1 September 2027 (184 days).
  it("counts the launch day itself when it falls on the weekly day", () => {
    expect(gatheringsInFirstSixMonths("2027-03-01", "monday")).toBe(27);
    expect(gatheringsInFirstSixMonths("2027-03-01", "tuesday")).toBe(27);
    expect(gatheringsInFirstSixMonths("2027-03-01", "sunday")).toBe(26);
  });
  it("is null for a bad date", () => expect(gatheringsInFirstSixMonths("2027-02-30", "monday")).toBeNull());
});

describe("formatIsoDate", () => {
  it("writes the day, month name and year", () => expect(formatIsoDate("2026-10-05")).toBe("5 October 2026"));
  it("returns the input unchanged when it is not a date", () => expect(formatIsoDate("soon")).toBe("soon"));
});

describe("buildPlanActions", () => {
  it("quotes the leader's own words, in plan order", () => {
    const actions = buildPlanActions({
      prayer: { when: "Fridays in October", teamPrayer: "Every Sunday night" },
      mission: { who: "Young nurses", gather: "The hospital cafe" },
      space: { hosting: "third", place: "Fika" },
      intentional: { commitments: ["Coffee on Tuesdays", " ", "Join the run club"], needPosition: "Ask for help moving house" },
      rhythm: { launchDate: "2026-11-02", weeklyDay: "monday", weeklyTime: "19:30" },
      invite: { tracking: "A shared note", shepherding: "Sam checks on newcomers" },
    });
    expect(actions.map((a) => a.id)).toEqual([
      "pray", "team-prayer", "gather", "place", "commit-0", "commit-2", "need", "launch-date", "tracking", "shepherding",
    ]);
    expect(actions[0].text).toBe("Pray and fast about the launch: “Fridays in October”");
    expect(actions[7].text).toBe("Tell friends and family your launch date: 2 November 2026");
  });
  it("is empty for an empty plan", () => expect(buildPlanActions({})).toEqual([]));
});

describe("gapActions", () => {
  it("gives one tickable action per gap", () => {
    expect(gapActions(["noApprentice"])).toEqual([
      { id: "gap-noApprentice", text: "Name one person and start them on the first rung: I do, you watch." },
    ]);
  });
});
