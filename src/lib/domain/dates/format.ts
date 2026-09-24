// Date display for the whole site. Pure. Two kinds of input:
// - a calendar date "YYYY-MM-DD" (a guide's day, a check-in week) is shown
//   as that day, whatever the viewer's time zone;
// - a Date is an instant and is shown as Melbourne's day and clock time.
// Output is en-AU, the same text toLocaleDateString("en-AU", ...) gave.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MELBOURNE = "Australia/Melbourne";

type DateInput = string | Date;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-AU", options);
    formatters.set(key, f);
  }
  return f;
}

function calendarInstant(iso: string): Date {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`Not a real calendar date: ${iso}`);
  }
  return d;
}

function format(input: DateInput, options: Intl.DateTimeFormatOptions): string {
  if (typeof input === "string") return formatter({ ...options, timeZone: "UTC" }).format(calendarInstant(input));
  if (Number.isNaN(input.getTime())) throw new Error("format: invalid date");
  return formatter({ ...options, timeZone: MELBOURNE }).format(input);
}

// "14 Aug" or "14 August".
export function formatDayMonth(input: DateInput, month: "short" | "long" = "short"): string {
  return format(input, { day: "numeric", month });
}

// "24 September 2026".
export function formatLong(input: DateInput): string {
  return format(input, { day: "numeric", month: "long", year: "numeric" });
}

// "4 Aug 2026".
export function formatShortDate(input: DateInput): string {
  return format(input, { day: "numeric", month: "short", year: "numeric" });
}

// "September 2026".
export function formatMonthYear(input: DateInput): string {
  return format(input, { month: "long", year: "numeric" });
}

// "Thursday 24 September".
export function formatWeekdayDayMonth(input: DateInput): string {
  return format(input, { weekday: "long", day: "numeric", month: "long" });
}

// "Wed 30 Sept 2026", for calendar event listings.
export function formatEventDay(input: DateInput): string {
  return format(input, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// "7:30 pm", Melbourne time.
export function formatTime(instant: Date): string {
  return format(instant, { hour: "numeric", minute: "2-digit", hour12: true });
}
