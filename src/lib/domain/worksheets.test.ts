import { describe, expect, it } from "vitest";
import { jsonDepth, parseKind, validateWorksheetPatch } from "./worksheets";

function nest(levels: number): unknown {
  let v: unknown = 1;
  for (let i = 0; i < levels; i++) v = { k: v };
  return v;
}

describe("parseKind", () => {
  it("accepts calling and launch", () => {
    expect(parseKind("calling")).toBe("calling");
    expect(parseKind("launch")).toBe("launch");
  });
  it("rejects anything else", () => {
    expect(parseKind("profile")).toBeNull();
    expect(parseKind(null)).toBeNull();
    expect(parseKind(1)).toBeNull();
  });
});

describe("jsonDepth", () => {
  it("counts a primitive as 0", () => expect(jsonDepth("x")).toBe(0));
  it("counts an empty object as 1", () => expect(jsonDepth({})).toBe(1));
  it("counts nested arrays", () => expect(jsonDepth([[1]])).toBe(2));
  it("counts five levels as 5", () => expect(jsonDepth(nest(5))).toBe(5));
  it("stops at six levels and reports more than 5", () => expect(jsonDepth(nest(40))).toBe(6));
  it("returns -1 for a non-finite number", () => expect(jsonDepth({ a: Number.NaN })).toBe(-1));
  it("returns -1 for a Date", () => expect(jsonDepth({ a: new Date() })).toBe(-1));
  it("returns -1 for undefined", () => expect(jsonDepth(undefined)).toBe(-1));
});

describe("validateWorksheetPatch", () => {
  it("accepts a valid calling patch", () => {
    expect(validateWorksheetPatch({ kind: "calling", section: "layers", value: { placements: { s1: "shared" } } })).toEqual({
      kind: "calling",
      section: "layers",
      value: { placements: { s1: "shared" } },
    });
  });
  it("accepts a valid launch patch", () => {
    expect(validateWorksheetPatch({ kind: "launch", section: "arena", value: { picks: [], done: false } })).toEqual({
      kind: "launch",
      section: "arena",
      value: { picks: [], done: false },
    });
  });
  it("accepts the Metrics step's read flag as a launch section", () => {
    expect(validateWorksheetPatch({ kind: "launch", section: "metrics", value: { read: true } })).toEqual({
      kind: "launch",
      section: "metrics",
      value: { read: true },
    });
  });
  it("accepts a null value", () => {
    expect(validateWorksheetPatch({ kind: "launch", section: "team", value: null })).toEqual({ kind: "launch", section: "team", value: null });
  });
  it("ignores an email in the body", () => {
    expect(validateWorksheetPatch({ kind: "calling", section: "shared", value: { yes: true }, email: "b@example.invalid" })).toEqual({
      kind: "calling",
      section: "shared",
      value: { yes: true },
    });
  });
  it("rejects a non-object body", () => {
    expect(validateWorksheetPatch(null)).toEqual({ error: "Body must be a JSON object" });
    expect(validateWorksheetPatch([])).toEqual({ error: "Body must be a JSON object" });
  });
  it("rejects an unknown kind", () => {
    expect(validateWorksheetPatch({ kind: "profile", section: "layers", value: {} })).toEqual({ error: "kind must be calling or launch" });
  });
  it("rejects a section from the other kind", () => {
    expect(validateWorksheetPatch({ kind: "calling", section: "arena", value: {} })).toEqual({
      error: "section must be one of: layers, callable, shared, apest, seasonal, conversation",
    });
  });
  it("rejects a missing value", () => {
    expect(validateWorksheetPatch({ kind: "calling", section: "layers" })).toEqual({ error: "value is required" });
  });
  it("rejects a value nested six deep and accepts five", () => {
    expect(validateWorksheetPatch({ kind: "calling", section: "apest", value: nest(6) })).toEqual({ error: "value is nested too deeply (max 5 levels)" });
    expect("kind" in validateWorksheetPatch({ kind: "calling", section: "apest", value: nest(5) })).toBe(true);
  });
  it("rejects a value over 20,000 characters and accepts exactly 20,000", () => {
    expect(validateWorksheetPatch({ kind: "launch", section: "invite", value: "x".repeat(20_001) })).toEqual({
      error: "value is too large (max 20000 characters)",
    });
    // JSON.stringify adds two quote characters.
    expect("kind" in validateWorksheetPatch({ kind: "launch", section: "invite", value: "x".repeat(19_998) })).toBe(true);
  });
  it("rejects a value that is not plain JSON", () => {
    expect(validateWorksheetPatch({ kind: "launch", section: "rhythm", value: { n: Number.POSITIVE_INFINITY } })).toEqual({
      error: "value must be plain JSON",
    });
  });
});
