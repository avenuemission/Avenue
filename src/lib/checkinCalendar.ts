import { mondayOf, recentMondays } from "./weeks";

// The Recent weeks calendar (round 2 spec 3.2): a month grid, Monday first,
// one row per week, with each week's check-in attached. Everything is built
// from local-time Date parts, the same way weeks.ts does, so a week never
// drifts by a day in a zone behind UTC.

export interface MonthRef {
  year: number;
  month: number; // 0 to 11
}

export interface CalendarDay {
  iso: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

export interface CalendarWeek<T> {
  weekStart: string; // the row's Monday, YYYY-MM-DD
  days: CalendarDay[];
  checkin: T | null;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface MonthBounds {
  min: MonthRef;
  max: MonthRef;
}

function isoOf(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthOfDate(date: Date): MonthRef {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthOf(iso: string): MonthRef {
  return monthOfDate(parseIso(iso));
}

// Negative when a is before b, 0 when equal, positive when after.
export function compareMonths(a: MonthRef, b: MonthRef): number {
  return (a.year - b.year) * 12 + (a.month - b.month);
}

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  return monthOfDate(new Date(m.year, m.month + delta, 1));
}

export function canShift(view: MonthRef, delta: number, bounds: MonthBounds): boolean {
  const next = shiftMonth(view, delta);
  return compareMonths(next, bounds.min) >= 0 && compareMonths(next, bounds.max) <= 0;
}

// Every week that touches the month, Monday first. Days from the months
// either side are included (inMonth false) so each row has seven days.
export function monthWeeks<T extends { weekStart: string }>(
  view: MonthRef,
  checkins: T[],
  currentWeekStart: string
): CalendarWeek<T>[] {
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const lastDay = new Date(view.year, view.month + 1, 0);
  let start = parseIso(mondayOf(new Date(view.year, view.month, 1)));
  const weeks: CalendarWeek<T>[] = [];
  while (start.getTime() <= lastDay.getTime()) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      days.push({ iso: isoOf(d), day: d.getDate(), inMonth: d.getMonth() === view.month });
    }
    const weekStart = isoOf(start);
    weeks.push({
      weekStart,
      days,
      checkin: byWeek.get(weekStart) ?? null,
      isCurrent: weekStart === currentWeekStart,
      isFuture: weekStart > currentWeekStart,
    });
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  }
  return weeks;
}

// How far the month buttons go: back to the oldest check-in or twelve weeks,
// whichever is earlier, and never past the current month.
export function monthBounds(checkinWeeks: string[], today: Date, historyCount = 12): MonthBounds {
  const recent = recentMondays(historyCount, today);
  let oldest = recent[recent.length - 1];
  for (const w of checkinWeeks) if (w < oldest) oldest = w;
  return { min: monthOf(oldest), max: monthOfDate(today) };
}

// "14 Sep" (short) or "14 September" (long).
export function formatWeekLabel(weekStart: string, month: "short" | "long" = "short"): string {
  return parseIso(weekStart).toLocaleDateString("en-AU", { day: "numeric", month });
}

// "September 2026".
export function monthLabel(view: MonthRef): string {
  return new Date(view.year, view.month, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
