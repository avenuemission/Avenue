import { describe, expect, it } from "vitest";
import { scopeNetwork } from "./networkScope";

// root -> sender -> viewer -> child -> grandchild; viewer also has child2.
// sibling shares the viewer's sender; stranger is a separate tree.
const people = [
  { id: "root", sentOutBy: null },
  { id: "sender", sentOutBy: "root" },
  { id: "viewer", sentOutBy: "sender" },
  { id: "sibling", sentOutBy: "sender" },
  { id: "child", sentOutBy: "viewer" },
  { id: "child2", sentOutBy: "viewer" },
  { id: "grandchild", sentOutBy: "child" },
  { id: "stranger", sentOutBy: null },
  { id: "strangerKid", sentOutBy: "stranger" },
];

const ids = (list: { id: string }[]) => list.map((p) => p.id).sort();

describe("scopeNetwork", () => {
  it("returns everyone, unchanged and in order, for full access", () => {
    const out = scopeNetwork(people, "viewer", true);
    expect(out).toEqual(people);
  });

  it("gives a pending leader only themselves, their sender and their descendants", () => {
    expect(ids(scopeNetwork(people, "viewer", false))).toEqual(
      ["child", "child2", "grandchild", "sender", "viewer"].sort()
    );
  });

  it("keeps the original order and objects", () => {
    const out = scopeNetwork(people, "viewer", false);
    expect(out.map((p) => p.id)).toEqual(["sender", "viewer", "child", "child2", "grandchild"]);
    expect(out[1]).toBe(people[2]);
  });

  it("gives a root with no sender just themselves and their tree", () => {
    expect(ids(scopeNetwork(people, "stranger", false))).toEqual(["stranger", "strangerKid"]);
  });

  it("returns nothing when there is no viewer", () => {
    expect(scopeNetwork(people, null, false)).toEqual([]);
  });

  it("returns nothing when the viewer is not in the list", () => {
    expect(scopeNetwork(people, "ghost", false)).toEqual([]);
  });

  it("does not loop on a corrupted cycle", () => {
    const loop = [
      { id: "a", sentOutBy: "c" },
      { id: "b", sentOutBy: "a" },
      { id: "c", sentOutBy: "b" },
      { id: "x", sentOutBy: null },
    ];
    expect(ids(scopeNetwork(loop, "a", false))).toEqual(["a", "b", "c"]);
  });

  it("does not loop on a self-parented row", () => {
    const self = [{ id: "a", sentOutBy: "a" }];
    expect(ids(scopeNetwork(self, "a", false))).toEqual(["a"]);
  });

  it("still returns everyone for full access with no viewer", () => {
    expect(scopeNetwork(people, null, true)).toEqual(people);
  });
});
