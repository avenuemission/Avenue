import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailKind } from "./prefs";
import type { RenderedEmail } from "./layout";
import {
  apprenticeEmail,
  churchHealthEmail,
  digestEmail,
  milestoneEmail,
  rpmsEmail,
  type DigestTopic,
} from "./templates";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const SITE = "https://www.avenuemission.com";
const DASH = String.fromCharCode(0x2014);

beforeEach(() => {
  vi.stubEnv("AVENUE_SITE_URL", "");
});

// Every email: per-kind and all-kinds unsubscribe links, the one-click
// header for its own kind, a plain-text version, and no em dash anywhere.
function expectCommon(email: RenderedEmail, kind: EmailKind) {
  expect(email.html).toContain(`${SITE}/api/email/unsubscribe?token=${TOKEN}&amp;kind=${kind}`);
  expect(email.html).toContain(`${SITE}/api/email/unsubscribe?token=${TOKEN}&amp;kind=all`);
  expect(email.headers["List-Unsubscribe"]).toBe(`<${SITE}/api/email/unsubscribe?token=${TOKEN}&kind=${kind}>`);
  expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  expect(email.text).toContain(`Unsubscribe from these: ${SITE}/api/email/unsubscribe?token=${TOKEN}&kind=${kind}`);
  expect(email.subject + email.html + email.text).not.toContain(DASH);
}

const topic: DigestTopic = {
  title: "Joy in trials",
  series: "James",
  passage: "James 1",
  href: "https://example.invalid/james-1.pdf",
};

describe("rpmsEmail", () => {
  it("shows last week's four scores and links to this week's check-in", () => {
    const email = rpmsEmail({
      firstName: "Sam",
      token: TOKEN,
      lastWeek: { relational: 7, physical: 6, mental: 5, spiritual: 8 },
    });
    expect(email.subject).toBe("Your Sunday check-in");
    expect(email.text).toContain("How are you, really, Sam?");
    expect(email.text).toContain("Relational: 7/10");
    expect(email.text).toContain("Spiritual: 8/10");
    expect(email.text).toContain(`Check in now: ${SITE}/leaders/training?phase=phase4`);
    expectCommon(email, "rpms");
  });

  it("says so when there was no check-in last week", () => {
    const email = rpmsEmail({ firstName: "Sam", token: TOKEN, lastWeek: null });
    expect(email.text).toContain("There was no check-in last week.");
    expect(email.text).not.toContain("/10");
  });
});

describe("digestEmail", () => {
  it("carries the topic, the trend, the follow-ups and the next step", () => {
    const email = digestEmail({
      firstName: "Sam",
      token: TOKEN,
      weekOf: "2026-10-05",
      topic,
      trend: [
        { weekStart: "2026-09-07", average: 6.5 },
        { weekStart: "2026-09-14", average: null },
        { weekStart: "2026-09-21", average: 7 },
        { weekStart: "2026-09-28", average: 8.3 },
      ],
      followUps: ["Jo Park", "Lee"],
      next: { text: "3 of 6 Calling sections done.", label: "Continue Calling", href: `${SITE}/leaders/training/calling` },
    });
    expect(email.subject).toBe("Your week: Joy in trials");
    expect(email.text).toContain("Week of 5 October");
    expect(email.text).toContain("Joy in trials (James)");
    expect(email.text).toContain("Read: James 1");
    expect(email.text).toContain("Open the guide: https://example.invalid/james-1.pdf");
    expect(email.text).toContain("Week of 7 September: 6.5 out of 10");
    expect(email.text).toContain("Week of 14 September: No check-in");
    expect(email.text).toContain("- Jo Park");
    expect(email.text).toContain("3 of 6 Calling sections done.");
    expect(email.text).toContain(`Continue Calling: ${SITE}/leaders/training/calling`);
    expectCommon(email, "digest");
  });

  it("reads well with no topic, no check-ins and nobody new", () => {
    const email = digestEmail({
      firstName: "Sam",
      token: TOKEN,
      weekOf: "2026-10-05",
      topic: null,
      trend: [
        { weekStart: "2026-09-07", average: null },
        { weekStart: "2026-09-14", average: null },
      ],
      followUps: [],
      next: { text: "All five streetlights on.", label: "Open Growth", href: `${SITE}/leaders/training?phase=phase4` },
    });
    expect(email.subject).toBe("Your week ahead");
    expect(email.text).toContain("No Pathways guide is set for this week yet.");
    expect(email.text).toContain("No check-ins in the last four weeks.");
    expect(email.text).toContain("No new people in the last 30 days.");
  });
});

