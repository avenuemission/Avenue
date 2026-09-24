import { describe, expect, it } from "vitest";
import {
  apprenticesOnRung,
  avenueStops,
  greetingFor,
  hereActionFor,
  melbourneHour,
  partOfDay,
  STATUS_LABEL,
  STOP_IDS,
  streetStatusLine,
  type AvenueProgress,
} from "./avenue";

const fresh: AvenueProgress = {
  foundationsDone: 0,
  foundationsTotal: 4,
  callingDone: 0,
  launchDone: 0,
  checkinCount: 0,
  apprenticesOnRung: 0,
};
const statuses = (p: AvenueProgress) => avenueStops(p).map((s) => s.status);

describe("avenueStops", () => {
  it("puts a new leader at Foundations with everything else ahead", () => {
    expect(statuses(fresh)).toEqual(["here", "ahead", "ahead", "ahead", "ahead"]);
  });
  it("matches the mockup leader: Foundations and Calling walked, standing at Launch", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 3 })).toEqual([
      "walked",
      "walked",
      "here",
      "ahead",
      "ahead",
    ]);
  });
  it("keeps a later stop lit when an earlier one is not", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 2, checkinCount: 3 })).toEqual([
      "walked",
      "walked",
      "here",
      "ongoing",
      "ahead",
    ]);
  });
  it("makes Growth ongoing on the first check-in and Multiply ongoing on the first apprentice on rung 1", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 1, apprenticesOnRung: 1 })).toEqual([
      "walked",
      "walked",
      "walked",
      "ongoing",
      "ongoing",
    ]);
  });
  it("puts here on the first stop that is neither walked nor ongoing", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 1 })).toEqual([
      "walked",
      "walked",
      "walked",
      "ongoing",
      "here",
    ]);
  });
  it("labels the four states", () => {
    expect(STATUS_LABEL).toEqual({ walked: "Walked", ongoing: "Ongoing", here: "You are here", ahead: "Ahead" });
  });
  it("never walks Foundations with zero modules", () => {
    expect(statuses({ ...fresh, foundationsTotal: 0 })[0]).toBe("here");
  });
  it("needs every Calling section and every Launch step", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 5 })[1]).toBe("here");
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 6 })[2]).toBe("here");
  });
  it("numbers and names the five stops in order", () => {
    const stops = avenueStops(fresh);
    expect(stops.map((s) => s.id)).toEqual([...STOP_IDS]);
    expect(stops.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(stops.map((s) => s.name)).toEqual(["Foundations", "Calling", "Launch", "Growth", "Multiply"]);
  });
});

describe("streetStatusLine", () => {
  it("reads for nobody lit yet", () => {
    expect(streetStatusLine(avenueStops(fresh))).toBe("No streetlights on yet. Foundations is next.");
  });
  it("uses the singular for one light", () => {
    expect(streetStatusLine(avenueStops({ ...fresh, foundationsDone: 4 }))).toBe("One streetlight on. Calling is next.");
  });
  it("matches the mockup line", () => {
    expect(streetStatusLine(avenueStops({ ...fresh, foundationsDone: 4, callingDone: 6 }))).toBe(
      "Two streetlights on. Launch is next."
    );
  });
  it("counts ongoing stops as lit", () => {
    expect(streetStatusLine(avenueStops({ ...fresh, foundationsDone: 4, callingDone: 6, checkinCount: 1 }))).toBe(
      "Three streetlights on. Launch is next."
    );
  });
  it("says so when the whole street is lit", () => {
    const all = { ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 2, apprenticesOnRung: 1 };
    expect(streetStatusLine(avenueStops(all))).toBe("All five streetlights on.");
  });
});

