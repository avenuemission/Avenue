// Church health for the admin tab (spec 2026-09-24 church health emails,
// section 2). Pure: the route loads rows and calls buildChurchHealth.
// History is reconstructed from record dates: a person counts from the
// Melbourne month their leader_people row was created, and a removed person
// is no longer counted anywhere. Only rows owned by a `leaders` row count.
import { METRICS, type Metric } from "@/lib/domain/people";
import type { GaugeScores } from "@/lib/domain/rpms";
import {
  addDaysISO,
  addMonthsKey,
  daysBetweenISO,
  melbourneDateOf,
  melbourneParts,
  mondayOfISO,
  monthKeyOf,
} from "@/lib/domain/dates/melbourne";

export type MetricCounts = Record<Metric, number>;

// Henry to check wording
export const METRIC_LABELS: Record<Metric, string> = {
  pathways: "Pathways",
  intersections: "Intersections",
  streetlights: "Streetlights",
};

// Henry to check wording
export const NO_GROUP = "No group set";

// No check-in with a week_start this many days before this Monday or
// earlier raises the "no check-in for 3+ weeks" flag. It is also the span of
// the four-week window: this Monday and the three before it.
export const STALE_DAYS = 21;
export const MONTHS_SHOWN = 12;

export interface HealthLeaderRow {
  email: string;
  name: string | null;
  full_access: boolean;
}

// leader_profiles with its pathway group embedded through pathway_group_id
// (PostgREST returns the linked row, or null when no group is set).
export const HEALTH_PROFILE_COLUMNS = "email, display_name, pathway_groups(name)";

export interface HealthProfileRow {
  email: string;
  display_name: string | null;
  pathway_groups: { name: string } | null;
}

export interface HealthPersonRow {
  owner_email: string;
  first_name: string;
  last_name: string | null;
  metrics: string[] | null;
  created_at: string;
}

export interface HealthCheckinRow extends GaugeScores {
  email: string;
  week_start: string;
}

export interface LeaderCounts {
  email: string;
  name: string;
  group: string;
  counts: MetricCounts;
  names: Record<Metric, string[]>;
}

export interface LeaderHealth {
  email: string;
  name: string;
  lastCheckin: string | null;
  weeksSince: number | null;
  averages: GaugeScores | null;
  stale: boolean;
}

export interface ChurchHealth {
  asOf: string;
  totals: MetricCounts;
  monthly: { month: string; counts: MetricCounts }[];
  groups: { group: string; leaders: number; counts: MetricCounts }[];
  leaders: LeaderCounts[];
  health: LeaderHealth[];
  churchAverages: GaugeScores | null;
}

export interface ChurchHealthInput {
  leaders: HealthLeaderRow[];
  profiles: HealthProfileRow[];
  people: HealthPersonRow[];
  checkins: HealthCheckinRow[];
  now: Date;
}

export function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emptyCounts(): MetricCounts {
  return { pathways: 0, intersections: 0, streetlights: 0 };
}

export function countMetrics(rows: { metrics: string[] | null }[]): MetricCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    for (const metric of new Set(row.metrics ?? [])) {
      if ((METRICS as readonly string[]).includes(metric)) counts[metric as Metric] += 1;
    }
  }
  return counts;
}

