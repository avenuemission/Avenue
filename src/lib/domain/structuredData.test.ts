import { describe, expect, it } from "vitest";
import { faqStructuredData, prayerAndPraiseEvent, siteStructuredData } from "./structuredData";
import { FAQS } from "@/content/faq";
import { AVENUE_FACTS, SOCIAL_LINKS } from "@/content/site";

type Node = Record<string, unknown> & { "@type": string };
const graph = () => siteStructuredData()["@graph"] as Node[];
const node = (type: string) => graph().find((n) => n["@type"] === type);

const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "43 York St",
  addressLocality: "Surrey Hills",
  addressRegion: "VIC",
  postalCode: "3127",
  addressCountry: "AU",
};

describe("site JSON-LD", () => {
  it("gives the Organization the email, area, socials and venue", () => {
    expect(node("Organization")).toMatchObject({
      name: "Avenue Mission",
      email: AVENUE_FACTS.email,
      areaServed: "Melbourne, Victoria",
      address: ADDRESS,
      sameAs: [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook, SOCIAL_LINKS.youtube, SOCIAL_LINKS.linkedin],
    });
  });

  it("adds a Church at the venue, supported by the Seventh-day Adventist Church", () => {
    expect(node("Church")).toMatchObject({
      "@id": "https://www.avenuemission.com/#church",
      address: ADDRESS,
      parentOrganization: { "@type": "Organization", name: "Seventh-day Adventist Church" },
    });
  });

  it("links the main pages, FAQ included", () => {
    const nav = graph().filter((n) => n["@type"] === "SiteNavigationElement").map((n) => n.url);
    expect(nav).toContain("https://www.avenuemission.com/faq");
    expect(nav).toHaveLength(5);
  });
});

describe("Prayer & Praise event", () => {
  it("starts at the next Wednesday 7 pm Melbourne time and repeats weekly", () => {
    const event = prayerAndPraiseEvent(new Date("2026-10-01T00:00:00Z"));
    expect(event).toMatchObject({
      "@type": "Event",
      startDate: "2026-10-07T19:00:00+11:00",
      endDate: "2026-10-07T21:00:00+11:00",
      location: { "@type": "Place", name: "Mont Albert Church", address: ADDRESS },
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: "https://schema.org/Wednesday",
        startTime: "19:00",
        endTime: "21:00",
        scheduleTimezone: "Australia/Melbourne",
      },
    });
  });
});

describe("FAQPage", () => {
  it("holds exactly the questions and answers the page shows", () => {
    const data = faqStructuredData(FAQS);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toEqual(
      FAQS.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    );
  });

  it("answers where and when with the venue and time from the facts", () => {
    const answer = FAQS.find((faq) => faq.question.startsWith("Where and when"))?.answer;
    expect(answer).toBe("Wednesdays, 7 pm to 9 pm, at Mont Albert Church, 43 York St, Surrey Hills VIC 3127.");
    expect(FAQS.some((faq) => faq.answer.includes(AVENUE_FACTS.email))).toBe(true);
  });
});
