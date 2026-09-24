import { describe, expect, it } from "vitest";
import { timeLeftUntil } from "./countdown";

describe("timeLeftUntil", () => {
  const now = new Date("2026-09-30T00:00:00Z");
  it("splits the time left into days, hours, minutes and seconds", () => {
    const target = new Date(now.getTime() + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000 + 999);
    expect(timeLeftUntil(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("is all zeros at and after the target", () => {
    const zero = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    expect(timeLeftUntil(now, now)).toEqual(zero);
    expect(timeLeftUntil(new Date(now.getTime() - 1000), now)).toEqual(zero);
  });
});
