import { describe, expect, it } from "vitest";
import { STAR_COUNTS, starField } from "./stars";

describe("starField", () => {
  it("is deterministic", () => {
    expect(starField(30, 440)).toEqual(starField(30, 440));
  });

  it("uses the mockup's star counts per scene", () => {
    expect(STAR_COUNTS).toEqual({ pathways: 28, intersection: 30, streetlights: 30 });
    expect(starField(STAR_COUNTS.pathways, 230)).toHaveLength(28);
    expect(starField(STAR_COUNTS.intersection, 440)).toHaveLength(30);
    expect(starField(STAR_COUNTS.streetlights, 200)).toHaveLength(30);
  });

  it("keeps every star inside the sky band with the mockup's size and opacity ranges", () => {
    for (const s of starField(30, 200)) {
      expect(s.cx).toBeGreaterThanOrEqual(0);
      expect(s.cx).toBeLessThanOrEqual(600);
      expect(s.cy).toBeGreaterThanOrEqual(0);
      expect(s.cy).toBeLessThanOrEqual(200);
      expect(s.r).toBeGreaterThanOrEqual(0.4);
      expect(s.r).toBeLessThanOrEqual(1.4);
      expect(s.opacity).toBeGreaterThanOrEqual(0.2);
      expect(s.opacity).toBeLessThanOrEqual(0.7);
    }
  });

  it("places the first star where the mockup does (seed 7)", () => {
    const [first] = starField(1, 230);
    expect(first.cx).toBe(Number((((7 * 9301 + 49297) % 233280) / 233280 * 600).toFixed(1)));
  });
});
