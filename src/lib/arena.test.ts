import { describe, expect, it } from "vitest";
import {
  arenaPlanFrom,
  bitesFor,
  detectGaps,
  parseCounters,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type Curveball,
} from "./arena";

const choice = (label: string, counters: string) => ({ label, verdict: `${label} verdict`, counters, principle: `${label} principle`, anchor: `${label} anchor` });
const cb = (id: number, bitesIf: Curveball["bitesIf"], counters: string[]): Curveball => ({
  id,
  title: `Curveball ${id}`,
  when: "Month",
  situation: "Something happens.",
  bitesIfNote: "",
  bitesIf,
  choices: counters.map((c, i) => choice(`C${id}.${i}`, c)),
});
const CURVES: Curveball[] = [
  cb(1, ["noRhythm", "thinTeam"], ["Pathways +1", "No change", "Pathways +1, Streetlights +1", "Pathways -1"]),
  cb(2, ["noApprentice"], ["Pathways +1, leader capacity strained", "Streetlights +1", "No change", "No change"]),
  cb(3, [], ["Capacity restored", "Streetlights +1, capacity restored", "Capacity restored, Pathways +1", "Pathways -1, capacity drained"]),
];
const ORDER = [1, 2, 3];
const solidPlan: ArenaPlan = { teamCount: 3, missionGroup: "Nurses", hosting: "third", weeklyDay: "monday", weeklyTime: "19:30", apprenticeCount: 1 };

describe("parseCounters", () => {
  it("reads single and combined movements", () => {
    expect(parseCounters("Pathways +1")).toEqual({ delta: { pathways: 1, intersections: 0, streetlights: 0 }, capacity: null });
    expect(parseCounters("Pathways -1, Streetlights +2")).toEqual({ delta: { pathways: -1, intersections: 0, streetlights: 2 }, capacity: null });
    expect(parseCounters("Streetlights +1, Intersections +1")).toEqual({ delta: { pathways: 0, intersections: 1, streetlights: 1 }, capacity: null });
  });
  it("reads No change as nothing", () => {
    expect(parseCounters("No change")).toEqual({ delta: { pathways: 0, intersections: 0, streetlights: 0 }, capacity: null });
  });
  it("reads the capacity notes in any case and position", () => {
    expect(parseCounters("Pathways +1, leader capacity strained").capacity).toBe("strained");
    expect(parseCounters("Capacity restored")).toEqual({ delta: { pathways: 0, intersections: 0, streetlights: 0 }, capacity: "restored" });
    expect(parseCounters("Capacity restored, Pathways +1")).toEqual({ delta: { pathways: 1, intersections: 0, streetlights: 0 }, capacity: "restored" });
    expect(parseCounters("Pathways -1, capacity drained").capacity).toBe("drained");
  });
  it("fails loudly on anything it does not recognise", () => {
    expect(() => parseCounters("Pathways up")).toThrow('Unrecognised counter text "Pathways up"');
    expect(() => parseCounters("Reputation +1")).toThrow();
  });
});

describe("detectGaps", () => {
  it("finds nothing in a solid plan", () => expect(detectGaps(solidPlan)).toEqual([]));
  it("finds every gap, in a fixed order", () => {
    expect(detectGaps({ teamCount: 1, missionGroup: " ", hosting: "first", weeklyDay: "", weeklyTime: "", apprenticeCount: 0 })).toEqual([
      "thinTeam",
      "noMissionGroup",
      "homeHosting",
      "noRhythm",
      "noApprentice",
    ]);
  });
  it("does not claim a missing apprentice when the network did not load", () => {
    expect(detectGaps({ ...solidPlan, apprenticeCount: null })).toEqual([]);
  });
});

