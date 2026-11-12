// Titles, descriptions and canonical paths for the public pages. Pure: it
// returns a plain object that matches Next's Metadata, so each page's
// layout passes it straight through. Every description names Melbourne,
// since "where" is half of what people ask search engines about a church.
import { AVENUE_FACTS } from "@/content/site";
import { PRAYER_AND_PRAISE_WHEN } from "./siteFacts";

export const PUBLIC_PAGES = {
  "/": {
    name: "Home",
    title: "Avenue - Unleashing God-given potential",
    description:
      "Avenue Mission is a decentralised movement of people following Jesus in Melbourne, Victoria: microchurches in the spaces we already have, supported by the Seventh-day Adventist Church.",
  },
  "/vision": {
    name: "Vision",
    title: "Vision - Avenue Mission",
    description:
      "Discover Avenue's vision, mission, values and beliefs. We are a decentralised movement of people following Jesus, growing disciples through microchurches across Melbourne.",
  },
  "/pathways": {
    name: "Pathways",
    title: "Pathways - Avenue Mission",
    description:
      "Join or start a Pathway group. Pathway groups are microchurch communities growing together, empowered by the Spirit of God. Find a group near you in Melbourne.",
  },
  "/intersection": {
    name: "Intersection",
    title: "Intersection - Avenue Mission",
    description: `Intersection is where Avenue pathway groups in Melbourne come together for worship, prayer and community. Prayer & Praise: ${PRAYER_AND_PRAISE_WHEN}, ${AVENUE_FACTS.venue.locality}.`,
  },
  "/streetlights": {
    name: "Streetlights",
    title: "Streetlights - Avenue Mission",
    description:
      "Streetlights are Avenue's mission and creative initiatives in Melbourne. Discover our worship music, community projects, and ways to get involved in serving others.",
  },
  "/faq": {
    name: "FAQ",
    title: "FAQ - Avenue Mission",
    description:
      "Questions about Avenue Mission, a microchurch movement in Melbourne: Prayer & Praise times and venue, joining or leading a Pathway, and how to get in touch.",
  },
  "/apest-quiz": {
    name: "APEST Quiz",
    title: "APEST Quiz - Avenue Mission",
    description:
      "Find your APEST profile (apostle, prophet, evangelist, shepherd, teacher) with Avenue Mission, a microchurch movement in Melbourne, and serve more effectively in community.",
  },
  "/onramp": {
    name: "Avenue On-Ramp",
    title: "Avenue On-Ramp - Avenue Mission",
    description:
      "Avenue On-Ramp: your first step into leading. A leadership training day in Melbourne on Sunday 15 November 2026, 9am to 4:30pm. No experience needed. Sign up and pick your workshops.",
  },
  "/technological-stewardship": {
    name: "Technological Stewardship",
    title: "Technological Stewardship - Avenue Mission",
    description:
      "Avenue Mission in Melbourne is researching how Christians can steward AI for kingdom building while guarding against its dangers. Take the survey.",
  },
} as const;

export type PublicPath = keyof typeof PUBLIC_PAGES;

// app/opengraph-image.png, the skyline scene. Next adds it to pages that set
// no Open Graph of their own; a page that does set one drops it, so
// pageMetadata names it again. The alt text matches opengraph-image.alt.txt.
export const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Melbourne at night: streets of streetlights running to a glowing cross on the horizon, below the city skyline.",
};

// Metadata for one public page: its own canonical, and the same title,
// description and share image for Open Graph and Twitter.
export function pageMetadata(path: PublicPath) {
  const { title, description } = PUBLIC_PAGES[path];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: AVENUE_FACTS.name,
      locale: "en_AU",
      type: "website" as const,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image" as const, title, description, images: [SHARE_IMAGE] },
  };
}
