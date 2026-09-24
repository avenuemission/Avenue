import { describe, expect, it } from "vitest";
import { shuffled } from "./shuffle";

describe("shuffled", () => {
  it("returns a new array with the same items and leaves the input alone", () => {
    const items = ["a", "b", "c", "d"];
    const out = shuffled(items, () => 0.5);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual(["a", "b", "c", "d"]);
  });

  it("is a Fisher-Yates shuffle driven by the random source", () => {
    // random() = 0 swaps each position i with index 0, from the end down.
    expect(shuffled([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    // random() just under 1 keeps every item where it is.
    expect(shuffled([1, 2, 3, 4], () => 0.999)).toEqual([1, 2, 3, 4]);
  });
});