describe("arenaPlanFrom", () => {
  it("reads the plan out of the launch worksheet", () => {
    expect(
      arenaPlanFrom(
        {
          team: { personIds: ["a", "b", "b"] },
          mission: { who: "Nurses" },
          space: { hosting: "first", place: "Home" },
          rhythm: { weeklyDay: "monday", weeklyTime: "19:30" },
        },
        2
      )
    ).toEqual({ teamCount: 2, missionGroup: "Nurses", hosting: "first", weeklyDay: "monday", weeklyTime: "19:30", apprenticeCount: 2 });
    expect(arenaPlanFrom({}, null)).toEqual({ teamCount: 0, missionGroup: "", hosting: null, weeklyDay: "", weeklyTime: "", apprenticeCount: null });
  });
});

describe("playArena", () => {
  it("starts at zero and unfinished", () => {
    expect(playArena(CURVES, ORDER, [])).toEqual({
      counters: { pathways: 0, intersections: 0, streetlights: 0 },
      capacity: null,
      earned: [],
      month: 0,
      finished: false,
    });
  });
  it("never lets a counter drop below zero", () => {
    expect(playArena(CURVES, ORDER, [{ curveball: 1, choice: 3 }]).counters.pathways).toBe(0);
  });
  it("adds movements, tracks the latest capacity note and lists principles in the order earned", () => {
    const s = playArena(CURVES, ORDER, [
      { curveball: 1, choice: 2 },
      { curveball: 2, choice: 0 },
      { curveball: 3, choice: 1 },
    ]);
    expect(s.counters).toEqual({ pathways: 2, intersections: 0, streetlights: 2 });
    expect(s.capacity).toBe("restored");
    expect(s.earned.map((e) => e.principle)).toEqual(["C1.2 principle", "C2.0 principle", "C3.1 principle"]);
    expect(s.earned[0]).toEqual({ month: 1, curveball: 1, choiceLabel: "C1.2", principle: "C1.2 principle", anchor: "C1.2 anchor" });
    expect(s.finished).toBe(true);
  });
  it("applies the floor after each month, not only at the end", () => {
    // -1 at zero stays 0, then +1 makes 1 (not 0).
    const s = playArena(CURVES, ORDER, [
      { curveball: 1, choice: 3 },
      { curveball: 2, choice: 0 },
    ]);
    expect(s.counters.pathways).toBe(1);
  });
  it("fails loudly on picks that do not follow the order", () => {
    expect(() => playArena(CURVES, ORDER, [{ curveball: 2, choice: 0 }])).toThrow("Month 1 should be curveball 1, got 2");
    expect(() => playArena(CURVES, ORDER, [{ curveball: 1, choice: 4 }])).toThrow("Curveball 1 has no choice 4");
    expect(() => playArena(CURVES, [1, 9], [{ curveball: 1, choice: 0 }, { curveball: 9, choice: 0 }])).toThrow("Unknown curveball 9");
    expect(() => playArena(CURVES, [1], [{ curveball: 1, choice: 0 }, { curveball: 2, choice: 0 }])).toThrow("More picks than months");
  });
});

describe("bitesFor and thinSpots", () => {
  it("returns only the curveball's gaps the plan actually has", () => {
    expect(bitesFor(CURVES[0], ["thinTeam", "noApprentice"])).toEqual(["thinTeam"]);
    expect(bitesFor(CURVES[2], ["thinTeam"])).toEqual([]);
  });
  it("counts how many months each gap made harder", () => {
    expect(thinSpots(CURVES, ORDER, ["noApprentice", "homeHosting"])).toEqual([
      { gap: "homeHosting", monthsHarder: 0 },
      { gap: "noApprentice", monthsHarder: 1 },
    ]);
  });
  it("writes the thin line plainly", () => {
    expect(thinSentence({ gap: "noApprentice", monthsHarder: 0 })).toBe("You have not named an apprentice.");
    expect(thinSentence({ gap: "noApprentice", monthsHarder: 1 })).toBe("You have not named an apprentice. It made one of your months harder.");
    expect(thinSentence({ gap: "noApprentice", monthsHarder: 3 })).toBe("You have not named an apprentice. It made 3 of your months harder.");
  });
});
