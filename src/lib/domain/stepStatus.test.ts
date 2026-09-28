import { describe, expect, it } from "vitest";
import {
  arenaMonthStatus,
  callingSectionStatus,
  DOT_SR_TEXT,
  hasAnswer,
  launchStepStatus,
  launchWizardStepStatus,
  moduleStatus,
} from "./stepStatus";
import { LAUNCH_WIZARD_STEP_IDS } from "./journey";

describe("hasAnswer", () => {
  it("finds no answer in empty values", () => {
    for (const v of [undefined, null, false, "", "   ", [], {}, { a: "" }, { picks: [], done: false }, Number.NaN]) {
      expect(hasAnswer(v)).toBe(false);
    }
  });
  it("finds an answer in a non-blank string, a number or true", () => {
    for (const v of ["x", 0, 3, true]) expect(hasAnswer(v)).toBe(true);
  });
  it("looks inside arrays and objects", () => {
    expect(hasAnswer({ placements: { s1: "shared" } })).toBe(true);
    expect(hasAnswer({ answers: [4] })).toBe(true);
    expect(hasAnswer({ booked: false, date: "" })).toBe(false);
  });
});

describe("callingSectionStatus", () => {
  it("is off when nothing is saved for the section", () => {
    expect(callingSectionStatus("layers", {})).toBe("off");
    expect(callingSectionStatus("apest", { apest: { answers: [] } })).toBe("off");
  });
  it("is in progress when started but not complete", () => {
    expect(callingSectionStatus("layers", { layers: { placements: { s1: "shared" } } })).toBe("progress");
    expect(callingSectionStatus("apest", { apest: { answers: [3, 4] } })).toBe("progress");
    expect(callingSectionStatus("callable", { callable: { crowding: "Work" } })).toBe("progress");
  });
  it("is done by the existing completion rule", () => {
    expect(callingSectionStatus("callable", { callable: { willing: "yes" } })).toBe("done");
    expect(
      callingSectionStatus("apest", {
        apest: { results: { apostle: 1, prophet: 2, evangelist: 3, shepherd: 4, teacher: 5 } },
      })
    ).toBe("done");
  });
});

describe("launchStepStatus", () => {
  it("is off, in progress, then done for a planning step", () => {
    expect(launchStepStatus("prayer", {})).toBe("off");
    expect(launchStepStatus("prayer", { prayer: { who: "Sam" } })).toBe("progress");
    expect(launchStepStatus("prayer", { prayer: { when: "Mornings" } })).toBe("done");
  });
  it("counts one team member as started and two as done", () => {
    expect(launchStepStatus("team", { team: { personIds: ["a"] } })).toBe("progress");
    expect(launchStepStatus("team", { team: { personIds: ["a", "b"] } })).toBe("done");
  });
});

describe("launchWizardStepStatus", () => {
  it("treats the Arena as started once a month is picked and done when finished", () => {
    expect(launchWizardStepStatus("arena", { arena: { picks: [], done: false } }, true)).toBe("off");
    expect(
      launchWizardStepStatus("arena", { arena: { picks: [{ curveball: 1, choice: 0 }], done: false } }, true)
    ).toBe("progress");
    expect(launchWizardStepStatus("arena", { arena: { picks: [], done: true } }, true)).toBe("done");
  });
  it("counts the Arena as done while it is switched off, as the wizard does today", () => {
    expect(launchWizardStepStatus("arena", {}, false)).toBe("done");
  });
  it("lights Metrics once read, or for a leader who already started or finished the scenarios", () => {
    expect(launchWizardStepStatus("metrics", {}, true)).toBe("off");
    expect(launchWizardStepStatus("metrics", { metrics: { read: true } }, true)).toBe("done");
    expect(launchWizardStepStatus("metrics", { arena: { picks: [], done: true } }, true)).toBe("done");
    expect(
      launchWizardStepStatus("metrics", { arena: { picks: [{ curveball: 1, choice: 0 }], done: false } }, true)
    ).toBe("done");
  });
  it("gives every wizard step a status", () => {
    for (const id of LAUNCH_WIZARD_STEP_IDS) expect(() => launchWizardStepStatus(id, {}, true)).not.toThrow();
  });
  it("never lights the plan step and hands the seven steps to launchStepStatus", () => {
    expect(launchWizardStepStatus("plan", { prayer: { when: "Mornings" } }, true)).toBe("off");
    expect(launchWizardStepStatus("prayer", { prayer: { when: "Mornings" } }, true)).toBe("done");
  });
  it("throws on an unknown step id", () => {
    expect(() => launchWizardStepStatus("nope", {}, true)).toThrow("Unknown Launch step: nope");
  });
});

describe("moduleStatus", () => {
  const eps = (...w: boolean[]) => w.map((watched) => ({ watched }));
  it("is off with nothing watched and not ticked", () => {
    expect(moduleStatus({ completed: false, episodes: eps(false, false) })).toBe("off");
    expect(moduleStatus({ completed: false })).toBe("off");
  });
  it("is in progress with one episode watched and not ticked", () => {
    expect(moduleStatus({ completed: false, episodes: eps(false, true) })).toBe("progress");
  });
  it("is done once ticked, whatever was watched", () => {
    expect(moduleStatus({ completed: true, episodes: eps(false) })).toBe("done");
    expect(moduleStatus({ completed: true })).toBe("done");
  });
});

describe("arenaMonthStatus (one dot per scenario)", () => {
  const months = (state: { month: number; finished: boolean }) =>
    [0, 1, 2, 3, 4, 5].map((i) => arenaMonthStatus(i, state));
  it("shows every month off before the first pick", () => {
    expect(months({ month: 0, finished: false })).toEqual(["off", "off", "off", "off", "off", "off"]);
  });
  it("shows played months done and the month in play in progress mid-run", () => {
    expect(months({ month: 2, finished: false })).toEqual(["done", "done", "progress", "off", "off", "off"]);
  });
  it("shows every month done when the run is finished", () => {
    expect(months({ month: 6, finished: true })).toEqual(["done", "done", "done", "done", "done", "done"]);
  });
});

describe("DOT_SR_TEXT", () => {
  it("names each state for screen readers with no em dash", () => {
    expect(DOT_SR_TEXT).toEqual({ off: ", not started", progress: ", in progress", done: ", done" });
    expect(Object.values(DOT_SR_TEXT).join("")).not.toContain(String.fromCharCode(0x2014));
  });
});
