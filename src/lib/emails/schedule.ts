// Which leader emails are due at a moment (spec 3.2 timing). Pure.
// A kind is due from its Melbourne send hour to its last hour that
// Melbourne day, so a missed or overloaded hourly run is picked up by the
// next one. The email log (unique email, kind, period_key) stops a second
// send. Milestones are a morning check (spec: daily 07:00), with the 08:00
// and 09:00 runs as retries, so nobody is congratulated late at night.
import { melbourneParts, monthKeyOf } from "@/lib/domain/dates/melbourne";
import { EMAIL_KINDS, type EmailKind } from "./prefs";

export const SEND_HOUR: Record<EmailKind, number> = {
  rpms: 18, // Sunday
  digest: 7, // Monday
  church_health: 7, // 1st of the month
  apprentice: 7, // 15th of the month
  milestones: 7, // every day
};

// The last Melbourne hour a kind is still due, inclusive.
export const LAST_HOUR: Record<EmailKind, number> = {
  rpms: 23,
  digest: 23,
  church_health: 23,
  apprentice: 23,
  milestones: 9,
};

export function dueKinds(now: Date): EmailKind[] {
  const t = melbourneParts(now);
  return EMAIL_KINDS.filter((kind) => {
    if (t.hour < SEND_HOUR[kind] || t.hour > LAST_HOUR[kind]) return false;
    switch (kind) {
      case "rpms":
        return t.weekday === 0;
      case "digest":
        return t.weekday === 1;
      case "church_health":
        return t.day === 1;
      case "apprentice":
        return t.day === 15;
      case "milestones":
        return true;
    }
  });
}

export type PeriodicKind = Exclude<EmailKind, "milestones">;

// The log key for one send of a periodic kind. Milestones key themselves
// (compose.ts milestoneKey).
export function periodKeyFor(kind: PeriodicKind, now: Date): string {
  const { date } = melbourneParts(now);
  return kind === "rpms" || kind === "digest" ? date : monthKeyOf(date);
}
