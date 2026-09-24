// Leader support calls run in Melbourne time: Thursdays at 6 pm and
// Saturdays at 2 pm. Pure: the slots are instants, the same whatever the
// viewer's time zone.
import { addDaysISO, melbourneDateOf, melbourneInstant } from "@/lib/domain/dates/melbourne";

const THURSDAY = 4;
const SATURDAY = 6;

// The next three of each still ahead of `now`, looking three weeks out.
export function upcomingCallSlots(now: Date): { thursdays: Date[]; saturdays: Date[] } {
  const thursdays: Date[] = [];
  const saturdays: Date[] = [];
  const today = melbourneDateOf(now);
  for (let i = 0; i < 21; i++) {
    const day = addDaysISO(today, i);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    const slot =
      weekday === THURSDAY ? { list: thursdays, hour: 18 } : weekday === SATURDAY ? { list: saturdays, hour: 14 } : null;
    if (!slot || slot.list.length >= 3) continue;
    const start = melbourneInstant(day, slot.hour);
    if (start.getTime() > now.getTime()) slot.list.push(start);
  }
  return { thursdays, saturdays };
}
