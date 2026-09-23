import { describe, expect, it } from "vitest";
import { CALLING_SECTION_IDS, CALLING_STATEMENT_IDS } from "@/lib/journey";
import { APEST_ORDER } from "@/lib/apest";
import * as content from "./content";

describe("Calling content", () => {
  it("has the six sections in order", () => {
    expect(content.CALLING_SECTIONS.map((s) => s.id)).toEqual([...CALLING_SECTION_IDS]);
  });
  it("gives every section with a video slot a summary", () => {
    for (const s of content.CALLING_SECTIONS) if (s.hasVideo) expect(s.summary.length).toBeGreaterThan(100);
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
    expect(JSON.stringify(content)).not.toContain("—");
  });
});
