"use client";

import { useState } from "react";

export interface CheckinEntry {
  weekStart: string; // YYYY-MM-DD, a Monday
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
  reflection: string | null;
  updatedAt: string;
}

interface CheckinHistoryProps {
  // Recent Mondays to render, oldest first. Weeks with no matching entry in
  // `checkins` render as neutral, empty blocks, never red: a leader who
  // missed a month should see silence, not a warning.
  weeks: string[];
  checkins: CheckinEntry[];
}

function averageScore(c: CheckinEntry): number {
  return (c.relational + c.physical + c.mental + c.spiritual) / 4;
}

// One hue only, the app's single accent, varying only in strength with the
// week's average. A missed week gets no accent at all rather than a lighter
// shade of it, so "tracked but low" and "not tracked" never look alike.
function blockStyle(avg: number | null): { background: string; border: string } {
  if (avg === null) {
    return { background: "var(--surface)", border: "1px dashed var(--border)" };
  }
  let alpha = 0.18;
  if (avg >= 8) alpha = 1;
  else if (avg >= 6) alpha = 0.6;
  else if (avg >= 4) alpha = 0.35;
  return { background: `rgba(79, 124, 255, ${alpha})`, border: "1px solid var(--border)" };
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00`);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

const GAUGES: { key: keyof Pick<CheckinEntry, "relational" | "physical" | "mental" | "spiritual">; label: string }[] = [
  { key: "relational", label: "Relational" },
  { key: "physical", label: "Physical" },
  { key: "mental", label: "Mental" },
  { key: "spiritual", label: "Spiritual" },
];

// Presentational: renders whatever weeks and check-ins it is given. Recent
// weeks as small blocks, coloured by that week's average of the four RPMS
// scores. Clicking a week reveals what was written, or says plainly that
// nothing was recorded, without implying the leader did anything wrong.
export default function CheckinHistory({ weeks, checkins }: CheckinHistoryProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const selectedCheckin = selected ? byWeek.get(selected) ?? null : null;

  if (weeks.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {weeks.map((week) => {
          const entry = byWeek.get(week) ?? null;
          const avg = entry ? averageScore(entry) : null;
          const isSelected = selected === week;
          return (
            <button
              key={week}
              type="button"
              onClick={() => setSelected(isSelected ? null : week)}
              aria-pressed={isSelected}
              title={
                entry
                  ? `Week of ${formatWeekLabel(week)}: average ${avg!.toFixed(1)} of 10`
                  : `Week of ${formatWeekLabel(week)}: no check-in`
              }
              className={`w-8 h-8 rounded-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                isSelected ? "scale-110 ring-2 ring-[var(--accent)]" : ""
              }`}
              style={blockStyle(avg)}
            >
              <span className="sr-only">Week of {formatWeekLabel(week)}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Week of {formatWeekLabel(selected)}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-[var(--muted)] hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
          {selectedCheckin ? (
            <>
              <div className="grid grid-cols-4 gap-3 text-center mb-3">
                {GAUGES.map(({ key, label }) => (
                  <div key={key}>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</div>
                    <div className="text-lg font-bold text-white">{selectedCheckin[key]}</div>
                  </div>
                ))}
              </div>
              {selectedCheckin.reflection ? (
                <p className="text-sm text-[var(--muted)] leading-relaxed">{selectedCheckin.reflection}</p>
              ) : (
                <p className="text-sm text-[var(--muted)] italic">No reflection written that week.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">No check-in recorded for this week.</p>
          )}
        </div>
      )}
    </div>
  );
}
