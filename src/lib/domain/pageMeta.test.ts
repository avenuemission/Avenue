import { describe, expect, it } from "vitest";
import { pageMetadata, PUBLIC_PAGES, SHARE_IMAGE, type PublicPath } from "./pageMeta";

const PATHS = Object.keys(PUBLIC_PAGES) as PublicPath[];

describe("page metadata", () => {
  it("gives every page its own canonical path", () => {
    for (const path of PATHS) expect(pageMetadata(path).alternates.canonical).toBe(path);
  });

  it("mentions Melbourne in every description", () => {
    for (const path of PATHS) expect(PUBLIC_PAGES[path].description).toContain("Melbourne");
  });

  it("repeats the title and description for Open Graph and Twitter", () => {
    const meta = pageMetadata("/faq");
    expect(meta.openGraph).toMatchObject({ title: meta.title, description: meta.description, url: "/faq" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: meta.title, description: meta.description });
    expect(meta.openGraph.images).toEqual([SHARE_IMAGE]);
    expect(meta.twitter.images).toEqual([SHARE_IMAGE]);
  });

  it("keeps the home tab title", () => {
    expect(pageMetadata("/").title).toBe("Avenue - Unleashing God-given potential");
  });
});
