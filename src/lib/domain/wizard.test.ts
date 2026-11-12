import { describe, expect, it } from "vitest";
import { firstIncompleteIndex, minutesLeft, progressLabel, stepFromParam, timeLabel, totalMinutes, type WizardStepMeta } from "./wizard";

const steps: WizardStepMeta[] = [
  { id: "a", title: "A", minutes: 5, complete: true },
  { id: "b", title: "B", minutes: 10, complete: false },
  { id: "c", title: "C", minutes: 15, complete: false },
];
const done = steps.map((s) => ({ ...s, complete: true }));

describe("firstIncompleteIndex", () => {
  it("finds the first incomplete step", () => expect(firstIncompleteIndex(steps)).toBe(1));
  it("opens the first step when everything is complete", () => expect(firstIncompleteIndex(done)).toBe(0));
  it("opens the first step for an empty list", () => expect(firstIncompleteIndex([])).toBe(0));
});

describe("minutes", () => {
  it("totals every step", () => expect(totalMinutes(steps)).toBe(30));
  it("counts only incomplete steps as left", () => expect(minutesLeft(steps)).toBe(25));
});

describe("labels", () => {
  it("reads STEP n OF m, one-based", () => expect(progressLabel(2, 9)).toBe("STEP 3 OF 9"));
  it("shows total and left", () => expect(timeLabel(steps)).toBe("~30 MIN · ~25 LEFT"));
  it("shows DONE when nothing is left", () => expect(timeLabel(done)).toBe("~30 MIN · DONE"));
});

describe("stepFromParam", () => {
  it("turns a one-based step into an index", () => expect(stepFromParam("3", 9)).toBe(2));
  it("ignores out-of-range and junk", () => {
    expect(stepFromParam("0", 9)).toBeNull();
    expect(stepFromParam("10", 9)).toBeNull();
    expect(stepFromParam("x", 9)).toBeNull();
    expect(stepFromParam("2.5", 9)).toBeNull();
    expect(stepFromParam(null, 9)).toBeNull();
  });
});
