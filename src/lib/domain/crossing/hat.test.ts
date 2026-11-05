import { describe, expect, it } from "vitest";
import { wearsSantaHat } from "./hat";

describe("wearsSantaHat", () => {
  it("is on through the last minute of 2026 in Melbourne", () => {
    expect(wearsSantaHat(new Date("2026-11-05T02:00:00Z"))).toBe(true);
    expect(wearsSantaHat(new Date("2026-12-25T00:00:00Z"))).toBe(true);
    // 23:59 on 31 December in Melbourne (AEDT, UTC+11).
    expect(wearsSantaHat(new Date("2026-12-31T12:59:00Z"))).toBe(true);
  });

  it("comes off at midnight on 1 January 2027 in Melbourne, not UTC", () => {
    // 00:00 on 1 January in Melbourne is still 31 December in UTC.
    expect(wearsSantaHat(new Date("2026-12-31T13:00:00Z"))).toBe(false);
    expect(wearsSantaHat(new Date("2027-06-01T00:00:00Z"))).toBe(false);
    expect(wearsSantaHat(new Date("2027-12-25T00:00:00Z"))).toBe(false);
  });
});
