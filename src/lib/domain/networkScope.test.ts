import { describe, expect, it } from "vitest";
import { scopeNetwork, type ScopedPerson } from "./networkScope";

const p = (id: string, sentOutBy: string | null, linkStatus = "confirmed", joined = true): ScopedPerson => ({
  id,
  sentOutBy,
  linkStatus,
  joined,
});

// root -> sender -> viewer -> child -> grandchild; viewer also has child2.
// sibling shares the viewer's sender; stranger is a separate tree.
const people = [
  p("root", null),
  p("sender", "root"),
  p("viewer", "sender"),
  p("sibling", "sender"),
  p("child", "viewer"),
  p("child2", "viewer"),
  p("grandchild", "child"),
  p("stranger", null),
  p("strangerKid", "stranger"),
];

const ids = (list: { id: string }[]) => list.map((x) => x.id).sort();

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
    expect(out.map((x) => x.id)).toEqual(["sender", "viewer", "child", "child2", "grandchild"]);
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
    const loop = [p("a", "c"), p("b", "a"), p("c", "b"), p("x", null)];
    expect(ids(scopeNetwork(loop, "a", false))).toEqual(["a", "b", "c"]);
  });

  it("does not loop on a self-parented row", () => {
    expect(ids(scopeNetwork([p("a", "a")], "a", false))).toEqual(["a"]);
  });

  it("still returns everyone for full access with no viewer", () => {
    expect(scopeNetwork(people, null, true)).toEqual(people);
  });

  describe("unconfirmed links", () => {
    // viewer adopted "root" (a joined person, link not confirmed); root has
    // its own confirmed tree. viewer also added "named" (not joined) and
    // "named" was later given a confirmed child by an admin.
    const graph = [
      p("viewer", "boss", "pending"),
      p("boss", null),
      p("root", "viewer", "pending", true),
      p("rootKid", "root"),
      p("named", "viewer", "pending", false),
      p("namedKid", "named"),
      p("mine", "viewer"),
      p("mineKidPending", "mine", "pending", false),
    ];

    it("does not follow an unconfirmed link to a joined person: the adopted subtree stays hidden", () => {
      const out = ids(scopeNetwork(graph, "viewer", false));
      expect(out).not.toContain("root");
      expect(out).not.toContain("rootKid");
    });

    it("includes the viewer's own not-yet-joined people and the confirmed links below them", () => {
      const out = ids(scopeNetwork(graph, "viewer", false));
      expect(out).toContain("named");
      expect(out).toContain("namedKid");
    });

    it("keeps the viewer's sender whatever its link status", () => {
      expect(ids(scopeNetwork(graph, "viewer", false))).toContain("boss");
    });

    it("below the first level, follows confirmed links only", () => {
      const out = ids(scopeNetwork(graph, "viewer", false));
      expect(out).toContain("mine");
      expect(out).not.toContain("mineKidPending");
    });

    it("full access still sees everything", () => {
      expect(scopeNetwork(graph, "viewer", true)).toEqual(graph);
    });
  });
});
