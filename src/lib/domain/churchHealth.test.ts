import { describe, expect, it } from "vitest";
import {
  averageScores,
  buildChurchHealth,
  countMetrics,
  linePoints,
  NO_GROUP,
  type HealthCheckinRow,
  type HealthLeaderRow,
  type HealthPersonRow,
  type HealthProfileRow,
} from "./churchHealth";

const ANN = "ann@example.invalid";
const BEN = "ben@example.invalid";
const CAT = "cat@example.invalid";
const GONE = "gone@example.invalid";

// Thursday 1 October 2026, 10:00 in Melbourne. This Monday is 28 September;
// the four-week window starts 7 September.
const NOW = new Date("2026-10-01T00:00:00Z");

const leaders: HealthLeaderRow[] = [
  { email: CAT, name: null, full_access: false },
  { email: " Ben@Example.invalid ", name: "Ben Ray", full_access: true },
  { email: ANN, name: "Ann", full_access: true },
];

const profiles: HealthProfileRow[] = [
  { email: ANN, display_name: "Ann Lee", pathway_group: " North  Side " },
  { email: BEN, display_name: null, pathway_group: "north side" },
];

const people: HealthPersonRow[] = [
  { owner_email: ANN, first_name: "Zoe", last_name: null, metrics: ["pathways"], created_at: "2026-01-10T00:00:00Z" },
  {
    owner_email: ANN,
    first_name: "Sam",
    last_name: "Hill",
    metrics: ["pathways", "streetlights"],
    created_at: "2026-09-15T00:00:00Z",
  },
  // 1:30 am on 1 December in Melbourne, so it counts from December.
  { owner_email: BEN, first_name: "Al", last_name: "Brown", metrics: ["intersections"], created_at: "2025-11-30T14:30:00Z" },
  // Owner is not a leader any more: counted nowhere.
  { owner_email: GONE, first_name: "Old", last_name: null, metrics: ["pathways"], created_at: "2026-02-01T00:00:00Z" },
];

const score = (email: string, week_start: string, n: number): HealthCheckinRow => ({
  email,
  week_start,
  relational: n,
  physical: n,
  mental: n,
  spiritual: n,
});

const checkins: HealthCheckinRow[] = [
  score(ANN, "2026-09-28", 8),
  score(ANN, "2026-09-21", 6),
  score(ANN, "2026-08-31", 2), // before the window
  score(BEN, "2026-09-07", 5), // first week of the window, 21 days ago
  score(GONE, "2026-09-28", 1), // not a leader
];

const build = () => buildChurchHealth({ leaders, profiles, people, checkins, now: NOW });

describe("buildChurchHealth", () => {
  it("counts each current person once per metric, leaders' people only", () => {
    const health = build();
    expect(health.asOf).toBe("2026-10-01");
    expect(health.totals).toEqual({ pathways: 2, intersections: 1, streetlights: 1 });
  });

  it("builds twelve Melbourne months ending this month from record dates", () => {
    const { monthly } = build();
    expect(monthly).toHaveLength(12);
    expect(monthly[0]).toEqual({ month: "2025-11", counts: { pathways: 0, intersections: 0, streetlights: 0 } });
    expect(monthly[1]).toEqual({ month: "2025-12", counts: { pathways: 0, intersections: 1, streetlights: 0 } });
    expect(monthly[2]).toEqual({ month: "2026-01", counts: { pathways: 1, intersections: 1, streetlights: 0 } });
    expect(monthly[10]).toEqual({ month: "2026-09", counts: { pathways: 2, intersections: 1, streetlights: 1 } });
    expect(monthly[11].month).toBe("2026-10");
  });

  it("groups pathway groups case-insensitively and puts No group set last", () => {
    expect(build().groups).toEqual([
      { group: "North Side", leaders: 2, counts: { pathways: 2, intersections: 1, streetlights: 1 } },
      { group: NO_GROUP, leaders: 1, counts: { pathways: 0, intersections: 0, streetlights: 0 } },
    ]);
  });

  it("gives one row per leader, sorted by name, with the names behind each count", () => {
    const rows = build().leaders;
    expect(rows.map((r) => r.name)).toEqual(["Ann Lee", "Ben Ray", CAT]);
    expect(rows[0]).toMatchObject({
      email: ANN,
      group: "North Side",
      counts: { pathways: 2, intersections: 0, streetlights: 1 },
      names: { pathways: ["Sam Hill", "Zoe"], intersections: [], streetlights: ["Sam Hill"] },
    });
    expect(rows[1].email).toBe(BEN);
    expect(rows[2].group).toBe(NO_GROUP);
  });

  it("reports each leader's last check-in, four-week averages and the 3+ weeks flag", () => {
    const [ann, ben, cat] = build().health;
    expect(ann).toEqual({
      email: ANN,
      name: "Ann Lee",
      lastCheckin: "2026-09-28",
      weeksSince: 0,
      averages: { relational: 7, physical: 7, mental: 7, spiritual: 7 },
      stale: false,
    });
    expect(ben).toMatchObject({ lastCheckin: "2026-09-07", weeksSince: 3, stale: true });
    expect(ben.averages).toEqual({ relational: 5, physical: 5, mental: 5, spiritual: 5 });
    expect(cat).toMatchObject({ lastCheckin: null, weeksSince: null, averages: null, stale: true });
  });

  it("averages the whole church over the four-week window only", () => {
    expect(build().churchAverages).toEqual({ relational: 6.3, physical: 6.3, mental: 6.3, spiritual: 6.3 });
  });

  it("is all zeros and nulls with no data", () => {
    const empty = buildChurchHealth({ leaders: [], profiles: [], people: [], checkins: [], now: NOW });
    expect(empty.totals).toEqual({ pathways: 0, intersections: 0, streetlights: 0 });
    expect(empty.groups).toEqual([]);
    expect(empty.leaders).toEqual([]);
    expect(empty.churchAverages).toBeNull();
    expect(empty.monthly).toHaveLength(12);
  });
});

describe("helpers", () => {
  it("countMetrics ignores unknown, repeated and missing metrics", () => {
    expect(countMetrics([{ metrics: ["pathways", "pathways", "bogus"] }, { metrics: null }])).toEqual({
      pathways: 1,
      intersections: 0,
      streetlights: 0,
    });
  });

  it("averageScores is null for no rows and rounds to one decimal", () => {
    expect(averageScores([])).toBeNull();
    expect(
      averageScores([
        { relational: 1, physical: 2, mental: 3, spiritual: 4 },
        { relational: 2, physical: 2, mental: 4, spiritual: 4 },
        { relational: 2, physical: 3, mental: 4, spiritual: 5 },
      ])
    ).toEqual({ relational: 1.7, physical: 2.3, mental: 3.7, spiritual: 4.3 });
  });

  it("linePoints scales values into the box, top at zero", () => {
    expect(linePoints([0, 5, 10], 100, 50, 10)).toBe("0,50 50,25 100,0");
    expect(linePoints([3], 100, 50, 3)).toBe("0,0");
    expect(linePoints([], 100, 50, 10)).toBe("");
  });
});
