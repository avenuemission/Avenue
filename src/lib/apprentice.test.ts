import { describe, expect, it } from "vitest";
import { APPRENTICE_HOW_TO, APPRENTICE_STEPS, apprenticeStepLabel, rungAfterTap } from "./apprentice";

describe("rungAfterTap", () => {
  it("sets the tapped rung", () => {
    expect(rungAfterTap(0, 1)).toBe(1);
    expect(rungAfterTap(2, 4)).toBe(4);
    expect(rungAfterTap(4, 2)).toBe(2);
  });
  it("steps back one when the current top rung is tapped again", () => {
    expect(rungAfterTap(3, 3)).toBe(2);
    expect(rungAfterTap(1, 1)).toBe(0);
  });
  it("refuses a rung outside 1 to 5", () => {
    expect(() => rungAfterTap(0, 0)).toThrow("rung must be 1 to 5, got 0");
    expect(() => rungAfterTap(0, 6)).toThrow("rung must be 1 to 5, got 6");
  });
});

describe("apprentice rung labels", () => {
  it("names every rung, falls back to not started, and has a how-to for rungs 1 to 5", () => {
    expect(APPRENTICE_STEPS.map((s) => s.value)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(apprenticeStepLabel(1)).toBe("I do, you watch");
    expect(apprenticeStepLabel(5)).toBe("You do, someone else watches");
    expect(apprenticeStepLabel(9)).toBe("Not started yet");
    for (const rung of [1, 2, 3, 4, 5]) {
      expect(APPRENTICE_HOW_TO[rung]).toMatch(/\.$/);
      expect(APPRENTICE_HOW_TO[rung]).not.toContain(String.fromCharCode(0x2014));
    }
  });
});
