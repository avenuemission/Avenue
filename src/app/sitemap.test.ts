import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the same URLs, frequencies and priorities as the old public/sitemap.xml", () => {
    expect(sitemap()).toEqual([
      { url: "https://www.avenuemission.com/", changeFrequency: "weekly", priority: 1.0 },
      { url: "https://www.avenuemission.com/vision", changeFrequency: "monthly", priority: 0.8 },
      { url: "https://www.avenuemission.com/pathways", changeFrequency: "weekly", priority: 0.8 },
      { url: "https://www.avenuemission.com/intersection", changeFrequency: "weekly", priority: 0.8 },
      { url: "https://www.avenuemission.com/streetlights", changeFrequency: "monthly", priority: 0.8 },
      { url: "https://www.avenuemission.com/apest-quiz", changeFrequency: "monthly", priority: 0.6 },
    ]);
  });

  it("never lists a leader page", () => {
    expect(sitemap().some((entry) => entry.url.includes("/leaders") || entry.url.includes("/login"))).toBe(false);
  });
});
