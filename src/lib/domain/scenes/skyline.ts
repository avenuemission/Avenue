import { seededRandom } from "./seeded";

// The landing page scene: Melbourne at night from above, six streets running
// to a cross on the horizon (viewBox 1200 x 675). Ported from sceneB in
// docs/design/landing-skyline-mockup.html (approved draft 5): same
// coordinates, seeds, colours and delays, and the same paint order.

export const SKYLINE_WIDTH = 1200;
export const SKYLINE_HEIGHT = 675;
const W = SKYLINE_WIDTH;
const H = SKYLINE_HEIGHT;
const HORIZON = 250;
const CROSS_X = 720;
const SCALE = 0.72;

/** A gradient fill the component defines (its ids are per scene). */
type Paint = "sky" | "glow" | "soft" | "wash";
/** The .scene animation classes. */
type Anim = "lit" | "glow" | "fade" | "grow" | "wash";

/** One SVG element, in paint order. attrs use React prop names. */
export interface Shape {
  tag: "rect" | "circle" | "path" | "line" | "g";
  attrs: Record<string, number | string>;
  paint?: Paint;
  cls?: Anim;
  /** Animation delay in seconds (the --d variable). */
  delay?: number;
  children?: Shape[];
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A building and the lit windows (or floor lines) drawn on it. */
interface Building extends Box {
  name?: string;
  windows: Box[];
}

interface Street {
  /** Centre of the street where it meets the horizon. */
  top: [number, number];
  /** Centre of the street at the bottom edge of the scene. */
  bottom: [number, number];
}

export interface SkylineScene {
  shapes: Shape[];
  horizon: number;
  cross: { x: number; baseY: number; height: number };
  /** Landmark x positions (left edge, or centre for the spire). */
  landmarks: { rialto: [number, number]; artsCentre: number; australia108: number; eureka: number };
  buildings: Building[];
  streets: Street[];
}

const fixed = (n: number, places: number) => Number(n.toFixed(places));

function base(out: Shape[], horizon: number) {
  out.push({ tag: "rect", attrs: { x: 0, y: 0, width: W, height: H }, paint: "sky" });
  const r = seededRandom(3);
  for (let i = 0; i < 70; i++) {
    const cx = fixed(r() * W, 0);
    const cy = fixed(r() * horizon * 0.85, 0);
    const rad = fixed(r() * 1.1 + 0.4, 2);
    const opacity = fixed(r() * 0.5 + 0.15, 2);
    out.push({ tag: "circle", attrs: { cx, cy, r: rad, fill: "#8a93a8", opacity } });
  }
}

/** The cross, its glow and its light. cx, base y, height in px. */
function cross(out: Shape[], cx: number, y: number, h: number) {
  out.push({ tag: "circle", attrs: { cx, cy: y - h * 0.55, r: h * 7 }, paint: "glow", cls: "grow", delay: 0.3 });
  out.push({ tag: "circle", attrs: { cx, cy: y - h * 0.55, r: h * 2.2 }, paint: "glow", cls: "glow", delay: 0.1 });
  const w = Math.max(3, h * 0.12);
  out.push({
    tag: "g",
    attrs: {},
    cls: "fade",
    delay: 0,
    children: [
      { tag: "rect", attrs: { x: cx - w / 2, y: y - h, width: w, height: h, rx: w / 3, fill: "#fff3d6" } },
      {
        tag: "rect",
        attrs: { x: cx - h * 0.32, y: y - h * 0.74, width: h * 0.64, height: w, rx: w / 3, fill: "#fff3d6" },
      },
    ],
  });
}

/** Melbourne skyline around the horizon. s = scale; lit windows light outward from the cross. */
function skyline(out: Shape[], horizon: number, s: number, cx: number, seed: number) {
  const r = seededRandom(seed);
  const buildings: Building[] = [];

  const bldg = (x: number, w: number, h: number, fill: string, name?: string) => {
    out.push({ tag: "rect", attrs: { x, y: horizon - h, width: w, height: h, fill } });
    const b: Building = { name, x, y: horizon - h, width: w, height: h, windows: [] };
    buildings.push(b);
    const cols = Math.max(1, Math.floor(w / (9 * s)));
    const rows = Math.max(1, Math.floor(h / (11 * s)));
    for (let i = 0; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        if (r() < 0.55) continue;
        const wx = x + 3 * s + (i * (w - 6 * s)) / cols;
        const wy = horizon - h + j * 11 * s;
        const d = 1.3 + (Math.abs(wx - cx) / W) * 3.2 + r() * 0.5;
        const win = { x: fixed(wx, 1), y: fixed(wy, 1), width: fixed(3.2 * s, 1), height: fixed(4 * s, 1) };
        b.windows.push(win);
        out.push({ tag: "rect", attrs: { ...win }, cls: "lit", delay: fixed(d, 2) });
      }
    }
  };

