import { describe, expect, it } from "vitest";
import { APEST_ORDER, QUESTIONS, scoreApest, topRole, topTwoRoles } from "./apest";

const all = (n: number) => Array(QUESTIONS.length).fill(n) as number[];

describe("QUESTIONS", () => {
  it("has 20 questions, four per role", () => {
    expect(QUESTIONS).toHaveLength(20);
    for (const role of APEST_ORDER) expect(QUESTIONS.filter((q) => q.role === role)).toHaveLength(4);
  });
});

describe("scoreApest", () => {
  it("scores every 5 as 100 per role", () => {
    expect(scoreApest(all(5))).toEqual({ apostle: 100, prophet: 100, evangelist: 100, shepherd: 100, teacher: 100 });
  });
  it("scores every 1 as 20 per role", () => {
    expect(scoreApest(all(1))).toEqual({ apostle: 20, prophet: 20, evangelist: 20, shepherd: 20, teacher: 20 });
  });
  it("adds each role's four answers out of 20", () => {
    const answers = all(3);
    // Prophet questions sit at indices 1, 6, 11, 16.
    [5, 4, 3, 2].forEach((v, i) => (answers[1 + i * 5] = v));
    expect(scoreApest(answers)).toEqual({ apostle: 60, prophet: 70, evangelist: 60, shepherd: 60, teacher: 60 });
  });
  it("throws on the wrong number of answers", () => {
    expect(() => scoreApest([5, 5])).toThrow("Expected 20 answers, got 2");
  });
});

describe("topRole", () => {
  it("returns the highest role", () => {
    expect(topRole({ apostle: 20, prophet: 90, evangelist: 40, shepherd: 60, teacher: 50 })).toBe("prophet");
  });
  it("keeps the public page's tie rule: the later role wins a tie", () => {
    expect(topRole({ apostle: 50, prophet: 50, evangelist: 50, shepherd: 50, teacher: 50 })).toBe("teacher");
  });
});

describe("topTwoRoles", () => {
  it("returns the two highest", () => {
    expect(topTwoRoles({ apostle: 20, prophet: 90, evangelist: 40, shepherd: 60, teacher: 50 })).toEqual(["prophet", "shepherd"]);
  });
  it("breaks ties in APEST order", () => {
    expect(topTwoRoles({ apostle: 50, prophet: 50, evangelist: 50, shepherd: 50, teacher: 50 })).toEqual(["apostle", "prophet"]);
    expect(topTwoRoles({ apostle: 10, prophet: 10, evangelist: 10, shepherd: 90, teacher: 90 })).toEqual(["shepherd", "teacher"]);
  });
});
