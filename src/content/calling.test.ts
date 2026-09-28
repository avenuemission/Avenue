import { describe, expect, it } from "vitest";
import { CALLING_SECTION_IDS, CALLING_STATEMENT_IDS } from "@/lib/domain/journey";
import { APEST_ORDER } from "@/lib/domain/apest";
import * as content from "./calling";

describe("Calling content", () => {
  it("has the six sections in order", () => {
    expect(content.CALLING_SECTIONS.map((s) => s.id)).toEqual([...CALLING_SECTION_IDS]);
  });
  it("gives every section with a video slot a summary", () => {
    for (const s of content.CALLING_SECTIONS) if (s.hasVideo) expect(s.summary.length).toBeGreaterThan(100);
  });
  it("links every video section to its video in the Calling playlist, and only those", () => {
    const ids = Object.fromEntries(content.CALLING_SECTIONS.map((s) => [s.id, s.youtubeId]));
    expect(ids).toEqual({
      layers: "tl4_rN6jrh0",
      callable: "hSB0uoiVIqc",
      shared: "-T3iIBc8zZQ",
      apest: "OtRoQqBH724",
      seasonal: "9GZrWGO8e4c",
      conversation: null,
    });
    for (const s of content.CALLING_SECTIONS) expect(s.youtubeId !== null).toBe(s.hasVideo);
  });
  it("has nine statements, three per layer, with ids s1 to s9", () => {
    expect(content.LAYER_STATEMENTS.map((s) => s.id)).toEqual([...CALLING_STATEMENT_IDS]);
    for (const layer of ["shared", "specific", "seasonal"] as const) {
      expect(content.LAYER_STATEMENTS.filter((s) => s.layer === layer)).toHaveLength(3);
    }
    expect(Object.keys(content.LAYER_KEY)).toHaveLength(9);
  });
  it("covers all five APEST roles", () => {
    expect(Object.keys(content.APEST_CALLING_TEXT).sort()).toEqual([...APEST_ORDER].sort());
  });
  it("contains no em dash anywhere", () => {
    expect(JSON.stringify(content)).not.toContain(String.fromCharCode(0x2014));
  });
});
