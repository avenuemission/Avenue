import { describe, expect, it } from "vitest";
import { llmsText } from "./llmsTxt";

describe("llms.txt", () => {
  const text = llmsText();

  it("says who, where and when", () => {
    expect(text).toContain("> Microchurches across Melbourne, supported by the Seventh-day Adventist Church.");
    expect(text).toContain("- When: Wednesdays, 7 pm to 9 pm (Melbourne time)");
    expect(text).toContain("- Where: Mont Albert Church, 43 York St, Surrey Hills VIC 3127, Australia");
    expect(text).toContain("- Email: info@avenuemission.com");
  });

  it("links the key pages with absolute URLs", () => {
    for (const path of ["/vision", "/pathways", "/intersection", "/streetlights", "/faq"]) {
      expect(text).toContain(`(https://www.avenuemission.com${path}): `);
    }
  });
});
