import type { GaugeKey, GaugeScores } from "@/lib/domain/rpms";

// The Recent weeks trend (round 2 spec 3.2): one line per gauge over the
// last twelve weeks, y from 1 (bottom) to 10 (top). A missed week breaks
// the line, so each gauge is a list of segments rather than one path.

export interface ChartBox {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

// The SVG viewBox the component draws in: room on the left for the 1, 5 and
// 10 labels and at the bottom for the week labels.
export const CHART_BOX: ChartBox = { width: 320, height: 168, padLeft: 24, padRight: 10, padTop: 10, padBottom: 26 };

export interface ChartPoint {
  week: string;
  index: number;
  x: number;
  y: number;
  score: number;
}

export function xFor(index: number, count: number, box: ChartBox = CHART_BOX): number {
  const inner = box.width - box.padLeft - box.padRight;
  if (count <= 1) return box.padLeft + inner / 2;
  return box.padLeft + (inner * index) / (count - 1);
}

export function yFor(score: number, box: ChartBox = CHART_BOX): number {
  const inner = box.height - box.padTop - box.padBottom;
  return box.padTop + ((10 - score) / 9) * inner;
}

export function gaugeSegments<T extends GaugeScores & { weekStart: string }>(
  weeks: string[],
  checkins: T[],
  gauge: GaugeKey,
  box: ChartBox = CHART_BOX
): ChartPoint[][] {
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];
  weeks.forEach((week, index) => {
    const entry = byWeek.get(week);
    if (!entry) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    const score = entry[gauge];
    current.push({ week, index, x: xFor(index, weeks.length, box), y: yFor(score, box), score });
  });
  if (current.length > 0) segments.push(current);
  return segments;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function segmentPath(points: ChartPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${round2(p.x)} ${round2(p.y)}`).join(" ");
}

// Which weeks get an x label: every `every`th week, counting back from the
// newest (the last index), so this week is always labelled.
export function labelIndexes(count: number, every = 3): number[] {
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i -= every) out.unshift(i);
  return out;
}
