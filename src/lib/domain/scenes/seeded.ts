// Small deterministic helpers shared by the night scenes. Pure: no React.

/** The mockup's linear congruential generator: same seed, same sequence. */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** A delay or duration as a CSS time, rounded to hundredths ("3.24s"). */
export function seconds(n: number): string {
  return `${round(n, 2)}s`;
}

export function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
