import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/llms.txt", () => {
  it("serves the brief as plain text", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const text = await res.text();
    expect(text.startsWith("# Avenue Mission\n")).toBe(true);
    expect(text).toContain("Mont Albert Church, 43 York St, Surrey Hills VIC 3127");
  });
});
