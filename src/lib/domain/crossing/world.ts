// Cross the Avenue (the Vision page game): the rules, with no drawing and no
// browser APIs. Positions are in tiles. Row 0 is the starting footpath and
// rows count up the screen; columns run 0 to COLS - 1, left to right.

export const COLS = 11;
export const START_COL = 5;

// The fastest a player can hop. The game ignores hops closer together than
// this, and the leaderboard refuses a score that would need more.
export const MAX_HOPS_PER_SECOND = 10;
export const MIN_HOP_MS = 1000 / MAX_HOPS_PER_SECOND;

// Columns on a footpath that hold a streetlight.
export const STREETLIGHT_COLS = [1, 5, 9] as const;

// Melbourne tram routes, for the number on the front of each tram.
const TRAM_ROUTES = [86, 96, 11, 19, 57, 1, 109, 12] as const;

// How much of a tile's edge a vehicle may clip before it counts as a hit.
const FORGIVE = 0.2;

type LaneKind = "path" | "park" | "road" | "tram";

export interface Vehicle {
  offset: number;
  length: number;
  // Index into the renderer's paint list, so each car keeps its colour.
  paint: number;
}

export interface Lane {
  kind: LaneKind;
  dir: 1 | -1;
  speed: number;
  // The distance after which a lane's traffic pattern repeats.
  period: number;
  vehicles: Vehicle[];
  trees: number[];
  route: number | null;
}

export interface World {
  lanes: Lane[];
  rng: () => number;
}

export interface Player {
  col: number;
  row: number;
}

export type Hit = { by: "car" } | { by: "tram"; route: number };

// mulberry32: a small seeded generator, so a seed always builds the same
// street (and tests can pin one).
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// Traffic speeds up the further you get, up to two and a half times.
export function difficulty(row: number): number {
  return 1 + Math.min(row, 150) / 100;
}

const SAFE: Lane = { kind: "path", dir: 1, speed: 0, period: COLS, vehicles: [], trees: [], route: null };

function safeLane(kind: "path" | "park", row: number, rng: () => number): Lane {
  if (kind === "path") return { ...SAFE, vehicles: [], trees: [] };
  // Two to four trees, never all in a row, and never on the start column
  // near the start so the first hop forward is always open.
  const count = 2 + Math.floor(rng() * 3);
  const trees = new Set<number>();
  while (trees.size < count) {
    const col = Math.floor(rng() * COLS);
    if (row < 10 && col === START_COL) continue;
    trees.add(col);
  }
  return { ...SAFE, kind: "park", vehicles: [], trees: [...trees].sort((a, b) => a - b) };
}

function roadLane(row: number, rng: () => number): Lane {
  const dir = rng() < 0.5 ? 1 : -1;
  const speed = between(rng, 1.4, 2.8) * difficulty(row);
  const count = 2 + Math.floor(rng() * 2);
  const period = COLS + 5 + count;
  const spacing = period / count;
  const vehicles = Array.from({ length: count }, (_, i) => ({
    offset: i * spacing + rng() * (spacing - 3),
    length: rng() < 0.7 ? 1.3 : 1.9,
    paint: Math.floor(rng() * 6),
  }));
  return { kind: "road", dir, speed, period, vehicles, trees: [], route: null };
}

function tramLane(row: number, rng: () => number): Lane {
  const dir = rng() < 0.5 ? 1 : -1;
  const speed = between(rng, 3.4, 4.6) * difficulty(row);
  // One long tram with a long gap behind it: rare, fast, loud.
  const period = COLS + 4 + between(rng, 8, 14);
  const route = TRAM_ROUTES[Math.floor(rng() * TRAM_ROUTES.length)];
  return { kind: "tram", dir, speed, period, vehicles: [{ offset: rng() * period, length: 4, paint: 0 }], trees: [], route };
}

export function newWorld(seed: number): World {
  const world: World = { lanes: [], rng: seededRng(seed) };
  ensureRows(world, 30);
  return world;
}

// Builds the street up to and including `row`. The street alternates: a
// safe lane (footpath or park), then a block of one to three roads or a
// single tram line. Two safe lanes never touch, so a park is always
// passable from the lane below it.
export function ensureRows(world: World, row: number): void {
  const { lanes, rng } = world;
  if (lanes.length === 0) lanes.push(safeLane("path", 0, rng), safeLane("path", 1, rng));
  while (lanes.length <= row) {
    const at = lanes.length;
    const last = lanes[at - 1];
    if (last.kind === "path" || last.kind === "park") {
      if (at >= 8 && rng() < 0.22) {
        lanes.push(tramLane(at, rng));
      } else {
        const block = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < block; i++) lanes.push(roadLane(at + i, rng));
      }
    } else {
      lanes.push(safeLane(rng() < 0.6 ? "path" : "park", at, rng));
    }
  }
}

export function laneAt(world: World, row: number): Lane {
  ensureRows(world, row);
  return world.lanes[row];
}

// A vehicle's left edge at `seconds` into the game. It enters from one side,
// leaves by the other and comes round again every `period` tiles.
export function vehicleX(lane: Lane, vehicle: Vehicle, seconds: number): number {
  const travelled = vehicle.offset + lane.dir * lane.speed * seconds;
  const wrapped = ((travelled % lane.period) + lane.period) % lane.period;
  return wrapped - vehicle.length;
}

// Where a hop would land, or the same spot if a tree or the edge is in the
// way. Players can step back, but never behind the start.
export function hop(world: World, player: Player, dCol: number, dRow: number): Player {
  const col = player.col + dCol;
  const row = player.row + dRow;
  if (col < 0 || col >= COLS || row < 0) return player;
  if (laneAt(world, row).trees.includes(col)) return player;
  return { col, row };
}

export function hitAt(world: World, player: Player, seconds: number): Hit | null {
  const lane = laneAt(world, player.row);
  if (lane.kind !== "road" && lane.kind !== "tram") return null;
  const left = player.col + FORGIVE;
  const right = player.col + 1 - FORGIVE;
  for (const vehicle of lane.vehicles) {
    const x = vehicleX(lane, vehicle, seconds);
    if (x < right && x + vehicle.length > left) {
      return lane.kind === "tram" && lane.route !== null ? { by: "tram", route: lane.route } : { by: "car" };
    }
  }
  return null;
}

// Every footpath at or below the furthest row reached has its lights on.
export function streetlightsLit(world: World, furthestRow: number): number {
  let lit = 0;
  for (let row = 1; row <= furthestRow && row < world.lanes.length; row++) {
    if (world.lanes[row].kind === "path") lit += STREETLIGHT_COLS.length;
  }
  return lit;
}

export function hitMessage(hit: Hit): string {
  return hit.by === "tram" ? `Caught by the ${hit.route} tram` : "Hit by a car";
}
