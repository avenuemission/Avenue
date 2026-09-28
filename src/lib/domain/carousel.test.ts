import { describe, expect, it } from "vitest";
import { MAX_TRACK_PER_SCROLL, carouselOffset } from "./carousel";

const base = { cardWidth: 300, gap: 16, viewportWidth: 1440, scrollDistance: 1100 };

describe("carouselOffset", () => {
  it("slides the whole row when that stays under the speed cap", () => {
    // 8 cards: 1088 px to travel over 1100 px of scroll (under 1.5 px/px), so it moves its full length.
    expect(carouselOffset({ ...base, count: 8, progress: 1 })).toBe(8 * 316 - 1440);
  });

  it("never moves faster than the cap, however many images there are", () => {
    const full = carouselOffset({ ...base, count: 27, progress: 1 });
    expect(full).toBe(MAX_TRACK_PER_SCROLL * base.scrollDistance);
    expect(full / base.scrollDistance).toBeLessThanOrEqual(MAX_TRACK_PER_SCROLL);
  });

  it("is proportional to scroll progress and clamps progress to 0..1", () => {
    const half = carouselOffset({ ...base, count: 27, progress: 0.5 });
    expect(half).toBe(0.5 * MAX_TRACK_PER_SCROLL * base.scrollDistance);
    expect(carouselOffset({ ...base, count: 27, progress: -2 })).toBe(0);
    expect(carouselOffset({ ...base, count: 27, progress: 3 })).toBe(MAX_TRACK_PER_SCROLL * base.scrollDistance);
  });

  it("does not move when the row already fits on screen", () => {
    expect(carouselOffset({ ...base, count: 3, progress: 1 })).toBe(0);
  });
});
