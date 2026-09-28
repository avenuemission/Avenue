import { describe, expect, it } from "vitest";
import {
  COLS,
  START_COL,
  STREETLIGHT_COLS,
  difficulty,
  ensureRows,
  hitAt,
  hitMessage,
  hop,
  laneAt,
  newWorld,
  seededRng,
  streetlightsLit,
  vehicleX,
  type Lane,
  type World,
} from "./world";

const road = (over: Partial<Lane> = {}): Lane => ({
  kind: "road",
  dir: 1,
  speed: 2,
  period: 20,
  vehicles: [{ offset: 5, length: 2, paint: 0 }],
  trees: [],
  route: null,
  ...over,
});

const worldOf = (...lanes: Lane[]): World => ({ lanes, rng: seededRng(1) });
const path = (): Lane => ({ ...road(), kind: "path", speed: 0, vehicles: [] });

describe("seededRng", () => {
  it("repeats for a seed and stays in [0, 1)", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const values = Array.from({ length: 200 }, () => a());
    expect(values).toEqual(Array.from({ length: 200 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe("the street", () => {
  it("builds the same street for the same seed", () => {
    expect(newWorld(7).lanes).toEqual(newWorld(7).lanes);
  });

  it("starts on two footpaths", () => {
    const { lanes } = newWorld(3);
    expect(lanes[0].kind).toBe("path");
    expect(lanes[1].kind).toBe("path");
  });

  it("never puts two safe lanes together and never parks in a row", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const world = newWorld(seed);
      ensureRows(world, 300);
      for (let row = 2; row < world.lanes.length; row++) {
        const here = world.lanes[row].kind;
        const below = world.lanes[row - 1].kind;
        const safe = (k: string) => k === "path" || k === "park";
        expect(safe(here) && safe(below)).toBe(false);
      }
    }
  });

  it("parks have two to four trees, and none on the start column near the start", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const world = newWorld(seed);
      ensureRows(world, 200);
      world.lanes.forEach((lane, row) => {
        if (lane.kind !== "park") return;
        expect(lane.trees.length).toBeGreaterThanOrEqual(2);
        expect(lane.trees.length).toBeLessThanOrEqual(4);
        if (row < 10) expect(lane.trees).not.toContain(START_COL);
      });
    }
  });

  it("has no trams before row 8, and every tram shows a route number", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const world = newWorld(seed);
      ensureRows(world, 200);
      world.lanes.forEach((lane, row) => {
        if (lane.kind !== "tram") return;
        expect(row).toBeGreaterThanOrEqual(8);
        expect(lane.route).toEqual(expect.any(Number));
      });
    }
  });

  it("every vehicle fully leaves the screen before it comes round again", () => {
    const world = newWorld(11);
    ensureRows(world, 200);
    for (const lane of world.lanes) {
      for (const v of lane.vehicles) expect(lane.period).toBeGreaterThanOrEqual(COLS + v.length);
    }
  });

  it("speeds up with distance, then stops speeding up", () => {
    expect(difficulty(0)).toBe(1);
    expect(difficulty(100)).toBeGreaterThan(difficulty(10));
    expect(difficulty(1000)).toBe(difficulty(150));
  });

  it("laneAt builds rows on demand", () => {
    const world = newWorld(5);
    expect(world.lanes.length).toBeLessThan(500);
    expect(laneAt(world, 499)).toBeDefined();
    expect(world.lanes.length).toBeGreaterThanOrEqual(500);
  });
});

describe("vehicleX", () => {
  it("moves right, wraps, and moves left", () => {
    const lane = road();
    const v = lane.vehicles[0];
    expect(vehicleX(lane, v, 0)).toBe(3);
    expect(vehicleX(lane, v, 1)).toBe(5);
    expect(vehicleX(lane, v, 8)).toBe(-1); // 5 + 16 = 21, wraps to 1, minus length 2
    expect(vehicleX({ ...lane, dir: -1 }, v, 1)).toBe(1); // 5 - 2 = 3, minus length 2
  });
});

describe("hop", () => {
  const world = worldOf(path(), { ...path(), kind: "park", trees: [4] }, road());

  it("moves one tile", () => {
    expect(hop(world, { col: 5, row: 0 }, 0, 1)).toEqual({ col: 5, row: 1 });
    expect(hop(world, { col: 5, row: 1 }, 1, 0)).toEqual({ col: 6, row: 1 });
  });

  it("stays put at the edges, behind the start and into a tree", () => {
    const edge = { col: 0, row: 0 };
    expect(hop(world, edge, -1, 0)).toBe(edge);
    expect(hop(world, edge, 0, -1)).toBe(edge);
    const right = { col: COLS - 1, row: 0 };
    expect(hop(world, right, 1, 0)).toBe(right);
    const belowTree = { col: 4, row: 0 };
    expect(hop(world, belowTree, 0, 1)).toBe(belowTree);
  });
});

describe("hitAt", () => {
  // At 0 seconds the car covers x 3 to 5.
  const world = worldOf(path(), road(), { ...road(), kind: "tram", route: 86, vehicles: [{ offset: 6, length: 4, paint: 0 }] });

  it("hits a player the vehicle covers", () => {
    expect(hitAt(world, { col: 3, row: 1 }, 0)).toEqual({ by: "car" });
    expect(hitAt(world, { col: 4, row: 1 }, 0)).toEqual({ by: "car" });
  });

  it("forgives a clipped edge", () => {
    // The car ends at x 5; a player at col 5 starts there.
    expect(hitAt(world, { col: 5, row: 1 }, 0)).toBeNull();
    expect(hitAt(world, { col: 2, row: 1 }, 0)).toBeNull();
  });

  it("names the tram route, and never hits on a footpath", () => {
    expect(hitAt(world, { col: 3, row: 2 }, 0)).toEqual({ by: "tram", route: 86 });
    expect(hitAt(world, { col: 3, row: 0 }, 0)).toBeNull();
  });
});

describe("streetlightsLit and hitMessage", () => {
  it("counts the lights on every footpath passed, not the start", () => {
    const world = worldOf(path(), road(), path(), road(), path());
    expect(streetlightsLit(world, 0)).toBe(0);
    expect(streetlightsLit(world, 2)).toBe(STREETLIGHT_COLS.length);
    expect(streetlightsLit(world, 4)).toBe(STREETLIGHT_COLS.length * 2);
  });

  it("says what hit you", () => {
    expect(hitMessage({ by: "car" })).toBe("Hit by a car");
    expect(hitMessage({ by: "tram", route: 86 })).toBe("Caught by the 86 tram");
  });
});
