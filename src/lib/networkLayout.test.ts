import { describe, expect, it } from "vitest";
import { layoutNetwork, type NetworkPerson } from "./networkLayout";

function person(
  id: string,
  sentOutBy: string | null = null,
  extra: Partial<NetworkPerson> = {}
): NetworkPerson {
  return {
    id,
    firstName: id.toUpperCase(),
    sentOutBy,
    linkStatus: "confirmed",
    joined: true,
    ...extra,
  };
}

const STEP = 100;
const opts = { radiusStep: STEP };
const radiusOf = (n: { x: number; y: number }) => Math.hypot(n.x, n.y);

describe("layoutNetwork", () => {
  it("returns an empty layout for no people", () => {
    const layout = layoutNetwork([], opts);
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });

  it("puts a lone person at the centre", () => {
    const layout = layoutNetwork([person("a")], opts);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ id: "a", x: 0, y: 0, depth: 0 });
  });

  it("rings a single root's children at one radius step", () => {
    const layout = layoutNetwork(
      [person("a"), person("b", "a"), person("c", "a"), person("d", "a")],
      opts
    );
    expect(layout.nodes).toHaveLength(4);
    expect(layout.edges).toHaveLength(3);

    const root = layout.nodes.find((n) => n.id === "a")!;
    expect(radiusOf(root)).toBeCloseTo(0);

    const kids = layout.nodes.filter((n) => n.id !== "a");
    for (const kid of kids) {
      expect(kid.depth).toBe(1);
      expect(radiusOf(kid)).toBeCloseTo(STEP);
    }

    // Three children must not land on top of each other.
    const angles = kids.map((k) => Math.atan2(k.y, k.x).toFixed(4));
    expect(new Set(angles).size).toBe(3);
  });

  it("pushes multiple roots out to depth 1 with no edge between them", () => {
    const layout = layoutNetwork([person("a"), person("b")], opts);
    expect(layout.edges).toHaveLength(0);
    for (const n of layout.nodes) {
      expect(n.depth).toBe(1);
      expect(radiusOf(n)).toBeCloseTo(STEP);
    }
  });

  it("treats a parent that does not exist as no parent", () => {
    const layout = layoutNetwork([person("a", "ghost")], opts);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.edges).toHaveLength(0);
    expect(layout.nodes[0].depth).toBe(0);
  });

  it("survives a two node cycle instead of hanging", () => {
    const layout = layoutNetwork([person("a", "b"), person("b", "a")], opts);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(0);
  });

  it("still places a person hanging off a cycle", () => {
    const layout = layoutNetwork(
      [person("a", "b"), person("b", "a"), person("c", "a")],
      opts
    );
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("handles a chain far deeper than any real network", () => {
    const people = [person("n0")];
    for (let i = 1; i < 60; i++) people.push(person(`n${i}`, `n${i - 1}`));

    const layout = layoutNetwork(people, opts);
    expect(layout.nodes).toHaveLength(60);
    expect(Math.max(...layout.nodes.map((n) => n.depth))).toBe(59);
  });

  it("marks pending links as unconfirmed edges", () => {
    const layout = layoutNetwork(
      [person("a"), person("b", "a", { linkStatus: "pending" })],
      opts
    );
    expect(layout.edges).toEqual([{ fromId: "a", toId: "b", confirmed: false }]);
  });

  it("covers every node in its bounds", () => {
    const layout = layoutNetwork(
      [person("a"), person("b", "a"), person("c", "a"), person("d", "b")],
      opts
    );
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(layout.bounds.minX);
      expect(n.x).toBeLessThanOrEqual(layout.bounds.maxX);
      expect(n.y).toBeGreaterThanOrEqual(layout.bounds.minY);
      expect(n.y).toBeLessThanOrEqual(layout.bounds.maxY);
    }
  });

  it("places people identically no matter what order they arrive in", () => {
    const people = [person("a"), person("b", "a"), person("c", "a"), person("d", "a")];
    const forward = layoutNetwork(people, opts);
    const backward = layoutNetwork([...people].reverse(), opts);

    for (const node of forward.nodes) {
      const other = backward.nodes.find((n) => n.id === node.id)!;
      expect(other.x).toBeCloseTo(node.x);
      expect(other.y).toBeCloseTo(node.y);
    }
  });

  it("gives a branch with more leaves a wider slice than a bare branch", () => {
    // "big" has three children and "small" has none, so of the four
    // leaves in the tree big owns three and earns three quarters of the
    // circle. Its children then sit a full pi apart. An equal split
    // between big and small would leave them only 2pi/3 apart, so the
    // threshold below is what separates weighted from naive.
    const layout = layoutNetwork(
      [
        person("root"),
        person("big", "root"),
        person("small", "root"),
        person("x", "big"),
        person("y", "big"),
        person("z", "big"),
      ],
      opts
    );
    const angles = layout.nodes
      .filter((n) => n.depth === 2)
      .map((n) => Math.atan2(n.y, n.x));
    expect(angles).toHaveLength(3);
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(2.5);
  });
});