  // generic blocks across the width, lower near the cross so it stays clear
  for (let x = -10; x < W; ) {
    const w = (22 + r() * 34) * s;
    const near = Math.abs(x + w / 2 - cx);
    let h = (18 + r() * 70) * s;
    if (near < 120 * s) h *= 0.45;
    bldg(x, w, h, r() < 0.5 ? "#0b101b" : "#0e1320");
    x += w + r() * 6 * s;
  }

  // landmarks
  const L = (dx: number) => cx + dx * s;
  // Rialto twin towers
  bldg(L(-215), 30 * s, 150 * s, "#0d1321", "rialto");
  bldg(L(-181), 26 * s, 128 * s, "#0d1321", "rialto");

  // Australia 108: slim, stepped at the top, gold floor lines and the gold starburst
  {
    const x = L(135);
    const w = 34 * s;
    const h = 262 * s;
    const top = horizon - h;
    const x2 = x + w * 0.18;
    const w2 = w * 0.7;
    const step = horizon - h * 0.8;
    out.push({
      tag: "path",
      attrs: {
        d: `M${x} ${horizon} V${step} H${x2} V${top + 10 * s} Q${x2 + w2 * 0.5} ${top - 6 * s} ${x2 + w2} ${top + 6 * s} V${step} H${x + w} V${horizon} Z`,
        fill: "#0f1830",
      },
    });
    const tower: Building = { name: "australia108", x, y: top, width: w, height: h, windows: [] };
    buildings.push(tower);
    for (let y = horizon - 16 * s; y > top + 12 * s; y -= 17 * s) {
      const inTop = y < step;
      const line = {
        x: fixed(inTop ? x2 : x, 1),
        y: fixed(y, 1),
        width: fixed(inTop ? w2 : w, 1),
        height: fixed(1.1 * s, 2),
      };
      tower.windows.push(line);
      out.push({ tag: "rect", attrs: { ...line }, cls: "lit", delay: fixed(1.2 + ((horizon - y) / h) * 0.8, 2) });
    }
    const yc = horizon - h * 0.6;
    // the starburst, gold on both sides of the tower
    out.push({
      tag: "path",
      attrs: {
        d: `M${x - 17 * s} ${yc - 6 * s} L${x + w + 17 * s} ${yc - 6 * s} L${x + w + 12 * s} ${yc + 8 * s} L${x + w * 0.72} ${yc + 4 * s} L${x + w * 0.5} ${yc + 11 * s} L${x + w * 0.28} ${yc + 4 * s} L${x - 12 * s} ${yc + 8 * s} Z`,
      },
      cls: "lit",
      delay: 1,
    });
    out.push({
      tag: "path",
      attrs: {
        d: `M${x + w * 0.26} ${yc - 3.5 * s} L${x + w * 0.74} ${yc - 3.5 * s} L${x + w * 0.6} ${yc + 5 * s} L${x + w * 0.4} ${yc + 5 * s} Z`,
        fill: "#16264a",
      },
    });
    out.push({ tag: "circle", attrs: { cx: x + w * 0.5, cy: yc, r: 34 * s }, paint: "soft", cls: "glow", delay: 1.1 });
  }

