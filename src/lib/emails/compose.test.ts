import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HealthCheckinRow, HealthPersonRow } from "@/lib/domain/churchHealth";
import type { Recipient } from "./prefs";
import { composeFor, progressFor, type NetworkRow, type Snapshot } from "./compose";

const SAM = "sam@example.invalid";
const OTHER = "other@example.invalid";
const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const SITE = "https://www.avenuemission.com";
const recipient: Recipient = { email: SAM, name: "Samuel Stone", token: TOKEN };

// Monday 5 October 2026, 07:00 in Melbourne (AEDT).
const MONDAY_7AM = new Date("2026-10-04T20:00:00Z");

function snap(over: Partial<Snapshot> = {}): Snapshot {
  return {
    now: MONDAY_7AM,
    leaders: [
      { email: SAM, name: "Samuel Stone", full_access: true },
      { email: OTHER, name: "Other", full_access: true },
    ],
    prefs: [],
    profiles: [{ email: SAM, display_name: "Sam Stone", pathway_group: null }],
    checkins: [],
    people: [],
    network: [],
    training: [],
    worksheets: [],
    guides: [],
    foundationsModuleIds: ["p1m0", "p1m1"],
    ...over,
  };
}

const checkin = (email: string, week_start: string, r: number, p: number, m: number, s: number): HealthCheckinRow => ({
  email,
  week_start,
  relational: r,
  physical: p,
  mental: m,
  spiritual: s,
});

const person = (owner_email: string, first_name: string, created_at: string, metrics: string[] = []): HealthPersonRow => ({
  owner_email,
  first_name,
  last_name: null,
  metrics,
  created_at,
});

const node = (id: string, first_name: string, sent_out_by: string | null, step: number | null, email: string | null = null): NetworkRow => ({
  id,
  email,
  first_name,
  last_name: null,
  sent_out_by,
  apprentice_step: step,
});

beforeEach(() => {
  vi.stubEnv("AVENUE_SITE_URL", "");
});

describe("composeFor rpms", () => {
  // Sunday 4 October 2026, 19:00 in Melbourne. This week's Monday is
  // 28 September, so last week's check-in is the one for 21 September.
  const SUNDAY_EVENING = new Date("2026-10-04T08:00:00Z");

  it("sends last week's scores to the recipient only, keyed by the Sunday", () => {
    const [out, ...rest] = composeFor(
      "rpms",
      recipient,
      snap({
        now: SUNDAY_EVENING,
        checkins: [checkin(SAM, "2026-09-21", 7, 6, 5, 8), checkin(SAM, "2026-09-28", 1, 1, 1, 1), checkin(OTHER, "2026-09-21", 2, 2, 2, 2)],
      })
    );
    expect(rest).toEqual([]);
    expect(out).toMatchObject({ kind: "rpms", email: SAM, periodKey: "2026-10-04", baselineable: false });
    expect(out.message.text).toContain("How are you, really, Sam?");
    expect(out.message.text).toContain("Relational: 7/10");
  });

  it("says there was no check-in when last week is missing", () => {
    const [out] = composeFor("rpms", recipient, snap({ now: SUNDAY_EVENING }));
    expect(out.message.text).toContain("There was no check-in last week.");
  });
});

describe("composeFor digest", () => {
  it("uses this week's guide, keyed by the Monday, linking only to a web address", () => {
    const guides = [
      { id: "g1", guide_date: "07/10/2026", series: "James", topic: "Joy in trials", scripture: "James 1", pdf_url: "https://example.invalid/j1.pdf" },
    ];
    const [out] = composeFor("digest", recipient, snap({ guides }));
    expect(out.periodKey).toBe("2026-10-05");
    expect(out.message.subject).toBe("Your week: Joy in trials");
    expect(out.message.text).toContain("Open the guide: https://example.invalid/j1.pdf");

    const noPdf = [{ ...guides[0], pdf_url: null }];
    const [fallback] = composeFor("digest", recipient, snap({ guides: noPdf }));
    expect(fallback.message.text).toContain(`Open the guide: ${SITE}/leaders/study-guides`);

    const unsafe = [{ ...guides[0], pdf_url: "javascript:alert(1)" }];
    const [safe] = composeFor("digest", recipient, snap({ guides: unsafe }));
    expect(safe.message.text).toContain(`Open the guide: ${SITE}/leaders/study-guides`);
    expect(safe.message.html).not.toContain("javascript:");
  });

  it("names at most three of their own people from the last 30 days, newest first", () => {
    const people = [
      person(SAM, "Dee", "2026-09-06T00:00:00Z"),
      person(SAM, "Ann", "2026-10-01T00:00:00Z"),
      person(SAM, "Ben", "2026-09-20T00:00:00Z"),
      person(SAM, "Cal", "2026-09-10T00:00:00Z"),
      person(SAM, "Old", "2026-08-01T00:00:00Z"),
      person(OTHER, "Fay", "2026-10-02T00:00:00Z"),
    ];
    const text = composeFor("digest", recipient, snap({ people }))[0].message.text;
    expect(text).toContain("- Ann\n- Ben\n- Cal");
    expect(text).not.toContain("- Dee");
    expect(text).not.toContain("- Old");
    expect(text).not.toContain("- Fay");
  });

  it("shows the four weeks before this Monday", () => {
    const text = composeFor("digest", recipient, snap({ checkins: [checkin(SAM, "2026-09-07", 6, 7, 6, 7)] }))[0].message.text;
    expect(text).toContain("Week of 7 September: 6.5 out of 10");
    expect(text).toContain("Week of 28 September: No check-in");
    expect(text).not.toContain("Week of 5 October:");
  });

  it("gives the next step at the stop they are at", () => {
    const text = composeFor("digest", recipient, snap({ training: [{ email: SAM, completed_modules: ["p1m0"] }] }))[0].message
      .text;
    expect(text).toContain("1 of 2 Foundations modules ticked.");
    expect(text).toContain(`Continue Foundations: ${SITE}/leaders/training?phase=phase1`);
  });
});

