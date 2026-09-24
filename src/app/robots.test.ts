import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("allows every crawler everywhere, as the old public/robots.txt did", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://www.avenuemission.com/sitemap.xml",
    });
  });
});
