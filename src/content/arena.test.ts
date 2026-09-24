import { describe, expect, it } from "vitest";
import { parseCounters } from "@/lib/domain/arena";
import { ARENA_ENABLED, CURVEBALLS, DEFAULT_ORDER } from "./arena";

describe("Arena content transcription", () => {
  it("is on for Henry's review (24 Sep)", () => expect(ARENA_ENABLED).toBe(true));
  it("has curveballs 1 to 10 in order with four choices each", () => {
    expect(CURVEBALLS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const c of CURVEBALLS) expect(c.choices).toHaveLength(4);
  });
  it("runs the default six in the drafted order", () => {
    expect([...DEFAULT_ORDER]).toEqual([1, 2, 4, 5, 8, 7]);
  });
  it("fills every field and every counters cell parses", () => {
    for (const c of CURVEBALLS) {
      expect(c.title && c.when && c.situation).toBeTruthy();
      for (const ch of c.choices) {
        expect(ch.label && ch.verdict && ch.counters && ch.principle && ch.anchor).toBeTruthy();
        expect(() => parseCounters(ch.counters)).not.toThrow();
      }
    }
  });
  it("matches the draft word for word at spot checks", () => {
    const byId = new Map(CURVEBALLS.map((c) => [c.id, c]));
    expect(byId.get(1)!.choices[0].principle).toBe("People do not leave groups, they leave being unnoticed.");
    expect(byId.get(2)!.choices[0].counters).toBe("Pathways +1, leader capacity strained");
    expect(byId.get(5)!.situation).toBe(
      "Twelve people in a room that seats eight. Two sat on the floor. Someone joked about needing a bigger house."
    );
    expect(byId.get(7)!.choices[1].counters).toBe("Streetlights +1, Intersections +1");
    expect(byId.get(8)!.choices[0].counters).toBe("Capacity restored");
    expect(byId.get(8)!.choices[3].counters).toBe("Pathways -1, capacity drained");
    expect(byId.get(9)!.choices[2].anchor).toBe("Acts 8, the Ethiopian asks what prevents me from being baptised");
    expect(byId.get(10)!.choices[3].principle).toBe("Avoiding the question is not unity, it is just quiet.");
    expect(byId.get(9)!.bitesIfNote).toBe("");
  });
  it("contains no em dash", () => expect(JSON.stringify(CURVEBALLS)).not.toContain(String.fromCharCode(0x2014)));
});