describe("hereActionFor", () => {
  it("points Foundations at the hub phase", () => {
    expect(hereActionFor("phase1", { ...fresh, foundationsDone: 2 })).toEqual({
      text: "2 of 4 Foundations modules ticked.",
      label: "Continue Foundations",
      href: "/leaders/training?phase=phase1",
    });
    expect(hereActionFor("phase1", fresh).label).toBe("Start Foundations");
  });
  it("points Calling and Launch at their wizards", () => {
    expect(hereActionFor("phase2", fresh)).toEqual({
      text: "0 of 6 Calling sections done.",
      label: "Start Calling",
      href: "/leaders/training/calling",
    });
    expect(hereActionFor("phase3", { ...fresh, launchDone: 3 })).toEqual({
      text: "3 of 7 Launch steps done.",
      label: "Continue Launch",
      href: "/leaders/training/launch",
    });
  });
  it("points Growth and Multiply at their hub phases", () => {
    expect(hereActionFor("phase4", fresh).href).toBe("/leaders/training?phase=phase4");
    expect(hereActionFor("phase5", fresh).href).toBe("/leaders/training?phase=phase5");
  });
});

describe("greeting by Melbourne time", () => {
  // 24 Sep 2026 is AEST (UTC+10); daylight saving starts 4 Oct 2026.
  it("reads the Melbourne hour", () => {
    expect(melbourneHour(new Date("2026-09-24T00:00:00Z"))).toBe(10);
    expect(melbourneHour(new Date("2026-09-24T14:00:00Z"))).toBe(0);
  });
  it("splits the day at 5, 12 and 17", () => {
    expect(partOfDay(4)).toBe("evening");
    expect(partOfDay(5)).toBe("morning");
    expect(partOfDay(11)).toBe("morning");
    expect(partOfDay(12)).toBe("afternoon");
    expect(partOfDay(16)).toBe("afternoon");
    expect(partOfDay(17)).toBe("evening");
    expect(partOfDay(0)).toBe("evening");
  });
  it("greets by first name at the boundaries", () => {
    expect(greetingFor(new Date("2026-09-24T01:59:00Z"), "Sam")).toBe("Good morning, Sam.");
    expect(greetingFor(new Date("2026-09-24T02:00:00Z"), "Sam")).toBe("Good afternoon, Sam.");
    expect(greetingFor(new Date("2026-09-24T07:00:00Z"), "Sam")).toBe("Good evening, Sam.");
    expect(greetingFor(new Date("2026-09-24T18:59:00Z"), "Sam")).toBe("Good evening, Sam.");
    expect(greetingFor(new Date("2026-09-24T19:00:00Z"), "Sam")).toBe("Good morning, Sam.");
  });
  it("follows daylight saving", () => {
    // 1 Dec 2026 06:30 UTC is 17:30 AEDT (UTC+11), which would be 16:30 at UTC+10.
    expect(greetingFor(new Date("2026-12-01T06:30:00Z"), "Sam")).toBe("Good evening, Sam.");
  });
  it("uses only the first name, and copes with none", () => {
    expect(greetingFor(new Date("2026-09-24T09:00:00Z"), "  Sam Lee ")).toBe("Good evening, Sam.");
    expect(greetingFor(new Date("2026-09-24T09:00:00Z"), "")).toBe("Good evening.");
    expect(greetingFor(new Date("2026-09-24T09:00:00Z"), null)).toBe("Good evening.");
  });
});

describe("apprenticesOnRung", () => {
  const people = [
    { sentOutBy: "me", apprenticeStep: 0 },
    { sentOutBy: "me", apprenticeStep: 1 },
    { sentOutBy: "me", apprenticeStep: 4 },
    { sentOutBy: "me" },
    { sentOutBy: "someone-else", apprenticeStep: 3 },
    { sentOutBy: null, apprenticeStep: 2 },
  ];
  it("counts only people this leader sent out, on rung 1 or above", () => {
    expect(apprenticesOnRung(people, "me")).toBe(2);
  });
  it("counts nobody before the viewer is known", () => {
    expect(apprenticesOnRung(people, null)).toBe(0);
    expect(apprenticesOnRung([], "me")).toBe(0);
  });
});
