// Melbourne calendar helpers. Pure. Every leader is in Melbourne, so
// "today", "this week" and "this month" are Melbourne's. Daylight saving
// comes from the platform's time zone database, never a fixed +10 or +11.
// Calendar dates are plain "YYYY-MM-DD" strings and day arithmetic runs in
// UTC on those strings, so it never drifts by an hour or a day.

export interface MelbourneParts {
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1 to 12
  day: number;
  hour: number; // 0 to 23
  weekday: number; // 0 Sunday to 6 Saturday
}

const FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Australia/Melbourne",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export function melbourneParts(now: Date): MelbourneParts {
  if (Number.isNaN(now.getTime())) throw new Error("melbourneParts: invalid date");
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of FORMAT.formatToParts(now)) parts[part.type] = part.value;
  const weekday = parts.weekday === undefined ? undefined : WEEKDAYS[parts.weekday];
  if (!parts.year || !parts.month || !parts.day || !parts.hour || weekday === undefined) {
    throw new Error("melbourneParts: could not read the Melbourne date");
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some engines print midnight as "24" even with h23.
    hour: Number(parts.hour) % 24,
    weekday,
  };
}

export function melbourneDateOf(instant: string | Date): string {
  return melbourneParts(new Date(instant)).date;
}

function utcOf(iso: string): number {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isoOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  return isoOf(utcOf(iso) + days * DAY_MS);
}

// `to` minus `from`, in whole days.
export function daysBetweenISO(from: string, to: string): number {
  return Math.round((utcOf(to) - utcOf(from)) / DAY_MS);
}

// Weeks run Monday to Sunday, matching leader_checkins.week_start.
export function mondayOfISO(iso: string): string {
  const dow = new Date(utcOf(iso)).getUTCDay();
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow);
}

// The Monday of the Melbourne week that `now` falls in: the week_start a
// check-in made at `now` is saved under. The same answer on any machine.
export function mondayOf(now: Date): string {
  return mondayOfISO(melbourneDateOf(now));
}

// This week's Monday and the ones before it, newest first.
export function recentMondays(count: number, now: Date): string[] {
  const first = mondayOf(now);
  return Array.from({ length: count }, (_, i) => addDaysISO(first, -7 * i));
}

// The instant Melbourne's clocks read `hour`:`minute` on the calendar day
// `iso`. Melbourne is UTC+10 or UTC+11 (daylight saving); the one that
// gives back the same wall-clock time is the answer.
export function melbourneInstant(iso: string, hour: number, minute = 0): Date {
  const wall = utcOf(iso) + (hour * 60 + minute) * 60_000;
  for (const offsetHours of [11, 10]) {
    const instant = new Date(wall - offsetHours * 3_600_000);
    const parts = melbourneParts(instant);
    if (parts.date === iso && parts.hour === hour) return instant;
  }
  throw new Error(`melbourneInstant: ${iso} ${hour}:${minute} does not exist in Melbourne`);
}

// The next time after `now` that it is `hour`:00 on `weekday` (0 Sunday to
// 6 Saturday) in Melbourne, e.g. Prayer & Praise, Wednesday 7 pm.
export function nextMelbourneWeekly(now: Date, weekday: number, hour: number): Date {
  const today = melbourneParts(now);
  const ahead = (weekday - today.weekday + 7) % 7;
  const candidate = melbourneInstant(addDaysISO(today.date, ahead), hour);
  return candidate.getTime() > now.getTime() ? candidate : melbourneInstant(addDaysISO(today.date, ahead + 7), hour);
}

export function monthKeyOf(iso: string): string {
  utcOf(iso);
  return iso.slice(0, 7);
}

export function addMonthsKey(key: string, months: number): string {
  const m = MONTH_KEY.exec(key);
  if (!m) throw new Error(`Not a YYYY-MM month: ${key}`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const m = MONTH_KEY.exec(key);
  if (!m) throw new Error(`Not a YYYY-MM month: ${key}`);
  return `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
}

export function dayMonthLabel(iso: string): string {
  utcOf(iso);
  return `${Number(iso.slice(8, 10))} ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]}`;
}
