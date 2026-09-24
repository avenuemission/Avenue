"use client";

import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { GAUGES } from "@/lib/rpms";
import { CHART_BOX, gaugeSegments, labelIndexes, segmentPath, xFor, yFor } from "@/lib/checkinChart";
import { formatWeekLabel } from "@/lib/checkinCalendar";

export interface CheckinTrendProps {
  weeks: string[]; // oldest first
  checkins: CheckinEntry[];
  selected: string | null;
  onSelect: (weekStart: string) => void;
}

const Y_TICKS = [1, 5, 10];

// Round 2 spec 3.2: an inline SVG line chart, one line per gauge in its
// colour, y from 1 to 10, a missed week leaves a gap. No chart library.
// A transparent button column over each week makes the whole column a tap
// target for that week's detail. The columns are narrower than 44 px at
// phone width; that is accepted because the calendar rows are the
// full-size, keyboard-first route to the same detail (pre-flight F10).
export default function CheckinTrend({ weeks, checkins, selected, onSelect }: CheckinTrendProps) {
  const box = CHART_BOX;
  const n = weeks.length;
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const selectedIndex = selected ? weeks.indexOf(selected) : -1;
  const inner = box.width - box.padLeft - box.padRight;
  const step = n > 1 ? inner / (n - 1) : inner;
  const plotBottom = box.height - box.padBottom;

  return (
    <figure>
      <figcaption className="sr-only">
        Your four gauges over the last {n} weeks, one line each. A missed week leaves a gap.
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${box.width} ${box.height}`} className="block h-auto w-full" aria-hidden="true">
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line
                x1={box.padLeft}
                x2={box.width - box.padRight}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text x={box.padLeft - 8} y={yFor(v)} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--dim)">
                {v}
              </text>
            </g>
          ))}
          {selectedIndex >= 0 ? (
            <line
              x1={xFor(selectedIndex, n)}
              x2={xFor(selectedIndex, n)}
              y1={box.padTop}
              y2={plotBottom}
              stroke="var(--line-2)"
              strokeWidth={1}
            />
          ) : null}
          {GAUGES.map((g) =>
            gaugeSegments(weeks, checkins, g.key).map((segment) => (
              <g key={`${g.key}-${segment[0].week}`}>
                {segment.length > 1 ? (
                  <path
                    d={segmentPath(segment)}
                    fill="none"
                    stroke={g.colour}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {segment.map((p) => (
                  <circle key={p.week} cx={p.x} cy={p.y} r={p.week === selected ? 4 : 2.5} fill={g.colour} />
                ))}
              </g>
            ))
          )}
          {labelIndexes(n).map((i) => (
            <text key={weeks[i]} x={xFor(i, n)} y={box.height - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">
              {formatWeekLabel(weeks[i])}
            </text>
          ))}
        </svg>
        {weeks.map((week, i) => {
          const x0 = Math.max(0, xFor(i, n) - step / 2);
          const x1 = Math.min(box.width, xFor(i, n) + step / 2);
          return (
            <button
              key={week}
              type="button"
              onClick={() => onSelect(week)}
              aria-pressed={selected === week}
              aria-label={`Week of ${formatWeekLabel(week, "long")}: ${byWeek.has(week) ? "checked in" : "no check-in"}`}
              className="absolute top-0 bottom-0 rounded-md"
              style={{ left: `${(x0 / box.width) * 100}%`, width: `${((x1 - x0) / box.width) * 100}%` }}
            />
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        {GAUGES.map((g) => (
          <li key={g.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: g.colour }} />
            {g.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
