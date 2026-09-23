import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STOP_IDS } from "@/lib/avenue";
import { NLT_NOTICE, VERSES } from "./verses";

const EM_DASH = String.fromCharCode(0x2014);
const source = readFileSync(fileURLToPath(new URL("./verses.ts", import.meta.url)), "utf8");

describe("verses", () => {
  it("has one passage per stop, in the spec's order", () => {
    expect(Object.keys(VERSES)).toEqual([...STOP_IDS]);
    expect(STOP_IDS.map((id) => VERSES[id].reference)).toEqual([
      "Acts 2:42",
      "Ephesians 4:11–12",
      "Nehemiah 2:17–18",
      "Exodus 18:17–18",
      "2 Timothy 2:2",
    ]);
  });
  it("fills every passage with the staged NLT text", () => {
    for (const id of STOP_IDS) expect((VERSES[id].text ?? "").length).toBeGreaterThan(50);
    expect(VERSES.phase5.text).toBe(
      "You have heard me teach things that have been confirmed by many reliable witnesses. Now teach these truths to other trustworthy people who will be able to pass them on to others."
    );
  });
  it("marks every passage for Henry to verify", () => {
    expect(source.split("// NLT: Henry to verify wording").length - 1).toBe(5);
  });
  it("leaves (NLT) to the page, never inside the text", () => {
    for (const id of STOP_IDS) expect(VERSES[id].text).not.toContain("(NLT)");
  });
  it("renders the Exodus 18:18 dash as a comma", () => {
    expect(VERSES.phase4.text).toContain("wear yourself out, and the people, too.");
  });
  it("contains no em dash anywhere", () => {
    expect(source).not.toContain(EM_DASH);
    expect(NLT_NOTICE).not.toContain(EM_DASH);
  });
  it("carries the NLT notice for web use", () => {
    expect(NLT_NOTICE).toContain("Tyndale House Foundation");
    expect(NLT_NOTICE).toContain("All rights reserved.");
  });
});
