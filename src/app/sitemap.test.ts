import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { PUBLIC_PAGES } from "@/lib/domain/pageMeta";

describe("sitemap", () => {
  it("lists every public page with its frequency and priority", () => {
    expect(sitemap()).toEqual([
      { url: "https://www.avenuemission.com/", changeFrequency: "weekly", priority: 1.0 },
      { url: "https://www.avenuemission.com/vision", changeFrequency: "monthly", priority: 0.8 },
      { url: "https://www.avenuemission.com/pathways", changeFrequency: "weekly", priority: 0.8 },
      { url: "https://www.avenuemission.com/intersection", changeFrequency: "weekly", priority: 0.8 },
      { url: "https://www.avenuemission.com/streetlights", changeFrequency: "monthly", priority: 0.8 },
      { url: "https://www.avenuemission.com/faq", changeFrequency: "monthly", priority: 0.7 },
      { url: "https://www.avenuemission.com/apest-quiz", changeFrequency: "monthly", priority: 0.6 },
      { url: "https://www.avenuemission.com/onramp", changeFrequency: "weekly", priority: 0.6 },
      { url: "https://www.avenuemission.com/technological-stewardship", changeFrequency: "monthly", priority: 0.5 },
    ]);
  });

  it("lists exactly the pages that have their own metadata", () => {
    const listed = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(listed.sort()).toEqual(Object.keys(PUBLIC_PAGES).sort());
  });

  it("never lists a leader page", () => {
    expect(sitemap().some((entry) => entry.url.includes("/leaders") || entry.url.includes("/login"))).toBe(false);
  });
});
