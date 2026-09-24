import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signText, verifyText } from "./signedText";

const results = { apostle: 30, prophet: 20, evangelist: 15, shepherd: 25, teacher: 10 };
const TEXT = "You lead by sending.\n\nYou also care for people.";

beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signText / verifyText", () => {
  it("verifies text signed with the same results", () => {
    const sig = signText(TEXT, results);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyText(TEXT, results, sig)).toBe(true);
  });

  it("does not depend on the key order of the bound object", () => {
    const sig = signText(TEXT, results);
    const reordered = { teacher: 10, shepherd: 25, evangelist: 15, prophet: 20, apostle: 30 };
    expect(verifyText(TEXT, reordered, sig)).toBe(true);
  });

  it("refuses tampered text", () => {
    const sig = signText(TEXT, results);
    expect(verifyText(`${TEXT} <a href="https://evil.invalid">x</a>`, results, sig)).toBe(false);
    expect(verifyText(TEXT.slice(1), results, sig)).toBe(false);
  });

  it("refuses tampered results", () => {
    const sig = signText(TEXT, results);
    expect(verifyText(TEXT, { ...results, teacher: 11 }, sig)).toBe(false);
    expect(verifyText(TEXT, { ...results, extra: 1 }, sig)).toBe(false);
  });

  it("refuses a signature of the wrong length or form without throwing", () => {
    const sig = signText(TEXT, results);
    expect(verifyText(TEXT, results, sig.slice(0, 62))).toBe(false);
    expect(verifyText(TEXT, results, `${sig}00`)).toBe(false);
    expect(verifyText(TEXT, results, "")).toBe(false);
    expect(verifyText(TEXT, results, sig.toUpperCase().replace(/[0-9A-F]/, "Z"))).toBe(false);
  });

  it("refuses a signature made with another key", () => {
    const sig = signText(TEXT, results);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "a-different-key");
    expect(verifyText(TEXT, results, sig)).toBe(false);
  });

  it("fails loud when the service role key is missing", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => signText(TEXT, results)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
