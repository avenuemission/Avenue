import { describe, expect, it } from "vitest";
import { MAX_CHAIN, normaliseEmail, wouldCreateCycle } from "./network";

describe("normaliseEmail", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Henry.JAMcMahon@Gmail.com ")).toBe("henry.jamcmahon@gmail.com");
  });

  it("turns blank and non-strings into null", () => {
    expect(normaliseEmail("")).toBeNull();
    expect(normaliseEmail("   ")).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
    expect(normaliseEmail(undefined)).toBeNull();
    expect(normaliseEmail(42)).toBeNull();
  });
});

describe("wouldCreateCycle", () => {
  it("allows detaching to a root", () => {
    expect(wouldCreateCycle(new Map(), "a", null)).toBe(false);
  });

  it("rejects sending yourself out", () => {
    expect(wouldCreateCycle(new Map(), "a", "a")).toBe(true);
  });

  it("rejects a direct loop", () => {
    // b is already sent out by a, so a cannot be sent out by b.
    const parentOf = new Map<string, string | null>([["b", "a"], ["a", null]]);
    expect(wouldCreateCycle(parentOf, "a", "b")).toBe(true);
  });

  it("rejects a loop further up the chain", () => {
    const parentOf = new Map<string, string | null>([
      ["b", "a"],
      ["c", "b"],
      ["a", null],
    ]);
    expect(wouldCreateCycle(parentOf, "a", "c")).toBe(true);
  });

  it("allows an ordinary link", () => {
    const parentOf = new Map<string, string | null>([["b", null]]);
    expect(wouldCreateCycle(parentOf, "c", "b")).toBe(false);
  });

  it("refuses a chain longer than the cap rather than walking forever", () => {
    const parentOf = new Map<string, string | null>();
    for (let i = 1; i <= MAX_CHAIN + 10; i++) parentOf.set(`n${i}`, `n${i - 1}`);
    parentOf.set("n0", null);
    expect(wouldCreateCycle(parentOf, "fresh", `n${MAX_CHAIN + 10}`)).toBe(true);
  });

  it("refuses when the existing data already contains a loop", () => {
    const parentOf = new Map<string, string | null>([["x", "y"], ["y", "x"]]);
    expect(wouldCreateCycle(parentOf, "fresh", "x")).toBe(true);
  });
});