  // Eureka Tower with a gold crown
  const ex = L(215);
  const eh = 225 * s;
  const ew = 34 * s;
  out.push({ tag: "rect", attrs: { x: ex, y: horizon - eh, width: ew, height: eh, fill: "#0e1424" } });
  out.push({ tag: "rect", attrs: { x: ex, y: horizon - eh, width: ew, height: 22 * s }, cls: "lit", delay: 1.2 });
  out.push({
    tag: "rect",
    attrs: { x: ex + ew * 0.4, y: horizon - eh - 14 * s, width: 2.5 * s, height: 14 * s, fill: "#2b3448" },
  });
  const eureka: Building = { name: "eureka", x: ex, y: horizon - eh, width: ew, height: eh, windows: [] };
  buildings.push(eureka);
  for (let j = 3; j < eh / (11 * s); j++) {
    if (r() > 0.55) {
      const win = { x: ex + 5 * s + (j % 3) * 9 * s, y: horizon - j * 11 * s, width: 3.2 * s, height: 4 * s };
      eureka.windows.push(win);
      out.push({ tag: "rect", attrs: { ...win }, cls: "lit", delay: fixed(1.4 + r() * 0.8, 2) });
    }
  }

  // Arts Centre spire: a flared, curving lattice skirt that narrows to a needle
  {
    const sx = L(-110);
    const foot = horizon;
    const tall = 245 * s;
    const halfB = 54 * s;
    const waist = foot - 92 * s;
    const edge = (t: number): [number, number] => {
      // quadratic curve from the wide base up to the narrow waist, then the needle
      const u = 1 - t;
      const xOff = u * u * halfB + 2 * u * t * (5 * s) + t * t * (3 * s);
      const y = u * u * foot + 2 * u * t * (foot - 8 * s) + t * t * waist;
      return [xOff, y];
    };
    let left = "";
    let right = "";
    for (let i = 0; i <= 16; i++) {
      const [o, y] = edge(i / 16);
      left += `${i ? "L" : "M"}${(sx - o).toFixed(1)} ${y.toFixed(1)} `;
      right = `L${(sx + o).toFixed(1)} ${y.toFixed(1)} ` + right;
    }
    out.push({
      tag: "path",
      attrs: { d: `${left}L${sx} ${foot - tall} ${right}Z`, fill: "#0e1424", stroke: "#8fa3d6", strokeWidth: 1.3 * s },
    });
    // lattice rungs that follow the curve, lit from the base upward
    for (let i = 1; i < 16; i++) {
      const [o, y] = edge(i / 16);
      const d = fixed(1.3 + i * 0.05, 2);
      out.push({
        tag: "line",
        attrs: { x1: fixed(sx - o, 1), y1: fixed(y, 1), x2: fixed(sx + o, 1), y2: fixed(y, 1), stroke: "#5d6f9c", strokeWidth: 0.9 * s },
      });
      out.push({ tag: "circle", attrs: { cx: fixed(sx - o, 1), cy: fixed(y, 1), r: 1.5 * s }, cls: "lit", delay: d });
      out.push({ tag: "circle", attrs: { cx: fixed(sx + o, 1), cy: fixed(y, 1), r: 1.5 * s }, cls: "lit", delay: d });
    }
    for (let y = waist - 12 * s; y > foot - tall + 10 * s; y -= 14 * s) {
      const o = (3 * s * (y - (foot - tall))) / (waist - (foot - tall));
      out.push({
        tag: "line",
        attrs: { x1: fixed(sx - o, 1), y1: fixed(y, 1), x2: fixed(sx + o, 1), y2: fixed(y, 1), stroke: "#3a4868", strokeWidth: 0.8 * s },
      });
    }
    // the glittering building skirt at the foot of the spire
    out.push({
      tag: "path",
      attrs: { d: `M${sx - 62 * s} ${foot} Q${sx} ${foot - 30 * s} ${sx + 62 * s} ${foot} Z`, fill: "#1a1512" },
    });
    for (let k = 0; k < 26; k++) {
      const t = k / 25;
      const px = sx - 56 * s + t * 112 * s;
      const py = foot - 4 * s - Math.sin(t * Math.PI) * 18 * s * (k % 2 ? 0.55 : 0.9);
      out.push({
        tag: "circle",
        attrs: { cx: fixed(px, 1), cy: fixed(py, 1), r: 1.5 * s },
        cls: "lit",
        delay: fixed(1.5 + Math.abs(t - 0.5), 2),
      });
    }
    out.push({ tag: "circle", attrs: { cx: sx, cy: foot - tall, r: 2 * s, fill: "#dbe6ff" }, cls: "fade", delay: 1.7 });
    out.push({ tag: "circle", attrs: { cx: sx, cy: foot - tall, r: 16 * s }, paint: "soft", cls: "glow", delay: 1.7 });
  }

