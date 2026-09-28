import { describe, expect, it } from "vitest";
import { seconds, seededRandom } from "./seeded";

describe("seededRandom", () => {
  it("gives the same sequence for the same seed", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const xs = Array.from({ length: 20 }, () => a());
    const ys = Array.from({ length: 20 }, () => b());
    expect(xs).toEqual(ys);
  });

  it("matches the mockup's generator (seed * 9301 + 49297) mod 233280", () => {
    const rnd = seededRandom(7);
    expect(rnd()).toBeCloseTo((7 * 9301 + 49297) / 233280, 12);
  });

  it("stays in [0, 1) and differs between seeds", () => {
    const a = seededRandom(7);
    const b = seededRandom(11);
    const xs = Array.from({ length: 200 }, () => a());
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(b()).not.toBe(seededRandom(7)());
  });
});

describe("seconds", () => {
  it("formats a delay as a CSS time, rounded to hundredths", () => {
    expect(seconds(2.9 + 0.12 + 0.22)).toBe("3.24s");
    expect(seconds(0.2)).toBe("0.2s");
    expect(seconds(8)).toBe("8s");
  });
});
