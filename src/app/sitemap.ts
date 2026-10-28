import type { MetadataRoute } from "next";

const SITE = "https://www.avenuemission.com";

// Served at /sitemap.xml. The public pages only: leader pages sit behind a
// sign-in and are not listed. Add a new public page here when it ships.
const PAGES: { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/vision", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pathways", changeFrequency: "weekly", priority: 0.8 },
  { path: "/intersection", changeFrequency: "weekly", priority: 0.8 },
  { path: "/streetlights", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/apest-quiz", changeFrequency: "monthly", priority: 0.6 },
  { path: "/onramp", changeFrequency: "weekly", priority: 0.6 },
  { path: "/technological-stewardship", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE}${path}`,
    changeFrequency,
    priority,
  }));
}
