// Launch (phase 3) maths for the rhythm tiles and the plan. Pure. Dates are
// YYYY-MM-DD and compared as calendar days in UTC, so daylight saving never
// shifts a count.
import { isIsoDate, WEEKDAYS, type Weekday } from "@/lib/journey";

const DAY_MS = 86_400_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function utcDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// JavaScript's getUTCDay: 0 is Sunday. WEEKDAYS starts at Monday.
function dayNumber(day: Weekday): number {
  return (WEEKDAYS.indexOf(day) + 1) % 7;
}

export function weeksUntil(launchDate: string, today: Date): number | null {
  if (!isIsoDate(launchDate)) return null;
  const days = (utcDay(launchDate) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY_MS;
  return days <= 0 ? 0 : Math.ceil(days / 7);
}

// Weekly gatherings from the launch date (inclusive) to the same date six
// calendar months later (exclusive). The first gathering is the first
// weeklyDay on or after the launch date.
export function gatheringsInFirstSixMonths(launchDate: string, weeklyDay: Weekday): number | null {
  if (!isIsoDate(launchDate)) return null;
  const [y, m, d] = launchDate.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const end = Date.UTC(y, m - 1 + 6, d);
  const totalDays = (end - start) / DAY_MS;
  const offset = (dayNumber(weeklyDay) - new Date(start).getUTCDay() + 7) % 7;
  return offset >= totalDays ? 0 : Math.floor((totalDays - 1 - offset) / 7) + 1;
}

export function formatIsoDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
