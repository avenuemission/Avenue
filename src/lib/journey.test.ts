import { describe, expect, it } from "vitest";
import {
  CALLING_STATEMENT_IDS,
  callingCompleteCount,
  callingSectionComplete,
  filled,
  isIsoDate,
  isSpace,
  isTime,
  isWeekday,
  launchCompleteCount,
  launchStepComplete,
  layersScore,
  recordOf,
  stringList,
  textOf,
  type CallingData,
  type Layer,
  type LaunchData,
} from "./journey";

const allShared: Record<string, Layer> = Object.fromEntries(CALLING_STATEMENT_IDS.map((id) => [id, "shared"]));
const key: Record<string, Layer> = {
  s1: "shared", s2: "shared", s3: "shared",
  s4: "specific", s5: "specific", s6: "specific",
  s7: "seasonal", s8: "seasonal", s9: "seasonal",
};

const fullCalling: CallingData = {
  layers: { placements: key },
  callable: { willing: "unsure" },
  shared: { yes: true, date: "2026-09-24" },
  apest: { results: { apostle: 80, prophet: 40, evangelist: 60, shepherd: 70, teacher: 50 } },
  seasonal: { peopleGroup: "Young nurses in Parramatta", hostingSpace: "third" },
  conversation: { booked: true },
};

const fullLaunch: LaunchData = {
  prayer: { when: "Fridays in October" },
  mission: { who: "Young nurses" },
  space: { hosting: "third", place: "Fika cafe" },
  team: { personIds: ["p1", "p2"] },
  intentional: { commitments: ["Coffee on Tuesdays", "Join the run club", ""] },
  rhythm: { launchDate: "2026-11-02", weeklyDay: "monday", weeklyTime: "19:30" },
  invite: { tracking: "A shared note", shepherding: "Sam checks on the newcomers" },
};

describe("filled", () => {
  it("is true only for non-blank strings", () => {
    expect(filled(" a ")).toBe(true);
    expect(filled("   ")).toBe(false);
    expect(filled(3)).toBe(false);
    expect(filled(undefined)).toBe(false);
  });
});

describe("isIsoDate and isTime", () => {
  it("accepts real dates only", () => {
    expect(isIsoDate("2026-10-05")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("5/10/2026")).toBe(false);
  });
  it("accepts 24-hour HH:MM", () => {
    expect(isTime("19:30")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("7pm")).toBe(false);
  });
});

describe("callingSectionComplete", () => {
  it("layers needs all nine placed in a real layer", () => {
    expect(callingSectionComplete("layers", { layers: { placements: allShared } })).toBe(true);
    const eight = { ...allShared };
    delete eight.s9;
    expect(callingSectionComplete("layers", { layers: { placements: eight } })).toBe(false);
    expect(callingSectionComplete("layers", { layers: { placements: { ...allShared, s1: "other" as Layer } } })).toBe(false);
  });
  it("callable needs an answer to the willing question", () => {
    expect(callingSectionComplete("callable", { callable: { willing: "notYet" } })).toBe(true);
    expect(callingSectionComplete("callable", { callable: { crowding: "work" } })).toBe(false);
  });
  it("shared needs a yes", () => {
    expect(callingSectionComplete("shared", { shared: { yes: true } })).toBe(true);
    expect(callingSectionComplete("shared", { shared: { scenario: "dinner" } })).toBe(false);
  });
  it("apest needs all five results", () => {
    expect(callingSectionComplete("apest", fullCalling)).toBe(true);
    expect(callingSectionComplete("apest", { apest: { answers: [5, 5] } })).toBe(false);
  });
  it("seasonal needs a people group and a real hosting space", () => {
    expect(callingSectionComplete("seasonal", fullCalling)).toBe(true);
    expect(callingSectionComplete("seasonal", { seasonal: { peopleGroup: " ", hostingSpace: "first" } })).toBe(false);
    expect(callingSectionComplete("seasonal", { seasonal: { peopleGroup: "x", hostingSpace: "fourth" as never } })).toBe(false);
  });
  it("conversation needs booked", () => {
    expect(callingSectionComplete("conversation", { conversation: { booked: true } })).toBe(true);
    expect(callingSectionComplete("conversation", { conversation: { date: "2026-10-01" } })).toBe(false);
  });
  it("counts completed sections", () => {
    expect(callingCompleteCount({})).toBe(0);
    expect(callingCompleteCount(fullCalling)).toBe(6);
  });
});

describe("layersScore", () => {
  it("counts placements that match the key", () => {
    expect(layersScore(key, key)).toBe(9);
    expect(layersScore({ ...key, s1: "specific", s9: "shared" }, key)).toBe(7);
    expect(layersScore(undefined, key)).toBe(0);
  });
});

describe("launchStepComplete", () => {
  it("applies each step's required fields", () => {
    for (const id of ["prayer", "mission", "space", "team", "intentional", "rhythm", "invite"] as const) {
      expect(launchStepComplete(id, fullLaunch)).toBe(true);
      expect(launchStepComplete(id, {})).toBe(false);
    }
  });
  it("space needs both the hosting space and the place", () => {
    expect(launchStepComplete("space", { space: { hosting: "first" } })).toBe(false);
  });
  it("team needs two different people", () => {
    expect(launchStepComplete("team", { team: { personIds: ["p1", "p1"] } })).toBe(false);
    expect(launchStepComplete("team", { team: { personIds: ["p1"] } })).toBe(false);
  });
  it("intentional needs two written commitments", () => {
    expect(launchStepComplete("intentional", { intentional: { commitments: ["x", " "] } })).toBe(false);
  });
  it("rhythm needs a real date, day and time", () => {
    expect(launchStepComplete("rhythm", { rhythm: { ...fullLaunch.rhythm, launchDate: "2026-02-30" } })).toBe(false);
    expect(launchStepComplete("rhythm", { rhythm: { ...fullLaunch.rhythm, weeklyDay: "funday" as never } })).toBe(false);
    expect(launchStepComplete("rhythm", { rhythm: { ...fullLaunch.rhythm, weeklyTime: "7pm" } })).toBe(false);
  });
  it("counts completed steps", () => {
    expect(launchCompleteCount({})).toBe(0);
    expect(launchCompleteCount(fullLaunch)).toBe(7);
  });
});

describe("stored shape guards", () => {
  it("isSpace accepts only the three spaces", () => {
    expect(isSpace("first")).toBe(true);
    expect(isSpace("fourth")).toBe(false);
    expect(isSpace(1)).toBe(false);
    expect(isSpace({ first: true })).toBe(false);
  });
  it("isWeekday accepts only lower-case weekday names", () => {
    expect(isWeekday("monday")).toBe(true);
    expect(isWeekday("Monday")).toBe(false);
    expect(isWeekday(null)).toBe(false);
  });
  it("stringList keeps the strings of an array and drops anything else", () => {
    expect(stringList(["a", 2, null, "b"])).toEqual(["a", "b"]);
    expect(stringList("a")).toEqual([]);
    expect(stringList({ 0: "a" })).toEqual([]);
    expect(stringList(undefined)).toEqual([]);
  });
  it("textOf returns strings only", () => {
    expect(textOf("hi")).toBe("hi");
    expect(textOf(3)).toBe("");
    expect(textOf({ text: "hi" })).toBe("");
  });
  it("recordOf returns plain objects only", () => {
    expect(recordOf({ a: 1 })).toEqual({ a: 1 });
    expect(recordOf(["a"])).toEqual({});
    expect(recordOf("a")).toEqual({});
    expect(recordOf(null)).toEqual({});
  });
});
