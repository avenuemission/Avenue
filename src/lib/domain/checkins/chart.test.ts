import { describe, expect, it } from "vitest";
import { gaugeSegments, labelIndexes, segmentPath, xFor, yFor, type ChartBox } from "./chart";

// A box with round numbers: the plot area is 100 wide (x 10 to 110) and 90
// tall (y 0 to 90).
const BOX: ChartBox = { width: 110, height: 100, padLeft: 10, padRight: 0, padTop: 0, padBottom: 10 };
const entry = (weekStart: string, relational: number) => ({
  weekStart,
  relational,
  physical: 5,
  mental: 5,
  spiritual: 5,
});
const WEEKS = ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21"];

describe("xFor and yFor", () => {
  it("puts 10 at the top of the plot and 1 at the bottom", () => {
    expect(yFor(10, BOX)).toBe(0);
    expect(yFor(1, BOX)).toBe(90);
    expect(yFor(4, BOX)).toBe(60);
  });
  it("spreads the weeks from the left edge to the right edge, and centres a single week", () => {
    expect(xFor(0, 5, BOX)).toBe(10);
    expect(xFor(2, 5, BOX)).toBe(60);
    expect(xFor(4, 5, BOX)).toBe(110);
    expect(xFor(0, 1, BOX)).toBe(60);
  });
});

describe("gaugeSegments", () => {
  it("breaks the line at a missed week", () => {
    const checkins = [entry("2026-08-31", 10), entry("2026-09-14", 4), entry("2026-09-21", 1)];
    const segments = gaugeSegments(WEEKS, checkins, "relational", BOX);
    expect(segments.map((s) => s.map((p) => [p.week, p.index, p.score, p.y]))).toEqual([
      [["2026-08-31", 0, 10, 0]],
      [
        ["2026-09-14", 2, 4, 60],
        ["2026-09-21", 3, 1, 90],
      ],
    ]);
    expect(segments[1][0].x).toBeCloseTo(76.667, 2);
    expect(segments[1][1].x).toBe(110);
  });
  it("has no segments when there are no check-ins in the window", () => {
    expect(gaugeSegments(WEEKS, [entry("2026-01-05", 7)], "relational", BOX)).toEqual([]);
  });
});

describe("segmentPath", () => {
  it("draws a move then lines, rounded to two decimals", () => {
    const [segment] = gaugeSegments(
      ["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"],
      [entry("2026-09-14", 10), entry("2026-09-21", 1)],
      "relational",
      BOX
    );
    expect(segmentPath(segment)).toBe("M10 0 L43.33 90");
  });
});

describe("labelIndexes", () => {
  it("labels every third week counting back from this week", () => {
    expect(labelIndexes(12)).toEqual([2, 5, 8, 11]);
    expect(labelIndexes(1)).toEqual([0]);
    expect(labelIndexes(0)).toEqual([]);
  });
});
