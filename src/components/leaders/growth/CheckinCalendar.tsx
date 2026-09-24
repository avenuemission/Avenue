"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CheckinEntry } from "@/lib/domain/checkins/types";
import { GAUGES } from "@/lib/domain/rpms";
import {
  calendarMonthLabel,
  canShift,
  formatWeekLabel,
  monthWeeks,
  shiftMonth,
  type CalendarWeek,
  type MonthBounds,
  type MonthRef,
} from "@/lib/domain/checkins/calendar";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// The accessible name of a week row: when it is, and what was recorded.
function weekName(w: CalendarWeek<CheckinEntry>): string {
  const when = `Week of ${formatWeekLabel(w.weekStart, "long")}${w.isCurrent ? ", this week" : ""}`;
  const c = w.checkin;
  if (!c) return `${when}: no check-in`;
  return `${when}: checked in, ${GAUGES.map((g) => `${g.label} ${c[g.key]}`).join(", ")}`;
}

export interface CheckinCalendarProps {
  view: MonthRef;
  bounds: MonthBounds;
  onView: (next: MonthRef) => void;
  checkins: CheckinEntry[];
  currentWeekStart: string;
  selected: string | null;
  onSelect: (weekStart: string) => void;
}

// Round 2 spec 3.2: one month, Monday first, one tappable row per week. A
// checked-in week has a warm lamp dot at its start and a thin bar per gauge
// (its length is the score). The current week is ringed in blue. Weeks with
// no check-in stay quiet, never red; weeks still to come show but are
// disabled. The month buttons stop at the bounds.
export default function CheckinCalendar({
  view,
  bounds,
  onView,
  checkins,
  currentWeekStart,
  selected,
  onSelect,
}: CheckinCalendarProps) {
  const weeks = monthWeeks(view, checkins, currentWeekStart);
  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onView(shiftMonth(view, -1))}
          disabled={!canShift(view, -1, bounds)}
          aria-label="Previous month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="font-serif text-xl text-[var(--ink)]" aria-live="polite">
          {calendarMonthLabel(view)}
        </p>
        <button
          type="button"
          onClick={() => onView(shiftMonth(view, 1))}
          disabled={!canShift(view, 1, bounds)}
          aria-label="Next month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="night-label mt-3 grid grid-cols-7 px-3 text-center" aria-hidden="true">
        {DAY_LETTERS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <ul className="mt-1 space-y-1">
        {weeks.map((w) => {
          const isSelected = selected === w.weekStart;
          const checkin = w.checkin;
          return (
            <li key={w.weekStart}>
              <button
                type="button"
                disabled={w.isFuture}
                onClick={() => onSelect(w.weekStart)}
                aria-pressed={isSelected}
                aria-label={weekName(w)}
                className={`relative block min-h-[44px] w-full rounded-xl border-2 px-3 py-1.5 text-left disabled:cursor-default ${
                  w.isCurrent ? "border-[var(--accent)]" : "border-transparent"
                } ${isSelected ? "bg-[var(--night-2)]" : ""}`}
              >
                {checkin ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-1 top-3 h-1.5 w-1.5 rounded-full bg-[var(--lamp)] shadow-[0_0_8px_2px_rgba(255,197,107,0.45)]"
                  />
                ) : null}
                <span aria-hidden="true" className="grid grid-cols-7 text-center text-sm tabular-nums">
                  {w.days.map((d) => (
                    <span
                      key={d.iso}
                      className={d.inMonth && !w.isFuture ? "text-[var(--ink)]" : "text-[var(--dim)]"}
                    >
                      {d.day}
                    </span>
                  ))}
                </span>
                {checkin ? (
                  <span aria-hidden="true" className="mt-1 grid grid-cols-4 gap-1">
                    {GAUGES.map((g) => (
                      <span key={g.key} className="block h-[3px] rounded-full bg-[var(--line-2)]">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${checkin[g.key] * 10}%`, background: g.colour }}
                        />
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