export function fullName(p: { first_name: string; last_name: string | null }): string {
  return [p.first_name.trim(), (p.last_name ?? "").trim()].filter(Boolean).join(" ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function averageScores(rows: GaugeScores[]): GaugeScores | null {
  if (rows.length === 0) return null;
  const avg = (key: keyof GaugeScores) => round1(rows.reduce((sum, r) => sum + r[key], 0) / rows.length);
  return { relational: avg("relational"), physical: avg("physical"), mental: avg("mental"), spiritual: avg("spiritual") };
}

// SVG polyline points for a small line chart: x spread evenly across
// `width`, y from `height` (zero) up to 0 (`max`).
export function linePoints(values: number[], width: number, height: number, max: number): string {
  if (values.length === 0) return "";
  const top = Math.max(max, 1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => `${round1(i * step)},${round1(height - (Math.min(Math.max(v, 0), top) / top) * height)}`)
    .join(" ");
}

export function buildChurchHealth(input: ChurchHealthInput): ChurchHealth {
  const today = melbourneParts(input.now).date;
  const thisMonday = mondayOfISO(today);
  const windowStart = addDaysISO(thisMonday, -STALE_DAYS);
  const inWindow = (c: HealthCheckinRow) => c.week_start >= windowStart && c.week_start <= thisMonday;

  const profiles = new Map(input.profiles.map((p) => [normEmail(p.email), p]));
  const known = new Set<string>();
  const leaders = input.leaders
    .map((l) => ({ email: normEmail(l.email), name: l.name }))
    .filter((l) => {
      if (!l.email || known.has(l.email)) return false;
      known.add(l.email);
      return true;
    })
    .sort((a, b) => a.email.localeCompare(b.email));
  const people = input.people.filter((p) => known.has(normEmail(p.owner_email)));
  const checkins = input.checkins.filter((c) => known.has(normEmail(c.email)));

  const groupOf = (email: string) => profiles.get(email)?.pathway_groups?.name?.trim() || NO_GROUP;
  const nameOf = (email: string, fallback: string | null) =>
    profiles.get(email)?.display_name?.trim() || fallback?.trim() || email;
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  const leaderRows: LeaderCounts[] = leaders
    .map((l) => {
      const mine = people.filter((p) => normEmail(p.owner_email) === l.email);
      const names: Record<Metric, string[]> = { pathways: [], intersections: [], streetlights: [] };
      for (const p of mine) {
        for (const m of METRICS) if ((p.metrics ?? []).includes(m)) names[m].push(fullName(p));
      }
      for (const m of METRICS) names[m].sort((a, b) => a.localeCompare(b));
      return { email: l.email, name: nameOf(l.email, l.name), group: groupOf(l.email), counts: countMetrics(mine), names };
    })
    .sort(byName);

  const groupMap = new Map<string, { group: string; leaders: number; counts: MetricCounts }>();
  for (const row of leaderRows) {
    const entry = groupMap.get(row.group) ?? { group: row.group, leaders: 0, counts: emptyCounts() };
    entry.leaders += 1;
    for (const m of METRICS) entry.counts[m] += row.counts[m];
    groupMap.set(row.group, entry);
  }
  const groups = [...groupMap.values()].sort((a, b) =>
    a.group === NO_GROUP ? 1 : b.group === NO_GROUP ? -1 : a.group.localeCompare(b.group)
  );

  const thisMonth = monthKeyOf(today);
  const recorded = people.map((p) => ({ month: monthKeyOf(melbourneDateOf(p.created_at)), metrics: p.metrics }));
  const monthly = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const month = addMonthsKey(thisMonth, i - (MONTHS_SHOWN - 1));
    return { month, counts: countMetrics(recorded.filter((r) => r.month <= month)) };
  });

  const health: LeaderHealth[] = leaders
    .map((l) => {
      const mine = checkins.filter((c) => normEmail(c.email) === l.email);
      const last = mine.reduce<string | null>(
        (latest, c) => (latest === null || c.week_start > latest ? c.week_start : latest),
        null
      );
      const days = last === null ? null : daysBetweenISO(last, thisMonday);
      return {
        email: l.email,
        name: nameOf(l.email, l.name),
        lastCheckin: last,
        weeksSince: days === null ? null : Math.max(0, Math.floor(days / 7)),
        averages: averageScores(mine.filter(inWindow)),
        stale: days === null || days >= STALE_DAYS,
      };
    })
    .sort(byName);

  return {
    asOf: today,
    totals: countMetrics(people),
    monthly,
    groups,
    leaders: leaderRows,
    health,
    churchAverages: averageScores(checkins.filter(inWindow)),
  };
}
