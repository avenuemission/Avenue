"use client";

import { useState } from "react";
import CheckinCalendar from "@/components/leaders/growth/CheckinCalendar";
import CheckinTrend from "@/components/leaders/growth/CheckinTrend";
import WeekDetail from "@/components/leaders/growth/WeekDetail";
import { monthBounds, monthOf, monthOfDate, type MonthRef } from "@/lib/domain/checkins/calendar";
import type { CheckinEntry } from "@/lib/domain/checkins/types";

interface CheckinHistoryProps {
  // The last twelve Mondays, oldest first: the trend's x axis.
  weeks: string[];
  checkins: CheckinEntry[];
  // The Monday the check-in form edits: ringed in the calendar.
  currentWeekStart: string;
}

// Recent weeks (round 2 spec 3.2): a month calendar and a 12-week trend,
// side by side from md, with the tapped week's detail below. Presentational:
// built only from the check-ins it is given, nothing is loaded or saved.
export default function CheckinHistory({ weeks, checkins, currentWeekStart }: CheckinHistoryProps) {
  const [today] = useState(() => new Date());
  const [view, setView] = useState<MonthRef>(() => monthOfDate(today));
  const [selected, setSelected] = useState<string | null>(null);

  if (weeks.length === 0) return null;

  const bounds = monthBounds(
    checkins.map((c) => c.weekStart),
    today,
    weeks.length
  );
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const toggle = (week: string) => setSelected((prev) => (prev === week ? null : week));

  return (
    <div>
      <div className="grid gap-10 md:grid-cols-2 md:gap-8">
        <CheckinCalendar
          view={view}
          bounds={bounds}
          onView={setView}
          checkins={checkins}
          currentWeekStart={currentWeekStart}
          selected={selected}
          onSelect={toggle}
        />
        <CheckinTrend
          weeks={weeks}
          checkins={checkins}
          selected={selected}
          onSelect={(week) => {
            toggle(week);
            // Show the tapped week in the calendar too.
            setView(monthOf(week));
          }}
        />
      </div>
      {selected ? (
        <WeekDetail week={selected} checkin={byWeek.get(selected) ?? null} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
