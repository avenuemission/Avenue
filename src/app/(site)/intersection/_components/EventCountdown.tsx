"use client";

import CountdownTimer from "@/components/site/CountdownTimer";
import { nextEventStart, type IntersectionEventDate } from "@/lib/domain/content";
import { nextMelbourneWeekly } from "@/lib/domain/dates/melbourne";

const WEDNESDAY = 3;

// Counts down to the event's next listed date. Prayer & Praise is weekly
// (Wednesday 7 pm, Melbourne), so with no listed date ahead it counts down
// to the next Wednesday.
export default function EventCountdown({ dates }: { dates: IntersectionEventDate[] }) {
  return (
    <CountdownTimer
      variant="event"
      target={(now) => nextEventStart(dates, now) ?? nextMelbourneWeekly(now, WEDNESDAY, 19)}
      placeholder={<p className="text-gray-400 text-sm">Loading...</p>}
    />
  );
}
