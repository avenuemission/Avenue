import { describe, expect, it } from "vitest";
import { advanceFlags, flagsSignature, momentCopy, pickMoment, shouldGlow } from "./moments";

describe("advanceFlags", () => {
  it("only records a baseline the first time", () => {
    expect(advanceFlags(null, { sharedYes: true })).toEqual({ seen: { sharedYes: true }, fired: [] });
  });
  it("fires a flag seen false and now true", () => {
    expect(advanceFlags({ sharedYes: false }, { sharedYes: true }).fired).toEqual(["sharedYes"]);
  });
  it("does not fire a flag that was already true, or turns false", () => {
    expect(advanceFlags({ sharedYes: true }, { sharedYes: true }).fired).toEqual([]);
    expect(advanceFlags({ sharedYes: true }, { sharedYes: false }).fired).toEqual([]);
  });
  it("baselines a flag that appears late (its data just loaded) without firing", () => {
    const first = advanceFlags(null, {});
    const second = advanceFlags(first.seen, { "walked:phase4": true });
    expect(second.fired).toEqual([]);
    expect(advanceFlags(second.seen, { "walked:phase4": true }).fired).toEqual([]);
  });
  it("keeps a flag it has seen when the flag drops out while reloading", () => {
    const seen = advanceFlags(null, { "walked:phase5": false }).seen;
    const reloading = advanceFlags(seen, {});
    expect(reloading.seen).toEqual({ "walked:phase5": false });
    expect(advanceFlags(reloading.seen, { "walked:phase5": true }).fired).toEqual(["walked:phase5"]);
  });
});

describe("flagsSignature", () => {
  it("ignores key order", () => {
    expect(flagsSignature({ a: true, b: false })).toBe(flagsSignature({ b: false, a: true }));
  });
  it("changes when a value changes", () => {
    expect(flagsSignature({ a: true })).not.toBe(flagsSignature({ a: false }));
  });
});

describe("pickMoment", () => {
  it("prefers a phase walked over a smaller milestone", () => {
    expect(pickMoment(["conversationBooked", "walked:phase2"])).toBe("walked:phase2");
  });
  it("returns the milestone when it is alone, and null for nothing or unknown keys", () => {
    expect(pickMoment(["sharedYes"])).toBe("sharedYes");
    expect(pickMoment([])).toBeNull();
    expect(pickMoment(["somethingElse"])).toBeNull();
  });
});

describe("momentCopy", () => {
  const today = new Date(2026, 8, 24);
  it("dates the yes to the Shared Call, as in the mockup", () => {
    expect(momentCopy("sharedYes", { today })).toEqual({
      title: "You said yes.",
      caption: "24 September 2026 · the Shared Call",
    });
  });
  it("names the phase walked", () => {
    expect(momentCopy("walked:phase3", { today }).title).toBe("Launch is walked.");
    expect(momentCopy("walked:phase1", { today }).caption).toBe("A streetlight is on, and it stays on.");
  });
  it("gives the launch date when it has one", () => {
    expect(momentCopy("launchDate", { today, launchDate: "2026-10-03" })).toEqual({
      title: "Your launch date is set.",
      caption: "Launching 3 October 2026",
    });
  });
  it("never contains an em dash", () => {
    const keys = ["walked:phase1", "walked:phase2", "walked:phase3", "walked:phase4", "walked:phase5", "sharedYes", "conversationBooked", "launchDate"] as const;
    for (const key of keys) {
      expect(JSON.stringify(momentCopy(key, { today, launchDate: "2026-10-03" }))).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe("shouldGlow", () => {
  it("glows when a lamp lights, not when it goes out", () => {
    expect(shouldGlow(null, "lit")).toBe(true);
    expect(shouldGlow("lit", null)).toBe(false);
    expect(shouldGlow("lit", "lit")).toBe(false);
  });
  it("glows when a number goes up, not down", () => {
    expect(shouldGlow(2, 3)).toBe(true);
    expect(shouldGlow(3, 2)).toBe(false);
    expect(shouldGlow(3, 3)).toBe(false);
  });
});
