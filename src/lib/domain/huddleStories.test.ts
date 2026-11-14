import { describe, expect, it } from "vitest";
import { parseHuddleEntry, yearStories, type HuddleRow } from "./huddleStories";

const good = { label: " November huddle ", heldOn: "2026-11-10", pathways: 5, intersections: 0, streetlights: 1 };

describe("parseHuddleEntry", () => {
  it("accepts a good entry and trims the name", () => {
    expect(parseHuddleEntry(good)).toEqual({
      ok: true,
      value: { label: "November huddle", heldOn: "2026-11-10", pathways: 5, intersections: 0, streetlights: 1 },
    });
  });

  it("needs a name, a real date and whole numbers from 0 to 999", () => {
    expect(parseHuddleEntry({ ...good, label: " " }).ok).toBe(false);
    expect(parseHuddleEntry({ ...good, heldOn: "10/11/2026" }).ok).toBe(false);
    expect(parseHuddleEntry({ ...good, heldOn: "2026-13-40" }).ok).toBe(false);
    for (const bad of [-1, 1.5, 1000, "3", null]) expect(parseHuddleEntry({ ...good, pathways: bad }).ok).toBe(false);
    expect(parseHuddleEntry(null).ok).toBe(false);
  });

  it("never carries anything but the name, date and three numbers", () => {
    const parsed = parseHuddleEntry({ ...good, names: ["Ann", "Bo"] });
    expect(parsed.ok && Object.keys(parsed.value).sort()).toEqual(["heldOn", "intersections", "label", "pathways", "streetlights"]);
  });
});

describe("yearStories", () => {
  const row = (held_on: string, p: number, i: number, s: number): HuddleRow => ({
    id: held_on,
    label: `Huddle ${held_on}`,
    held_on,
    pathways: p,
    intersections: i,
    streetlights: s,
  });

  it("adds up the year and names the latest huddle", () => {
    const rows = [row("2026-08-31", 11, 5, 3), row("2026-11-10", 5, 0, 1), row("2026-09-30", 3, 0, 0), row("2025-12-01", 9, 9, 9)];
    expect(yearStories(rows, 2026)).toEqual({
      year: 2026,
      totals: { pathways: 19, intersections: 5, streetlights: 4 },
      latest: { label: "Huddle 2026-11-10", heldOn: "2026-11-10", added: 6 },
    });
  });

  it("is all zeros with no huddles yet", () => {
    expect(yearStories([], 2027)).toEqual({ year: 2027, totals: { pathways: 0, intersections: 0, streetlights: 0 }, latest: null });
  });
});
