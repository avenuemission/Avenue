import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  esc,
  footerLinks,
  listUnsubscribeHeaders,
  renderEmail,
  siteUrl,
  unsubscribeUrl,
  type EmailContent,
} from "./layout";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const DASH = String.fromCharCode(0x2014);

const content = (over: Partial<EmailContent> = {}): EmailContent => ({
  kind: "digest",
  token: TOKEN,
  subject: "Your week",
  preheader: "A short preview line.",
  eyebrow: "Week of 5 October",
  heading: "Good morning, Sam.",
  blocks: [
    { type: "h", text: "This week" },
    { type: "p", text: "A paragraph." },
    { type: "list", items: ["One", "Two"] },
    { type: "stats", rows: [{ label: "Pathways", value: "3" }] },
    { type: "link", label: "Open the guide", href: "https://example.invalid/guide.pdf" },
  ],
  cta: { label: "Check in now", href: "https://www.avenuemission.com/leaders" },
  ...over,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("links", () => {
  it("uses the live site by default and AVENUE_SITE_URL when set, without a trailing slash", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    expect(siteUrl()).toBe("https://www.avenuemission.com");
    vi.stubEnv("AVENUE_SITE_URL", "http://localhost:3000/");
    expect(siteUrl()).toBe("http://localhost:3000");
    expect(absoluteUrl("/leaders")).toBe("http://localhost:3000/leaders");
  });

  it("builds unsubscribe and manage links", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    expect(unsubscribeUrl(TOKEN, "rpms")).toBe(
      `https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=rpms`
    );
    expect(footerLinks(TOKEN, "digest")).toEqual({
      manageUrl: "https://www.avenuemission.com/leaders/emails",
      unsubscribeUrl: `https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=digest`,
      unsubscribeAllUrl: `https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=all`,
    });
  });

  it("builds RFC 8058 one-click headers", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    expect(listUnsubscribeHeaders(TOKEN, "milestones")).toEqual({
      "List-Unsubscribe": `<https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=milestones>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("esc", () => {
  it("escapes the five HTML characters", () => {
    expect(esc(`<a href="x">Tom & Jo's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jo&#39;s&lt;/a&gt;");
  });
});

describe("renderEmail", () => {
  it("is table-based, inline-styled, 600 px wide, night ground, Georgia, blue button, lamp accent, text wordmark", () => {
    const { html } = renderEmail(content());
    expect(html).toContain('role="presentation"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("#05070c");
    expect(html).toContain("Georgia");
    expect(html).toContain("#4f7cff");
    expect(html).toContain("#ffc56b");
    expect(html).toContain(">Avenue<");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<style");
    expect(html).toContain("A short preview line.");
    expect(html).toContain("Good morning, Sam.");
    expect(html).toContain('href="https://www.avenuemission.com/leaders"');
  });

  it("escapes content in the HTML and keeps it plain in the text", () => {
    const email = renderEmail(content({ heading: "Hi <b>Sam</b> & co" }));
    expect(email.html).toContain("Hi &lt;b&gt;Sam&lt;/b&gt; &amp; co");
    expect(email.html).not.toContain("<b>Sam</b>");
    expect(email.text).toContain("Hi <b>Sam</b> & co");
  });

  it("refuses a link or button that is not http or https", () => {
    expect(() =>
      renderEmail(content({ blocks: [{ type: "link", label: "Guide", href: "javascript:alert(1)" }] }))
    ).toThrow("not http or https");
    expect(() => renderEmail(content({ cta: { label: "Go", href: "/leaders" } }))).toThrow("not http or https");
  });

  it("gives a plain-text version, both unsubscribe links, the manage link and the headers", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    const email = renderEmail(content());
    expect(email.subject).toBe("Your week");
    expect(email.text).toContain("Good morning, Sam.");
    expect(email.text).toContain("- One");
    expect(email.text).toContain("Pathways: 3");
    expect(email.text).toContain("Open the guide: https://example.invalid/guide.pdf");
    expect(email.text).toContain("Check in now: https://www.avenuemission.com/leaders");
    expect(email.text).toContain(`Unsubscribe from these: https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=digest`);
    expect(email.html).toContain(`kind=digest`);
    expect(email.html).toContain(`kind=all`);
    expect(email.html).toContain("https://www.avenuemission.com/leaders/emails");
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(email.html + email.text + email.subject).not.toContain(DASH);
  });
});
