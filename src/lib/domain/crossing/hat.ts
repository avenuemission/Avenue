// The Cross the Avenue player wears a Santa hat for Christmas 2026. It comes
// off by itself on 1 January 2027 (Melbourne time), so no one has to
// remember to remove it. Pure.
import { melbourneDateOf } from "@/lib/domain/dates/melbourne";

// The first Melbourne day without the hat.
const HAT_OFF_FROM = "2027-01-01";

export function wearsSantaHat(now: Date): boolean {
  return melbourneDateOf(now) < HAT_OFF_FROM;
}
