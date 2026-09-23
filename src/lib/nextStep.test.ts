import { describe, expect, it } from "vitest";
import { nextStep } from "./nextStep";

const base = { foundationsDone: 4, foundationsTotal: 4, callingDone: 6, launchDone: 7, checkedInThisWeek: true };

describe("nextStep", () => {
  it("starts with Foundations", () => {
    expect(nextStep({ ...base, foundationsDone: 0 })).toEqual({
      id: "foundations",
      title: "Finish Foundations",
      body: "0 of 4 modules done.",
      button: "Start Foundations",
      href: "/leaders/training?phase=phase1",
    });
    expect(nextStep({ ...base, foundationsDone: 2 }).button).toBe("Continue Foundations");
  });
  it("then Calling", () => {
    expect(nextStep({ ...base, callingDone: 0 })).toEqual({
      id: "calling",
      title: "Discover your Calling",
      body: "0 of 6 sections done.",
      button: "Start Calling",
      href: "/leaders/training/calling",
    });
    expect(nextStep({ ...base, callingDone: 3 }).button).toBe("Continue Calling");
  });
  it("then Launch", () => {
    expect(nextStep({ ...base, launchDone: 2 })).toEqual({
      id: "launch",
      title: "Plan your launch",
      body: "2 of 7 steps done.",
      button: "Continue Launch",
      href: "/leaders/training/launch",
    });
  });
  it("then this week's check-in", () => {
    expect(nextStep({ ...base, checkedInThisWeek: false }).id).toBe("checkin");
    expect(nextStep({ ...base, checkedInThisWeek: false }).href).toBe("/leaders/training?phase=phase4");
  });
  it("says up to date when everything is done", () => {
    expect(nextStep(base).id).toBe("done");
  });
  it("puts an unfinished earlier phase first even when later ones are done", () => {
    expect(nextStep({ ...base, foundationsDone: 3, checkedInThisWeek: false }).id).toBe("foundations");
  });
});
