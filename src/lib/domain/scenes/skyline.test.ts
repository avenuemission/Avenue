import { describe, expect, it } from "vitest";
import { SKYLINE_HEIGHT, SKYLINE_WIDTH, skylineScene, type Shape } from "./skyline";

const scene = skylineScene();

/** Every shape, with group children flattened in paint order. */
const flat = (shapes: Shape[]): Shape[] => shapes.flatMap((s) => [s, ...flat(s.children ?? [])]);
const all = flat(scene.shapes);

const hasRect = (x: number, width: number) =>
  all.some((s) => s.tag === "rect" && Math.abs(Number(s.attrs.x) - x) < 1e-9 && Math.abs(Number(s.attrs.width) - width) < 1e-9);

describe("skylineScene", () => {
  it("is deterministic", () => {
    expect(skylineScene()).toEqual(scene);
  });

  it("uses the mockup's 1200 x 675 frame with the horizon at 250", () => {
    expect([SKYLINE_WIDTH, SKYLINE_HEIGHT]).toEqual([1200, 675]);
    expect(scene.horizon).toBe(250);
    expect(scene.shapes[0]).toEqual({ tag: "rect", attrs: { x: 0, y: 0, width: 1200, height: 675 }, paint: "sky" });
  });

  it("places the landmarks where draft 5 does (cross at 720, scale 0.72)", () => {
    const L = (dx: number) => 720 + dx * 0.72;
    expect(scene.landmarks.rialto).toEqual([L(-215), L(-181)]);
    expect(scene.landmarks.artsCentre).toBeCloseTo(640.8, 9);
    expect(scene.landmarks.australia108).toBeCloseTo(817.2, 9);
    expect(scene.landmarks.eureka).toBeCloseTo(874.8, 9);
    // Rialto twins and Eureka are drawn as rects at those x positions
    expect(hasRect(L(-215), 30 * 0.72)).toBe(true);
    expect(hasRect(L(-181), 26 * 0.72)).toBe(true);
    expect(hasRect(L(215), 34 * 0.72)).toBe(true);
  });

  it("gives Eureka its gold crown and Australia 108 its gold starburst and floor lines", () => {
    const crown = all.find((s) => s.tag === "rect" && s.attrs.x === scene.landmarks.eureka && s.cls === "lit");
    expect(crown?.delay).toBe(1.2);
    const x108 = scene.landmarks.australia108;
    const burst = all.find((s) => s.tag === "path" && s.cls === "lit" && s.delay === 1);
    expect(burst).toBeDefined();
    // the starburst reaches out on both sides of the tower
    const xs = String(burst?.attrs.d).match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(x108);
    expect(Math.max(...xs)).toBeGreaterThan(x108 + 34 * 0.72);
    const a108 = scene.buildings.find((b) => b.name === "australia108");
    expect(a108?.windows.length).toBeGreaterThan(8);
  });

  it("draws the Arts Centre spire with its lattice and lit skirt", () => {
    const sx = scene.landmarks.artsCentre;
    const spire = all.find((s) => s.tag === "path" && s.attrs.stroke === "#8fa3d6");
    expect(String(spire?.attrs.d)).toContain(`L${sx} ${250 - 245 * 0.72}`);
    expect(all.filter((s) => s.tag === "line" && s.attrs.stroke === "#5d6f9c")).toHaveLength(15);
    expect(all.some((s) => s.tag === "path" && s.attrs.fill === "#1a1512")).toBe(true);
  });

  it("keeps every lit window inside its building", () => {
    expect(scene.buildings.length).toBeGreaterThan(20);
    const eps = 0.051; // windows are rounded to one decimal place
    for (const b of scene.buildings) {
      for (const w of b.windows) {
        expect(w.x).toBeGreaterThanOrEqual(b.x - eps);
        expect(w.x + w.width).toBeLessThanOrEqual(b.x + b.width + eps);
        expect(w.y).toBeGreaterThanOrEqual(b.y - eps);
        expect(w.y + w.height).toBeLessThanOrEqual(b.y + b.height + eps);
      }
    }
  });

  it("puts the cross at the vanishing point of all six streets", () => {
    expect(scene.streets).toHaveLength(6);
    const { x, baseY } = scene.cross;
    expect(x).toBe(720);
    // every pair of street centre lines meets at one point: the horizon under the cross
    const slope = (s: (typeof scene.streets)[number]) => (s.top[0] - s.bottom[0]) / (s.top[1] - s.bottom[1]);
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const [a, b] = [scene.streets[i], scene.streets[j]];
        const y = (b.bottom[0] - a.bottom[0] + slope(a) * a.bottom[1] - slope(b) * b.bottom[1]) / (slope(a) - slope(b));
        const vx = a.bottom[0] + slope(a) * (y - a.bottom[1]);
        expect(y).toBeCloseTo(scene.horizon, 6);
        expect(vx).toBeCloseTo(x, 6);
        expect(Math.abs(baseY - y)).toBeLessThan(1.001); // the foot sits 1 px into the ground
      }
    }
  });

  it("builds the cross first and lights the streets from the horizon towards the viewer", () => {
    const crossGroup = all.find((s) => s.tag === "g");
    expect(crossGroup).toMatchObject({ cls: "fade", delay: 0 });
    expect(crossGroup?.children).toHaveLength(2);
    const lamps = all.filter((s) => s.tag === "circle" && s.cls === "lit" && Number(s.attrs.cy) > 250);
    expect(lamps).toHaveLength(42);
    const first = lamps.slice(0, 7).map((l) => l.delay);
    expect(first).toEqual([2.58, 2.96, 3.34, 3.72, 4.1, 4.48, 4.86]);
  });
});
