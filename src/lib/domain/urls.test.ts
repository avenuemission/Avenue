import { describe, expect, it } from "vitest";
import { isSafeAvatar, isSafeHttpsUrl } from "./urls";

describe("isSafeHttpsUrl", () => {
  it("accepts plain https links", () => {
    expect(isSafeHttpsUrl("https://open.spotify.com/episode/abc")).toBe(true);
    expect(isSafeHttpsUrl("https://www.avenuemission.com/guides/james.pdf?v=2#p1")).toBe(true);
  });

  it("refuses script and data schemes, whatever the case or padding", () => {
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl(" JavaScript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpsUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("refuses http, relative and protocol-relative links", () => {
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("/guides/james.pdf")).toBe(false);
    expect(isSafeHttpsUrl("//example.com/x")).toBe(false);
  });

  it("refuses links carrying credentials", () => {
    expect(isSafeHttpsUrl("https://user:pass@example.com")).toBe(false);
    expect(isSafeHttpsUrl("https://user@example.com")).toBe(false);
  });

  it("refuses empty and unparseable values", () => {
    expect(isSafeHttpsUrl("")).toBe(false);
    expect(isSafeHttpsUrl("not a url")).toBe(false);
    expect(isSafeHttpsUrl("https://")).toBe(false);
  });
});

describe("isSafeAvatar", () => {
  const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

  it("accepts png, jpeg and webp base64 data URLs", () => {
    expect(isSafeAvatar(jpeg)).toBe(true);
    expect(isSafeAvatar("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSafeAvatar("data:image/webp;base64,UklGRg+/")).toBe(true);
  });

  it("refuses external links, even https (a tracking pixel for every viewer)", () => {
    expect(isSafeAvatar("https://example.com/me.jpg")).toBe(false);
    expect(isSafeAvatar("http://example.com/me.jpg")).toBe(false);
  });

  it("refuses other image types and anything outside the base64 alphabet", () => {
    expect(isSafeAvatar("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isSafeAvatar("data:image/gif;base64,R0lGOD==")).toBe(false);
    expect(isSafeAvatar("data:image/png;base64,abc\"onerror=x")).toBe(false);
    expect(isSafeAvatar("data:image/png;base64,")).toBe(false);
    expect(isSafeAvatar("javascript:alert(1)")).toBe(false);
  });

  it("refuses a data URL over 400,000 characters", () => {
    const prefix = "data:image/jpeg;base64,";
    expect(isSafeAvatar(prefix + "A".repeat(400_000 - prefix.length))).toBe(true);
    expect(isSafeAvatar(prefix + "A".repeat(400_001 - prefix.length))).toBe(false);
  });
});
