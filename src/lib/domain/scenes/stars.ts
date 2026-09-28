import { round, seededRandom } from "./seeded";

export interface Star {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
}

/** Stars per scene, as in the approved mockup (Vision has none). */
export const STAR_COUNTS = { pathways: 28, intersection: 30, streetlights: 30 } as const;

/** A fixed star field across a 600 wide sky band of the given height. */
export function starField(count: number, height: number, seed = 7): Star[] {
  const rnd = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    cx: round(rnd() * 600, 1),
    cy: round(rnd() * height, 1),
    r: round(rnd() * 1 + 0.4, 2),
    opacity: round(rnd() * 0.5 + 0.2, 2),
  }));
}
