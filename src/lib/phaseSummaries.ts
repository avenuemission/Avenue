import { METRICS, type Person } from "./people";
import { GAUGES, type GaugeScores } from "./rpms";

// One-line summaries shown on closed expanders (round 2 spec 3 and 5).
// Pure, so the wording and the counting are pinned by tests.

// Henry to check wording
export const LEADER_HEALTH_INTRO =
  "How you are doing, in four gauges from Dave Ferguson's Multiplier. One check-in a week.";

// Henry to check wording
export const CHURCH_HEALTH_INTRO =
  "Who is moving in your community, in three lists: Pathways, Intersections, Streetlights.";

export const NOT_CHECKED_IN = "Not checked in this week";

// "This week: R 7 · P 5 · M 6 · S 8", or NOT_CHECKED_IN. Only the week the
// form edits counts: an older check-in is not this week's.
export function leaderHealthSummary(
  checkins: (GaugeScores & { weekStart: string })[],
  currentWeekStart: string
): string {
  const entry = checkins.find((c) => c.weekStart === currentWeekStart);
  if (!entry) return NOT_CHECKED_IN;
  return `This week: ${GAUGES.map((g) => `${g.letter} ${entry[g.key]}`).join(" · ")}`;
}

// Leader health opens by default only while this week's check-in is unsaved.
export function leaderHealthStartsOpen(checkins: { weekStart: string }[], currentWeekStart: string): boolean {
  return !checkins.some((c) => c.weekStart === currentWeekStart);
}

export const SAVING = "Saving...";
export const SAVE_FAILED = "Could not save. Open to try again.";

// The closed Leader health summary while a save is in flight or has failed
// (pre-flight F4): closing the expander hides the Save button's own state,
// so a failure must not hide behind the scores or "Not checked in".
export function leaderHealthStatus(summary: string, saving: boolean, saveError: string | null): string {
  if (saving) return SAVING;
  if (saveError) return SAVE_FAILED;
  return summary;
}

// "Named: 3 · 1 · 0" in Pathways, Intersections, Streetlights order. Three
// separate lists, so one person can count in more than one.
export function churchHealthSummary(people: Pick<Person, "metrics">[]): string {
  const counts = METRICS.map((m) => people.filter((p) => p.metrics.includes(m)).length);
  return `Named: ${counts.join(" · ")}`;
}

// The Multiply summary line under the person list (spec 5).
export function multiplySummary(depth: { people: number; generations: number }): string {
  if (depth.people === 0) return "Nobody sent out yet";
  const people = `${depth.people} ${depth.people === 1 ? "person" : "people"}`;
  const generations = `${depth.generations} ${depth.generations === 1 ? "generation" : "generations"}`;
  return `${people} multiplying through ${generations} below you`;
}
