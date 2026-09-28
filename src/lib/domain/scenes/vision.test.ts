import { describe, expect, it } from "vitest";
import { pathEnds, visionSuburb, type Point, type Rect } from "./vision";

const suburb = visionSuburb();

const streetRects = (): Rect[] => [
  ...suburb.streetsX.map((s) => ({ x: s.at - s.width / 2, y: 0, width: s.width, height: 440 })),
  ...suburb.streetsY.map((s) => ({ x: 0, y: s.at - s.width / 2, width: 600, height: s.width })),
];

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];

describe("visionSuburb", () => {
  it("is deterministic for the same seed", () => {
    expect(visionSuburb()).toEqual(visionSuburb());
    expect(visionSuburb(11)).toEqual(suburb);
  });

  it("changes the rooftops for a different seed", () => {
    expect(visionSuburb(12).rooftops).not.toEqual(suburb.rooftops);
  });

  it("uses the mockup street grid with the two main avenues wider", () => {
    expect(suburb.streetsX.map((s) => s.at)).toEqual([30, 110, 190, 300, 410, 490, 570]);
    expect(suburb.streetsY.map((s) => s.at)).toEqual([30, 120, 220, 320, 410]);
    expect(suburb.streetsX.find((s) => s.at === 300)?.width).toBe(12);
    expect(suburb.streetsY.find((s) => s.at === 220)?.width).toBe(12);
    expect(suburb.streetsX.find((s) => s.at === 110)?.width).toBe(8);
    expect(suburb.centre).toEqual([300, 220]);
  });

  it("fills the blocks with rooftops, none of them on a street", () => {
    expect(suburb.rooftops.length).toBeGreaterThan(150);
    const streets = streetRects();
    for (const roof of suburb.rooftops) {
      expect(roof.width).toBe(11);
      expect(roof.height).toBe(9);
      for (const street of streets) expect(overlaps(roof, street)).toBe(false);
    }
  });

  it("keeps one park block with 14 trees and no rooftops in it", () => {
    const { park } = suburb;
    expect(park.trees).toHaveLength(14);
    expect(suburb.rooftops.some((r) => overlaps(r, park))).toBe(false);
    for (const t of park.trees) {
      expect(t.cx).toBeGreaterThanOrEqual(park.x + 8);
      expect(t.cx).toBeLessThanOrEqual(park.x + park.width - 8);
    }
  });

  it("has six homes with three lamps each and three meeting points", () => {
    expect(suburb.homes).toHaveLength(6);
    for (const h of suburb.homes) expect(h.lamps).toHaveLength(3);
    expect(suburb.meets.map((m) => m.at)).toEqual([[190, 120], [490, 220], [300, 320]]);
  });

  it("starts every pulse at a home or meeting point and ends it at a meeting point or the centre", () => {
    const starts: Point[] = [...suburb.homes.map((h) => h.at), ...suburb.meets.map((m) => m.at)];
    const ends: Point[] = [...suburb.meets.map((m) => m.at), suburb.centre];
    expect(suburb.pulses).toHaveLength(9);
    for (const p of suburb.pulses) {
      const { start, end } = pathEnds(p.path);
      expect(starts.some((s) => same(s, start))).toBe(true);
      expect(ends.some((e) => same(e, end))).toBe(true);
    }
  });

  it("sends the home pulses first and the meeting pulses to the centre after", () => {
    const home = suburb.pulses.slice(0, 6);
    const meet = suburb.pulses.slice(6);
    expect(home.map((p) => p.at)).toEqual([4.4, 4.55, 4.4, 4.55, 4.4, 4.55]);
    expect(home.every((p) => p.dur === 1.5)).toBe(true);
    for (const p of meet) {
      expect(p.at).toBe(6.6);
      expect(p.dur).toBe(1.2);
      expect(pathEnds(p.path).end).toEqual(suburb.centre);
    }
  });

  it("switches each home's lamps on in order after the homes light", () => {
    suburb.homes.forEach((h, i) => {
      expect(h.lamps.map((l) => l.d)).toEqual([0, 1, 2].map((k) => Math.round((2.9 + i * 0.12 + k * 0.22) * 100) / 100));
    });
  });
});

describe("pathEnds", () => {
  it("follows M, H and V commands", () => {
    expect(pathEnds("M70 272 H110 V320 H300")).toEqual({ start: [70, 272], end: [300, 320] });
  });

  it("throws on a command it does not understand", () => {
    expect(() => pathEnds("M0 0 L10 10")).toThrow();
  });
});
