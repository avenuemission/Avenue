import { round, seededRandom } from "./seeded";

// The Vision scene: a suburb at night from above (viewBox 600 x 440).
// Geometry, seed and timings are ported from docs/design/night-scenes-mockup.html.

export type Point = [number, number];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Street {
  at: number;
  width: number;
}

interface Rooftop extends Rect {
  fill: string;
}

interface Tree {
  cx: number;
  cy: number;
  r: number;
}

interface Lamp {
  at: Point;
  /** Seconds after the scene starts. */
  d: number;
}

interface Home {
  at: Point;
  d: number;
  lamps: Lamp[];
}

interface Meet {
  at: Point;
  d: number;
}

interface Pulse {
  /** An SVG path of M, H and V commands along the streets. */
  path: string;
  /** Begin offset in seconds. */
  at: number;
  dur: number;
}

export interface VisionSuburb {
  streetsX: Street[];
  streetsY: Street[];
  centre: Point;
  rooftops: Rooftop[];
  park: Rect & { trees: Tree[] };
  homes: Home[];
  meets: Meet[];
  pulses: Pulse[];
}

const XS = [30, 110, 190, 300, 410, 490, 570];
const YS = [30, 120, 220, 320, 410];
const CENTRE: Point = [300, 220];
/** The block (column i, row j) that is a park instead of houses. */
const PARK = { i: 4, j: 2 };

const HOMES: { at: Point; d: number; lamps: Point[]; path: string }[] = [
  { at: [150, 165], d: 1.0, lamps: [[130, 120], [150, 120], [170, 120]], path: "M150 165 V120 H190" },
  { at: [250, 75], d: 1.3, lamps: [[230, 120], [250, 120], [270, 120]], path: "M250 75 V120 H190" },
  { at: [445, 165], d: 1.6, lamps: [[425, 220], [445, 220], [465, 220]], path: "M445 165 V220 H490" },
  { at: [532, 272], d: 1.9, lamps: [[490, 252], [490, 272], [490, 292]], path: "M532 272 H490 V220" },
  { at: [360, 370], d: 2.2, lamps: [[340, 320], [360, 320], [380, 320]], path: "M360 370 V320 H300" },
  { at: [70, 272], d: 2.5, lamps: [[110, 252], [110, 272], [110, 292]], path: "M70 272 H110 V320 H300" },
];

const MEETS: Point[] = [[190, 120], [490, 220], [300, 320]];
const MEET_PATHS = ["M190 120 V220 H300", "M490 220 H300", "M300 320 V220"];

export function visionSuburb(seed = 11): VisionSuburb {
  const rnd = seededRandom(seed);
  const rooftops: Rooftop[] = [];
  let park: VisionSuburb["park"] | null = null;

  for (let i = 0; i < XS.length - 1; i++) {
    for (let j = 0; j < YS.length - 1; j++) {
      const x0 = XS[i] + 9;
      const x1 = XS[i + 1] - 9;
      const y0 = YS[j] + 9;
      const y1 = YS[j + 1] - 9;
      if (i === PARK.i && j === PARK.j) {
        const trees: Tree[] = [];
        for (let t = 0; t < 14; t++) {
          const cx = x0 + 8 + rnd() * (x1 - x0 - 16);
          const cy = y0 + 8 + rnd() * (y1 - y0 - 16);
          const r = 4 + rnd() * 4;
          trees.push({ cx: round(cx, 2), cy: round(cy, 2), r: round(r, 2) });
        }
        park = { x: x0, y: y0, width: x1 - x0, height: y1 - y0, trees };
        continue;
      }
      for (let x = x0; x < x1 - 10; x += 16) {
        for (let y = y0; y < y1 - 8; y += 15) {
          if (rnd() < 0.22) continue;
          const rx = x + rnd() * 2;
          const ry = y + rnd() * 2;
          const fill = rnd() < 0.5 ? "#111724" : "#0e1420";
          rooftops.push({ x: round(rx, 2), y: round(ry, 2), width: 11, height: 9, fill });
        }
      }
    }
  }
  if (!park) throw new Error("visionSuburb: the park block is outside the grid");

  const homes: Home[] = HOMES.map((h, i) => ({
    at: h.at,
    d: h.d,
    lamps: h.lamps.map((at, k) => ({ at, d: round(2.9 + i * 0.12 + k * 0.22, 2) })),
  }));
  const meets: Meet[] = MEETS.map((at, i) => ({ at, d: round(5.9 + i * 0.15, 2) }));
  const pulses: Pulse[] = [
    ...HOMES.map((h, i) => ({ path: h.path, at: round(4.4 + (i % 2) * 0.15, 2), dur: 1.5 })),
    ...MEET_PATHS.map((path) => ({ path, at: 6.6, dur: 1.2 })),
  ];

  return {
    streetsX: XS.map((at) => ({ at, width: at === CENTRE[0] ? 12 : 8 })),
    streetsY: YS.map((at) => ({ at, width: at === CENTRE[1] ? 12 : 8 })),
    centre: CENTRE,
    rooftops,
    park,
    homes,
    meets,
    pulses,
  };
}

/** Where a street path (M, H and V commands only) starts and ends. */
export function pathEnds(d: string): { start: Point; end: Point } {
  const tokens = d.trim().match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  let start: Point | null = null;
  let x = 0;
  let y = 0;
  let i = 0;
  const num = () => {
    const n = Number(tokens[i++]);
    if (!Number.isFinite(n)) throw new Error(`pathEnds: bad number in "${d}"`);
    return n;
  };
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M") {
      x = num();
      y = num();
      start ??= [x, y];
    } else if (cmd === "H") x = num();
    else if (cmd === "V") y = num();
    else throw new Error(`pathEnds: unsupported command "${cmd}" in "${d}"`);
  }
  if (!start) throw new Error(`pathEnds: no M command in "${d}"`);
  return { start, end: [x, y] };
}
