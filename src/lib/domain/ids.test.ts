import { describe, expect, it } from "vitest";
import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts a uuid in either case", () => {
    expect(isUuid("0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c")).toBe(true);
    expect(isUuid("0B8F7A52-2C1E-4D3A-9A57-6C7F0E1D2B3C")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(" 0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c")).toBe(false);
    expect(isUuid("0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3")).toBe(false);
    expect(isUuid(7)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
