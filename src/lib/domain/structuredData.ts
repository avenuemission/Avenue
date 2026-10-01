// schema.org JSON-LD for search engines and AI assistants. Pure: every
// builder returns a plain object for a <script type="application/ld+json">.
// The root layout carries the site graph, /intersection adds the weekly
// Prayer & Praise event and /faq adds the FAQPage.
import { AVENUE_FACTS } from "@/content/site";
import type { Faq } from "@/content/faq";
import { nextPrayerAndPraiseTimes, SOCIAL_PROFILES } from "./siteFacts";

const { url: SITE, venue, prayerAndPraise } = AVENUE_FACTS;
const ORGANIZATION_ID = `${SITE}/#organization`;

// The original line from the home page.
const DESCRIPTION =
  "Avenue is a decentralised movement of people following Jesus, convinced that disciple-making doesn't require more church buildings, just the willingness to open the spaces we already have";

const NAV = ["Vision", "Pathways", "Intersection", "Streetlights", "FAQ"];

function postalAddress() {
  return {
    "@type": "PostalAddress",
    streetAddress: venue.street,
    addressLocality: venue.locality,
    addressRegion: venue.region,
    postalCode: venue.postcode,
    addressCountry: venue.country,
  };
}

function parentOrganization() {
  return { "@type": "Organization", name: AVENUE_FACTS.parentOrganization.name, url: AVENUE_FACTS.parentOrganization.url };
}

// Organization, Church, WebSite and the main navigation.
export function siteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: AVENUE_FACTS.name,
        url: SITE,
        logo: `${SITE}/images/Avenue.png`,
        description: DESCRIPTION,
        email: AVENUE_FACTS.email,
        areaServed: AVENUE_FACTS.area,
        sameAs: SOCIAL_PROFILES.map((profile) => profile.url),
        address: postalAddress(),
        parentOrganization: parentOrganization(),
      },
      {
        "@type": "Church",
        "@id": `${SITE}/#church`,
        name: AVENUE_FACTS.name,
        url: SITE,
        description: AVENUE_FACTS.summary,
        address: postalAddress(),
        parentOrganization: parentOrganization(),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: AVENUE_FACTS.name,
        publisher: { "@id": ORGANIZATION_ID },
      },
      ...NAV.map((name) => ({
        "@type": "SiteNavigationElement",
        name,
        url: `${SITE}/${name.toLowerCase()}`,
      })),
    ],
  };
}

// Prayer & Praise as an Event: the next occurrence after `now` as its
// dates, plus the weekly schedule.
export function prayerAndPraiseEvent(now: Date) {
  const { start, end } = nextPrayerAndPraiseTimes(now);
  const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${prayerAndPraise.name} - ${AVENUE_FACTS.name}`,
    description: "Avenue's weekly night of prayer and worship, where pathways from across Melbourne gather as one family.",
    url: `${SITE}/intersection`,
    startDate: start,
    endDate: end,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: venue.name, address: postalAddress() },
    organizer: { "@id": ORGANIZATION_ID },
    eventSchedule: {
      "@type": "Schedule",
      repeatFrequency: "P1W",
      byDay: `https://schema.org/${prayerAndPraise.day}`,
      startTime: pad(prayerAndPraise.startHour),
      endTime: pad(prayerAndPraise.endHour),
      scheduleTimezone: prayerAndPraise.timeZone,
    },
  };
}

// The FAQPage for /faq: the same questions and answers the page shows.
export function faqStructuredData(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
