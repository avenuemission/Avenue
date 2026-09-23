import { describe, expect, it } from "vitest";
import { rungAfterTap } from "./apprentice";

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
