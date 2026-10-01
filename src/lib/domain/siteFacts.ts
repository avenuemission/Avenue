// Plain-English and machine forms of AVENUE_FACTS. Pure. The footer, the
// FAQ, the JSON-LD and /llms.txt all format the facts through here, so the
// venue, the time and the email read the same everywhere.
import { AVENUE_FACTS, SOCIAL_LINKS } from "@/content/site";
import { melbourneInstant, melbourneParts, nextMelbourneWeekly } from "./dates/melbourne";

const { venue, prayerAndPraise } = AVENUE_FACTS;

// "Mont Albert Church, 43 York St, Surrey Hills VIC 3127"
export const VENUE_LINE = `${venue.name}, ${venue.street}, ${venue.locality} ${venue.region} ${venue.postcode}`;

// 19 -> "7 pm", 12 -> "12 pm", 0 -> "12 am".
export function hourLabel(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error(`hourLabel: not an hour: ${hour}`);
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "am" : "pm"}`;
}

// "Wednesdays, 7 pm to 9 pm"
export const PRAYER_AND_PRAISE_WHEN = `${prayerAndPraise.day}s, ${hourLabel(prayerAndPraise.startHour)} to ${hourLabel(prayerAndPraise.endHour)}`;

// The public social profiles (the calendar link is not a profile).
export const SOCIAL_PROFILES = [
  { name: "Instagram", url: SOCIAL_LINKS.instagram },
  { name: "Facebook", url: SOCIAL_LINKS.facebook },
  { name: "YouTube", url: SOCIAL_LINKS.youtube },
  { name: "LinkedIn", url: SOCIAL_LINKS.linkedin },
];

// The next Prayer & Praise after `now`: the navbar countdown target, and the
// startDate of the Event in the Intersection page's JSON-LD.
export function nextPrayerAndPraise(now: Date): Date {
  return nextMelbourneWeekly(now, prayerAndPraise.weekday, prayerAndPraise.startHour);
}

// `hour`:00 on Melbourne calendar day `iso`, as ISO 8601 with Melbourne's
// offset that day, e.g. "2026-10-07T19:00:00+11:00".
export function melbourneIsoAt(iso: string, hour: number): string {
  const instant = melbourneInstant(iso, hour);
  const offsetMinutes = (Date.parse(`${iso}T00:00:00Z`) + hour * 3_600_000 - instant.getTime()) / 60_000;
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${iso}T${pad(hour)}:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Start and end of the next Prayer & Praise after `now`, Melbourne time.
export function nextPrayerAndPraiseTimes(now: Date): { start: string; end: string } {
  const day = melbourneParts(nextPrayerAndPraise(now)).date;
  return {
    start: melbourneIsoAt(day, prayerAndPraise.startHour),
    end: melbourneIsoAt(day, prayerAndPraise.endHour),
  };
}