  return {
    buildings,
    landmarks: {
      rialto: [L(-215), L(-181)] as [number, number],
      artsCentre: L(-110),
      australia108: L(135),
      eureka: ex,
    },
  };
}

/** The whole landing scene: sky, skyline, cross, the city below and six streets to the cross. */
export function skylineScene(): SkylineScene {
  const hz = HORIZON;
  const cx = CROSS_X;
  const shapes: Shape[] = [];
  base(shapes, hz);
  const { buildings, landmarks } = skyline(shapes, hz, SCALE, cx, 5);
  const crossBase = hz + 1;
  const crossHeight = 44;
  cross(shapes, cx, crossBase, crossHeight);

  shapes.push({ tag: "rect", attrs: { x: 0, y: hz, width: W, height: H - hz, fill: "#070a11" } });
  shapes.push({ tag: "rect", attrs: { x: 0, y: hz, width: W, height: H - hz }, paint: "wash", cls: "wash", delay: 0.9 });

  // rooftops of the city below, larger towards the viewer
  const r = seededRandom(9);
  for (let row = 0; row < 16; row++) {
    const t = Math.pow((row + 1) / 16, 1.7);
    const y = hz + (H - hz) * t;
    const sz = 3 + 26 * t;
    for (let x = -40; x < W + 40; x += sz * 1.7) {
      if (r() < 0.35) continue;
      shapes.push({
        tag: "rect",
        attrs: {
          x: fixed(x, 1),
          y: fixed(y - sz * 0.6, 1),
          width: fixed(sz * 1.2, 1),
          height: fixed(sz * 0.6, 1),
          rx: 1.5,
          fill: r() < 0.5 ? "#0d121e" : "#0b0f19",
        },
      });
      if (r() < 0.12) {
        shapes.push({
          tag: "rect",
          attrs: { x: fixed(x + sz * 0.4, 1), y: fixed(y - sz * 0.45, 1), width: fixed(sz * 0.25, 1), height: fixed(sz * 0.2, 1) },
          cls: "lit",
          delay: fixed(2 + t * 3 + r(), 2),
        });
      }
    }
  }

  // six streets from the foreground to the cross, with lamps coming on towards the viewer
  const ends = [-700, -250, 200, 1000, 1450, 1900];
  const streets: Street[] = [];
  for (const ex of ends) {
    streets.push({ top: [cx, hz], bottom: [ex, H] });
    shapes.push({ tag: "path", attrs: { d: `M${cx - 2} ${hz} L${cx + 2} ${hz} L${ex + 55} ${H} L${ex - 55} ${H} Z`, fill: "#10151f" } });
    for (let k = 1; k <= 7; k++) {
      const t = Math.pow(k / 7.5, 1.5);
      const x = cx + (ex - cx) * t;
      const y = hz + (H - hz) * t;
      const d = 2.2 + k * 0.38;
      shapes.push({ tag: "circle", attrs: { cx: x, cy: y, r: 26 * t + 4 }, paint: "soft", cls: "glow", delay: fixed(d, 2) });
      shapes.push({ tag: "circle", attrs: { cx: x, cy: y, r: 2.6 * t + 1 }, cls: "lit", delay: fixed(d, 2) });
    }
  }

  return {
    shapes,
    horizon: hz,
    cross: { x: cx, baseY: crossBase, height: crossHeight },
    landmarks,
    buildings,
    streets,
  };
}
