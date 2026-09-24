// When a milestone plays its moment and when a small action glows (spec 3).
// Pure. Nothing is stored: a moment plays only when a flag is seen false and
// then true while the page is open, so a reload never replays one.
import { STOP_NAMES, type StopId } from "@/lib/domain/avenue";
import { formatIsoDate } from "@/lib/domain/launch";
import { formatLong } from "@/lib/domain/dates/format";

export type Flags = Record<string, boolean>;

// Priority order: a phase walked outranks the smaller milestones.
export const MOMENT_KEYS = [
  "walked:phase1",
  "walked:phase2",
  "walked:phase3",
  "walked:phase4",
  "walked:phase5",
  "sharedYes",
  "conversationBooked",
  "launchDate",
] as const;
export type MomentKey = (typeof MOMENT_KEYS)[number];

// The first call records a baseline and fires nothing. A key that appears
// later (its data has just loaded) is recorded without firing. A key that
// drops out while its data reloads keeps its last seen value.
export function advanceFlags(seen: Flags | null, now: Flags): { seen: Flags; fired: string[] } {
  const fired = seen === null ? [] : Object.keys(now).filter((k) => seen[k] === false && now[k] === true);
  return { seen: { ...(seen ?? {}), ...now }, fired };
}

// A stable string for a set of flags, so a hook can tell when they changed.
export function flagsSignature(flags: Flags): string {
  return JSON.stringify(
    Object.keys(flags)
      .sort()
      .map((k) => [k, flags[k]])
  );
}

export function pickMoment(fired: string[]): MomentKey | null {
  for (const key of MOMENT_KEYS) if (fired.includes(key)) return key;
  return null;
}

export interface MomentCopy {
  title: string;
  caption: string;
}

export function momentCopy(key: MomentKey, ctx: { today: Date; launchDate?: string }): MomentCopy {
  switch (key) {
    case "sharedYes": {
      const day = formatLong(ctx.today);
      return { title: "You said yes.", caption: `${day} · the Shared Call` };
    }
    case "conversationBooked":
      return { title: "Conversation booked.", caption: "Your theology and character conversation with a pastor." };
    case "launchDate":
      return {
        title: "Your launch date is set.",
        caption: ctx.launchDate ? `Launching ${formatIsoDate(ctx.launchDate)}` : "Your streetlight has a date.",
      };
    default: {
      const id = key.slice("walked:".length) as StopId;
      return { title: `${STOP_NAMES[id]} is walked.`, caption: "A streetlight is on, and it stays on." };
    }
  }
}

export type GlowTrigger = string | number | null;

// A lamp glows when it lights (null to a value), a count glows when it goes
// up. Going out, going down or staying the same never glows.
export function shouldGlow(prev: GlowTrigger, next: GlowTrigger): boolean {
  if (next === null || Object.is(prev, next)) return false;
  if (typeof prev === "number" && typeof next === "number") return next > prev;
  return true;
}
