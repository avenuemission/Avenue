import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginResetEpoch,
  isResetting,
  RESET_COPY,
  RESET_FINAL,
  RESET_LEAD,
  resetEnded,
  resetEpoch,
  resetStarted,
  saveEnded,
  saveStarted,
  savesInFlight,
  waitForIdle,
} from "./worksheetReset";

afterEach(() => {
  vi.useRealTimers();
});

describe("reset dialog copy", () => {
  it("says exactly what Reset Calling wipes and keeps", () => {
    expect(RESET_COPY.calling).toEqual({
      button: "Reset Calling",
      title: "Reset Calling?",
      wiped: [
        "Your answers in all six Calling sections",
        "Your APEST results and the AI reflection",
        "Your Calling Profile, which is made from those answers",
      ],
      kept: "People on My People are kept.",
      confirm: "Yes, reset Calling",
    });
  });
  it("says exactly what Reset Launch wipes and keeps", () => {
    expect(RESET_COPY.launch).toEqual({
      button: "Reset Launch",
      title: "Reset Launch?",
      wiped: [
        "Your answers in all seven Launch steps",
        "Your Arena run",
        "Your Launch Plan, including the actions you ticked",
      ],
      kept: "People on My People are kept.",
      confirm: "Yes, reset Launch",
    });
  });
  it("ends with the spec's warning and uses no em dash", () => {
    expect(RESET_LEAD).toBe("This wipes:");
    expect(RESET_FINAL).toBe("This can't be undone.");
    expect(JSON.stringify(RESET_COPY) + RESET_LEAD + RESET_FINAL).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("waitForIdle", () => {
  it("resolves at once when no save is in flight", async () => {
    await expect(waitForIdle(() => false, 1000)).resolves.toBeUndefined();
  });
  it("waits until the in-flight save lands", async () => {
    vi.useFakeTimers();
    const inFlight = new Set(["layers"]);
    let done = false;
    const waiting = waitForIdle(() => inFlight.size > 0, 15_000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(200);
    expect(done).toBe(false);
    inFlight.clear();
    await vi.advanceTimersByTimeAsync(50);
    expect(done).toBe(true);
    await waiting;
  });
  it("gives up loud after the timeout", async () => {
    vi.useFakeTimers();
    const waiting = waitForIdle(() => true, 1000);
    const failed = expect(waiting).rejects.toThrow("A save is still running, so nothing was reset. Try again.");
    await vi.advanceTimersByTimeAsync(1100);
    await failed;
  });
});

describe("page-wide save bookkeeping", () => {
  it("counts saves on the wire per kind and fails loud on an unmatched end", () => {
    saveStarted("calling");
    saveStarted("calling");
    saveEnded("calling");
    expect(savesInFlight("calling")).toBe(1);
    expect(savesInFlight("launch")).toBe(0);
    saveEnded("calling");
    expect(savesInFlight("calling")).toBe(0);
    expect(() => saveEnded("calling")).toThrow("saveEnded(calling) without a matching saveStarted");
  });
  it("moves the reset epoch for one kind only", () => {
    const calling = resetEpoch("calling");
    const launch = resetEpoch("launch");
    expect(beginResetEpoch("calling")).toBe(calling + 1);
    expect(resetEpoch("calling")).toBe(calling + 1);
    expect(resetEpoch("launch")).toBe(launch);
  });
  it("flags a running reset per kind and fails loud on an unmatched end", () => {
    expect(isResetting("calling")).toBe(false);
    resetStarted("calling");
    expect(isResetting("calling")).toBe(true);
    expect(isResetting("launch")).toBe(false);
    resetEnded("calling");
    expect(isResetting("calling")).toBe(false);
    expect(() => resetEnded("calling")).toThrow("resetEnded(calling) without a matching resetStarted");
  });
  it("a failed reset leaves the epoch where it was", () => {
    const before = resetEpoch("launch");
    resetStarted("launch");
    // the wait timed out or the DELETE failed: no beginResetEpoch
    resetEnded("launch");
    expect(resetEpoch("launch")).toBe(before);
    expect(isResetting("launch")).toBe(false);
  });
  it("a successful reset moves the epoch once, after the delete", () => {
    const before = resetEpoch("launch");
    resetStarted("launch");
    expect(resetEpoch("launch")).toBe(before);
    beginResetEpoch("launch");
    resetEnded("launch");
    expect(resetEpoch("launch")).toBe(before + 1);
    expect(isResetting("launch")).toBe(false);
  });
});