describe("churchHealthEmail", () => {
  it("asks for the three lists, with counts, change and church totals", () => {
    const email = churchHealthEmail({
      firstName: "Sam",
      token: TOKEN,
      monthLabel: "October 2026",
      mine: {
        pathways: { count: 5, change: 2 },
        intersections: { count: 1, change: 0 },
        streetlights: { count: 3, change: -1 },
      },
      church: { pathways: 40, intersections: 12, streetlights: 25 },
    });
    expect(email.subject).toBe("Church health for October 2026");
    expect(email.text).toContain("Pathways: 5 (+2 this past month)");
    expect(email.text).toContain("Intersections: 1 (no change this past month)");
    expect(email.text).toContain("Streetlights: 3 (-1 this past month)");
    expect(email.text).toContain("Pathways: 40");
    expect(email.text).toContain(`Update your lists: ${SITE}/leaders/training?phase=phase4`);
    expectCommon(email, "church_health");
  });
});

describe("apprenticeEmail", () => {
  it("names each apprentice's rung and the next step with a how-to", () => {
    const email = apprenticeEmail({
      firstName: "Sam",
      token: TOKEN,
      apprentices: [
        { name: "Jo Park", step: 0 },
        { name: "Lee", step: 2 },
        { name: "Max", step: 5 },
      ],
    });
    expect(email.subject).toBe("Your apprentices this month");
    expect(email.text).toContain("JO PARK");
    expect(email.text).toContain("Now: Not started yet.");
    expect(email.text).toContain("Next: I do, you watch. Bring them along and let them watch you lead one gathering.");
    expect(email.text).toContain("Next: You do, I help.");
    expect(email.text).toContain("They are on the last step. Help them find their own apprentice to bring along.");
    expect(email.text).toContain(`Open Multiply: ${SITE}/leaders/training?phase=phase5`);
    expectCommon(email, "apprentice");
  });
});

describe("milestoneEmail", () => {
  it("celebrates a walked phase and names what is next", () => {
    const email = milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "walked", stop: "phase1" } });
    expect(email.subject).toBe("You walked Foundations");
    expect(email.text).toContain("Calling is next");
    expect(email.text).toContain(`Open your avenue: ${SITE}/leaders`);
    expectCommon(email, "milestones");
  });

  it("marks Growth and Multiply as ongoing rhythms", () => {
    const growth = milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "ongoing", stop: "phase4" } });
    expect(growth.subject).toBe("Growth is lit");
    expect(growth.text).toContain(`Open Growth: ${SITE}/leaders/training?phase=phase4`);
    const multiply = milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "ongoing", stop: "phase5" } });
    expect(multiply.subject).toBe("Multiply is lit");
    expectCommon(multiply, "milestones");
  });

  it("counts down to the launch date at 30, 7 and 1 days", () => {
    const at = (daysBefore: 30 | 7 | 1) =>
      milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "launch", daysBefore, launchDate: "2026-10-12" } });
    expect(at(30).subject).toBe("30 days until you launch");
    expect(at(7).subject).toBe("One week until you launch");
    expect(at(1).subject).toBe("You launch tomorrow");
    expect(at(7).text).toContain("Your launch date is 12 October 2026.");
    expect(at(7).text).toContain(`Open your Launch Plan: ${SITE}/leaders/training/launch/plan`);
    expectCommon(at(1), "milestones");
  });

  it("escapes a name in the HTML", () => {
    const email = milestoneEmail({ firstName: "<b>Sam</b>", token: TOKEN, milestone: { type: "walked", stop: "phase2" } });
    expect(email.html).toContain("&lt;b&gt;Sam&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Sam</b>");
  });
});
