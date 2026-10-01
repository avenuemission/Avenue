# AI search and local discoverability

Date: 1 Oct 2026. Status: approved by Henry (answers below). Findings page: https://claude.ai/artifact/X1VZov3siBYrnNf8g5XxzJ

## Goal

Help ChatGPT, Perplexity, Google AI Overviews, Copilot and normal Google answer "who is Avenue Mission, where, when, how do I join". The site already lets every crawler in; it just says too little in plain text and markup.

## Decisions (Henry, 1 Oct)

| Question | Answer |
|---|---|
| Venue for Prayer & Praise | Mont Albert Church, 43 York St, Surrey Hills VIC 3127. Publish it. |
| Official name | Avenue Mission |
| Public email | info@avenuemission.com |
| Footer | Every public page except home (home stays exactly one screen) |
| Home paragraph | Unchanged |
| FAQ | New page /faq in the Vision style, linked from the footer |

## One source of facts

`src/content/site.ts` gains `AVENUE_FACTS`: name, email, area ("Melbourne, Victoria"), the Seventh-day Adventist link, venue (name, street, locality, region, postcode, country), Prayer & Praise (Wednesday, 19:00 to 21:00, Australia/Melbourne). The footer, JSON-LD, FAQ and llms.txt all read it.

## Pieces

1. **Footer** (`src/components/site/SiteFooter.tsx`): name, one-line description ("House churches across Melbourne, supported by the Seventh-day Adventist Church."), Prayer & Praise day, time and full venue address, email, page links (Vision, Pathways, Intersection, Streetlights, FAQ), social links from SOCIAL_LINKS. Server-rendered. Shown on every public page except `/`, via a `(site)/layout.tsx` and a small client gate on the pathname. Night palette, lamplight classes, phone-friendly.
2. **JSON-LD** in the root layout: Organization gains `email`, `areaServed`, `sameAs` (socials), `address` (the venue), and a `Church` node (`@id .../#church`) with the venue address and `parentOrganization` Seventh-day Adventist Church. `/intersection` adds an `Event` for Prayer & Praise with the next occurrence as `startDate`/`endDate` (Melbourne time, from the existing next-Wednesday helper) and `eventSchedule` (weekly, Wednesday). `/faq` adds `FAQPage`.
3. **FAQ page** `/faq`: always-visible questions and answers (no collapsed content), using only facts already on the site or confirmed above: what Avenue Mission is, its link to the Seventh-day Adventist Church, where and when Prayer & Praise meets, what happens at a Pathway, how to join a Pathway, how to start or lead one, how to get in touch. Nothing about kids or numbers that are not confirmed.
4. **Metadata**: `metadataBase` in the root layout; every public page sets its own `alternates.canonical`, a description that mentions Melbourne, and Open Graph and Twitter title/description. One share image `src/app/opengraph-image.png` (1200 x 630, the skyline scene) with alt text. Home title stays "Avenue - Unleashing God-given potential".
5. **Real numbers in the HTML**: CountUp also renders the final number as visually-hidden text (screen readers and crawlers read it), the animated number is `aria-hidden`.
6. **Sitemap**: add `/technological-stewardship` and `/faq`.
7. **llms.txt**: served at `/llms.txt` from AVENUE_FACTS (who, where, when, key pages).

## Out of scope

Home page layout and text, off-site listings (Henry's actions), Pathway group data.

## Testing

Unit tests: facts used consistently (footer and JSON-LD carry the venue and email), JSON-LD shape (Church, Event with schedule, FAQPage matches the visible questions), sitemap list, llms.txt content, canonical per page. Gates: vitest (count goes up), tsc, lint, knip, build, guard, noEmDash. Browser check at 375 px and 1440 px: footer on public pages, absent on home, home still one screen, /faq renders.
