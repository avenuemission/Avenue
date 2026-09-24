import { describe, expect, it } from "vitest";
import { GAUGES } from "./rpms";

describe("GAUGES", () => {
  it("lists the four gauges in check-in order with their letters", () => {
    expect(GAUGES.map((g) => g.key)).toEqual(["relational", "physical", "mental", "spiritual"]);
    expect(GAUGES.map((g) => g.label)).toEqual(["Relational", "Physical", "Mental", "Spiritual"]);
    expect(GAUGES.map((g) => g.letter)).toEqual(["R", "P", "M", "S"]);
  });
  it("carries the spec's meaning line and a colour variable per gauge", () => {
    expect(GAUGES.map((g) => g.meaning)).toEqual([
      "Your closest relationships: family, friends, team",
      "Sleep, food, movement, rest",
      "Focus, stress, emotional load",
      "Time with God, prayer, the Word",
    ]);
    expect(GAUGES.map((g) => g.colour)).toEqual([
      "var(--g-relational)",
      "var(--g-physical)",
      "var(--g-mental)",
      "var(--g-spiritual)",
    ]);
  });
  it("contains no em dash", () => {
    expect(JSON.stringify(GAUGES)).not.toContain(String.fromCharCode(0x2014));
  });
});
