// The /llms.txt file (llmstxt.org): a short plain-text brief on Avenue for
// AI assistants. Pure. Built from AVENUE_FACTS and the page list, so it
// says what the footer and JSON-LD say.
import { AVENUE_FACTS } from "@/content/site";
import { PUBLIC_PAGES, type PublicPath } from "./pageMeta";
import { PRAYER_AND_PRAISE_WHEN, SOCIAL_PROFILES, VENUE_LINE } from "./siteFacts";

const KEY_PAGES: PublicPath[] = ["/vision", "/pathways", "/intersection", "/streetlights", "/faq"];

export function llmsText(): string {
  const { name, url, email, area, summary, prayerAndPraise } = AVENUE_FACTS;
  return [
    `# ${name}`,
    "",
    `> ${summary}`,
    "",
    `${name} is a decentralised movement of people following Jesus in ${area}, Australia. Pathways are house churches: small communities meeting in homes, libraries and schools. Where pathways meet is called Intersection.`,
    "",
    `## ${prayerAndPraise.name}`,
    "",
    `- When: ${PRAYER_AND_PRAISE_WHEN} (Melbourne time)`,
    `- Where: ${VENUE_LINE}, Australia`,
    "",
    "## Contact",
    "",
    `- Email: ${email}`,
    `- Website: ${url}`,
    ...SOCIAL_PROFILES.map((profile) => `- ${profile.name}: ${profile.url}`),
    "",
    "## Key pages",
    "",
    ...KEY_PAGES.map((path) => `- [${PUBLIC_PAGES[path].name}](${url}${path}): ${PUBLIC_PAGES[path].description}`),
    "",
  ].join("\n");
}