describe("composeFor church_health", () => {
  it("counts their lists, the change over the past month, and the whole church", () => {
    const people = [
      person(SAM, "Pat", "2026-08-15T00:00:00Z", ["pathways"]),
      person(SAM, "Ray", "2026-09-10T00:00:00Z", ["pathways", "streetlights"]),
      person(OTHER, "Ivy", "2026-05-01T00:00:00Z", ["intersections"]),
      person("gone@example.invalid", "Old", "2026-05-01T00:00:00Z", ["pathways"]),
    ];
    // Thursday 1 October 2026, 07:00 in Melbourne.
    const [out] = composeFor("church_health", recipient, snap({ now: new Date("2026-09-30T21:00:00Z"), people }));
    expect(out.periodKey).toBe("2026-10");
    expect(out.message.subject).toBe("Church health for October 2026");
    expect(out.message.text).toContain("Pathways: 2 (+1 this past month)");
    expect(out.message.text).toContain("Intersections: 0 (no change this past month)");
    expect(out.message.text).toContain("Streetlights: 1 (+1 this past month)");
    expect(out.message.text).toContain("Intersections: 1\n");
  });
});

describe("composeFor apprentice", () => {
  it("lists everyone they sent out with their rung", () => {
    const network = [
      node("n1", "Sam", null, 0, SAM),
      node("n2", "Jo", "n1", 2),
      node("n3", "Al", "n1", null),
      node("n4", "Zed", "other-node", 3),
    ];
    // Thursday 15 October 2026, 07:00 in Melbourne.
    const [out] = composeFor("apprentice", recipient, snap({ now: new Date("2026-10-14T20:00:00Z"), network }));
    expect(out.periodKey).toBe("2026-10");
    expect(out.message.text).toContain("AL\n\nNow: Not started yet.");
    expect(out.message.text).toContain("JO\n\nNow: I do, you help.");
    expect(out.message.text).not.toContain("ZED");
  });

  it("sends nothing to a leader with no apprentices", () => {
    expect(composeFor("apprentice", recipient, snap())).toEqual([]);
    expect(composeFor("apprentice", recipient, snap({ network: [node("n1", "Sam", null, 0, SAM)] }))).toEqual([]);
  });
});

describe("composeFor milestones", () => {
  it("lists every walked and ongoing stop, each baselineable, keyed by stop", () => {
    const out = composeFor(
      "milestones",
      recipient,
      snap({
        training: [{ email: SAM, completed_modules: ["p1m0", "p1m1"] }],
        checkins: [checkin(SAM, "2026-09-28", 5, 5, 5, 5)],
      })
    );
    expect(out.map((o) => o.periodKey)).toEqual(["phase1-walked", "phase4-ongoing"]);
    expect(out.every((o) => o.baselineable && o.kind === "milestones" && o.email === SAM)).toBe(true);
    expect(out[0].message.subject).toBe("You walked Foundations");
  });

  it("counts down to the launch date on the exact day only, never baselined", () => {
    const launch = (launchDate: string) => [{ email: SAM, kind: "launch", data: { rhythm: { launchDate } } }];
    const [out] = composeFor("milestones", recipient, snap({ worksheets: launch("2026-10-12") }));
    expect(out).toMatchObject({ periodKey: "launch-2026-10-12-7d", baselineable: false });
    expect(out.message.subject).toBe("One week until you launch");
    expect(composeFor("milestones", recipient, snap({ worksheets: launch("2026-10-13") }))).toEqual([]);
  });
});

describe("progressFor", () => {
  it("counts apprentices on a rung through the leader's own network node", () => {
    const network = [node("n1", "Sam", null, 0, "SAM@example.invalid"), node("n2", "Jo", "n1", 2), node("n3", "Al", "n1", 0)];
    expect(progressFor(SAM, snap({ network })).apprenticesOnRung).toBe(1);
  });
});
