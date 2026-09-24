import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderPublicEmail } from "./layout";
import {
  apestResultsEmail,
  eventUpdatesEmail,
  joinPathwayEmail,
  leaderSupportCustomEmail,
  leaderSupportEmail,
  startPathwayEmail,
} from "./confirmations";
import { ADMIN_EMAIL, adminNotificationEmail, leaderSignupNotificationEmail } from "./admin";
import { formEmails } from "./forms";
import { SUPPORT_ZOOM } from "@/content/support";
import type { PublicEmail } from "./layout";

const EVIL = `<script>alert("x")</script> O'Brien`;
const DASH = String.fromCharCode(0x2014);
const NOW = new Date("2026-09-24T06:30:00.000Z");

function expectEscaped(email: PublicEmail) {
  expect(email.html).not.toContain("<script>");
  expect(email.html).not.toContain(`"x"`);
  expect(email.html).not.toContain("O'Brien");
  expect(email.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; O&#39;Brien");
}

beforeEach(() => {
  vi.stubEnv("AVENUE_SITE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("renderPublicEmail", () => {
  const email = renderPublicEmail({
    subject: "Hello",
    preheader: "Preview",
    eyebrow: "Avenue",
    heading: "Hi",
    blocks: [{ type: "p", text: "Body" }],
  });

  it("uses the branded frame with a plain site footer and no unsubscribe links", () => {
    expect(email.subject).toBe("Hello");
    expect(email.html).toContain("AVENUE");
    expect(email.html).toContain("#0b1020");
    expect(email.html).toContain('href="https://www.avenuemission.com"');
    expect(email.html).not.toMatch(/unsubscribe/i);
    expect(email.html).not.toContain("Manage emails");
    expect(email.text).toContain("Body");
    expect(email.text).toContain("https://www.avenuemission.com");
    expect(email.text).not.toMatch(/unsubscribe/i);
  });

  it("refuses a non-web link", () => {
    expect(() =>
      renderPublicEmail({
        subject: "s",
        preheader: "p",
        eyebrow: "e",
        heading: "h",
        blocks: [{ type: "link", label: "x", href: "javascript:alert(1)" }],
      })
    ).toThrow(/http/);
  });
});

describe("confirmation templates keep their subjects and wording, and escape every value", () => {
  it("join pathway", () => {
    const e = joinPathwayEmail(EVIL, EVIL);
    expect(e.subject).toBe("Welcome to Avenue - Pathway Group Connection");
    expect(e.text).toContain("pathway group.");
    expect(e.text).toContain("A member of our team will be in contact with you soon to help you get connected.");
    expectEscaped(e);
  });

  it("start pathway, with and without a suburb", () => {
    const e = startPathwayEmail(EVIL, EVIL);
    expect(e.subject).toBe("Your Journey Begins - Starting a Pathway Group");
    expect(e.text).toContain("Thank you for accepting God's call to grow His kingdom by starting a pathway group in ");
    expect(e.text).toContain("Schedule a call with our team");
    expectEscaped(e);
    expect(startPathwayEmail("Ann", "").text).toContain("starting a pathway group. This is an exciting step of faith!");
  });

  it("event updates (no visitor values in it)", () => {
    const e = eventUpdatesEmail();
    expect(e.subject).toBe("You're in the loop - Avenue Event Updates");
    expect(e.text).toContain("Thank you for wanting to stay up to date with Avenue events and news.");
    expect(e.html).toContain("https://www.avenuemission.com/intersection");
  });

  it("APEST results: sorted scores, the server-written reflection, escaped", () => {
    const e = apestResultsEmail(EVIL, { apostle: 10, prophet: 40, evangelist: 20, shepherd: 25, teacher: 5 }, `${EVIL}\n\nSecond paragraph`);
    expect(e.subject).toBe("Your APEST Quiz Results - Discover Your Gifts");
    expect(e.text.indexOf("Prophet: 40%")).toBeLessThan(e.text.indexOf("Shepherd: 25%"));
    expect(e.text).toContain("Second paragraph");
    expect(e.text).toContain("Your unique gifting is exactly what's needed to grow the kingdom of God.");
    expectEscaped(e);
    expect(apestResultsEmail("", { apostle: 1 }, "m").html).toContain("Here are your APEST results!");
  });

  it("leader support booking: server Zoom details", () => {
    const e = leaderSupportEmail(EVIL, EVIL);
    expect(e.subject).toBe("Leader Support Call Confirmed - Avenue");
    expect(e.text).toContain("your leader support call has been scheduled for:");
    expect(e.text).toContain(SUPPORT_ZOOM.meetingId);
    expect(e.text).toContain(SUPPORT_ZOOM.passcode);
    expect(e.html).toContain(SUPPORT_ZOOM.link.replace(/&/g, "&amp;"));
    expect(e.text).toContain("Please ensure your device has a microphone and webcam ready.");
    expectEscaped(e);
  });

  it("leader support custom time", () => {
    const e = leaderSupportCustomEmail(EVIL, EVIL, EVIL);
    expect(e.subject).toBe("Custom Time Request Received - Avenue Leader Support");
    expect(e.text).toContain("we've received your request for a custom support call time.");
    expect(e.text).toContain("We'll be in touch shortly to confirm this time or suggest an alternative.");
    expectEscaped(e);
  });
});

describe("admin notifications", () => {
  it("go to the fixed admin address", () => {
    expect(ADMIN_EMAIL).toBe("henrymcmahon@avenuemission.com");
  });

  it("keep the old subject and escape keys and values", () => {
    const e = adminNotificationEmail("Join Pathway Group", { [EVIL]: EVIL }, NOW);
    expect(e.subject).toBe("New Form Submission: Join Pathway Group");
    expect(e.text).toContain("New Join Pathway Group submission");
    expect(e.text).toContain("Submitted on");
    expectEscaped(e);
  });

  it("leader signup keeps its subject and escapes the name", () => {
    const e = leaderSignupNotificationEmail(EVIL, "lee@example.invalid", NOW);
    expect(e.subject).toBe("Avenue: New Leader Account Created");
    expect(e.text).toContain("lee@example.invalid");
    expectEscaped(e);
  });
});

describe("formEmails", () => {
  it("join-pathway: welcome to the visitor, notification with phone and group to the admin", () => {
    const out = formEmails(
      { type: "join-pathway", name: "Ann", email: "ann@example.invalid", data: { phone: "0400", group: "North" } },
      NOW
    );
    expect(out.confirmation?.subject).toBe("Welcome to Avenue - Pathway Group Connection");
    expect(out.admin.subject).toBe("New Form Submission: Join Pathway Group");
    expect(out.admin.text).toContain("Phone: 0400");
    expect(out.admin.text).toContain("Group: North");
  });

  it("join-pathway with no email: admin only, email shown as not provided", () => {
    const out = formEmails({ type: "join-pathway", name: "Ann", email: null, data: { phone: "0400", group: "North" } }, NOW);
    expect(out.confirmation).toBeNull();
    expect(out.admin.text).toContain("Email: Not provided");
  });

  it("mission-support and idea-submission: admin only", () => {
    const m = formEmails(
      { type: "mission-support", name: "Ann", email: "ann@example.invalid", data: { supportType: "time", message: "" } },
      NOW
    );
    expect(m.confirmation).toBeNull();
    expect(m.admin.subject).toBe("New Form Submission: Philippines Mission Trip - Support Interest");
    expect(m.admin.text).toContain("Support Type: Volunteering Time");
    expect(m.admin.text).toContain("Message: No additional message");
    const i = formEmails({ type: "idea-submission", name: "Ann", email: null, data: { idea: "Soup" } }, NOW);
    expect(i.confirmation).toBeNull();
    expect(i.admin.subject).toBe("New Form Submission: Idea Submission");
  });

  it("event-updates and start-pathway confirm to the visitor", () => {
    const ev = formEmails({ type: "event-updates", name: "Ann", email: "ann@example.invalid", data: {} }, NOW);
    expect(ev.confirmation?.subject).toBe("You're in the loop - Avenue Event Updates");
    expect(ev.admin.subject).toBe("New Form Submission: Event Updates Signup");
    const st = formEmails(
      { type: "start-pathway", name: "Ann", email: "ann@example.invalid", data: { phone: "1", suburb: "Kew" } },
      NOW
    );
    expect(st.confirmation?.subject).toBe("Your Journey Begins - Starting a Pathway Group");
    expect(st.admin.subject).toBe("New Form Submission: Start Pathway Group");
  });

  it("leader-support: booking or custom request, confirmation for the leader", () => {
    const b = formEmails(
      {
        type: "leader-support",
        name: "Lee",
        email: "lee@example.invalid",
        data: { selectedDate: "2026-10-01T08:00:00.000Z", formattedDate: "Thursday 1 October at 6:00 pm" },
      },
      NOW
    );
    expect(b.confirmation?.subject).toBe("Leader Support Call Confirmed - Avenue");
    expect(b.admin.subject).toBe("New Form Submission: Leader Support Call Booking");
    expect(b.admin.text).toContain("Scheduled Time: Thursday 1 October at 6:00 pm");
    const c = formEmails(
      { type: "leader-support", name: "Lee", email: "lee@example.invalid", data: { requestedDate: "2026-10-03", requestedTime: "10:30", custom: "true" } },
      NOW
    );
    expect(c.confirmation?.subject).toBe("Custom Time Request Received - Avenue Leader Support");
    expect(c.admin.subject).toBe("New Form Submission: Leader Support - Custom Time Request");
  });

  it("never writes an em dash", () => {
    const out = formEmails({ type: "event-updates", name: "Ann", email: "ann@example.invalid", data: {} }, NOW);
    expect(out.admin.html + out.confirmation!.html).not.toContain(DASH);
  });
});
