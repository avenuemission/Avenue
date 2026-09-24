// ============================================================
// Radial "snowflake" layout for the discipleship network.
//
// Pure maths: people in, coordinates out. It never throws and it never
// loops forever. Bad input (a parent that does not exist, or a cycle)
// is treated as "no parent", so one corrupted row can never blank the
// page. /api/network is what stops cycles being written in the first
// place; this is the second line of defence.
// ============================================================

export interface NetworkPerson {
  id: string;
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  sentOutBy: string | null;
  linkStatus: "pending" | "confirmed";
  joined: boolean;
}

interface LayoutNode {
  id: string;
  person: NetworkPerson;
  x: number;
  y: number;
  depth: number;
}

interface LayoutEdge {
  fromId: string;
  toId: string;
  confirmed: boolean;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: Bounds;
}

const DEFAULT_RADIUS_STEP = 170;
const TAU = Math.PI * 2;
const START_ANGLE = -Math.PI / 2; // first branch points straight up

// Walking up from startId, do we ever revisit a node? That covers both
// "this person is their own ancestor" and "this person hangs off someone
// else's cycle". Either way the parent link is not safe to draw.
function walkRevisits(parentOf: ReadonlyMap<string, string | null>, startId: string): boolean {
  const seen = new Set<string>([startId]);
  let current = parentOf.get(startId) ?? null;
  while (current !== null) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

export function layoutNetwork(
  people: NetworkPerson[],
  options: { radiusStep?: number } = {}
): Layout {
  const radiusStep = options.radiusStep ?? DEFAULT_RADIUS_STEP;
  const byId = new Map(people.map((p) => [p.id, p]));

  // 1. Keep only parent links that point at someone real.
  const rawParent = new Map<string, string | null>();
  for (const p of people) {
    rawParent.set(p.id, p.sentOutBy && byId.has(p.sentOutBy) ? p.sentOutBy : null);
  }

  // 2. Drop every link whose chain loops, judged against the untouched
  //    map above. Deciding against a map we were halfway through editing
  //    would make the result depend on array order. After this the graph
  //    is guaranteed to be a forest.
  const parentOf = new Map<string, string | null>();
  for (const p of people) {
    parentOf.set(p.id, walkRevisits(rawParent, p.id) ? null : rawParent.get(p.id) ?? null);
  }

  // 3. Index children, sorted so the chart does not reshuffle between loads.
  const order = [...people].sort((a, b) =>
    a.firstName.localeCompare(b.firstName) || a.id.localeCompare(b.id)
  );
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];
  for (const p of order) {
    const parent = parentOf.get(p.id) ?? null;
    if (parent === null) {
      roots.push(p.id);
    } else {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), p.id]);
    }
  }

  // 4. Leaf counts decide how much arc each branch earns, so a dense
  //    branch gets room and a bare one does not waste it.
  const leafCount = new Map<string, number>();
  const countLeaves = (id: string): number => {
    const kids = childrenOf.get(id) ?? [];
    const total = kids.length === 0 ? 1 : kids.reduce((sum, k) => sum + countLeaves(k), 0);
    leafCount.set(id, total);
    return total;
  };
  for (const rootId of roots) countLeaves(rootId);

  // 5. Hand each subtree its wedge and place its node at the midpoint.
  const nodes: LayoutNode[] = [];
  const place = (id: string, depth: number, from: number, to: number) => {
    const person = byId.get(id);
    if (!person) return;

    const angle = (from + to) / 2;
    const radius = depth * radiusStep;
    nodes.push({
      id,
      person,
      x: radius === 0 ? 0 : radius * Math.cos(angle),
      y: radius === 0 ? 0 : radius * Math.sin(angle),
      depth,
    });

    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return;
    const total = kids.reduce((sum, k) => sum + (leafCount.get(k) ?? 1), 0) || 1;
    let cursor = from;
    for (const kid of kids) {
      const span = ((leafCount.get(kid) ?? 1) / total) * (to - from);
      place(kid, depth + 1, cursor, cursor + span);
      cursor += span;
    }
  };

  if (roots.length === 1) {
    // One root reads best dead centre with the whole circle to spend.
    place(roots[0], 0, START_ANGLE, START_ANGLE + TAU);
  } else {
    const total = roots.reduce((sum, r) => sum + (leafCount.get(r) ?? 1), 0) || 1;
    let cursor = START_ANGLE;
    for (const rootId of roots) {
      const span = ((leafCount.get(rootId) ?? 1) / total) * TAU;
      place(rootId, 1, cursor, cursor + span);
      cursor += span;
    }
  }

  const edges: LayoutEdge[] = [];
  for (const p of order) {
    const parent = parentOf.get(p.id) ?? null;
    if (parent !== null) {
      edges.push({ fromId: parent, toId: p.id, confirmed: p.linkStatus === "confirmed" });
    }
  }

  const bounds = nodes.reduce<Bounds>(
    (acc, n) => ({
      minX: Math.min(acc.minX, n.x),
      minY: Math.min(acc.minY, n.y),
      maxX: Math.max(acc.maxX, n.x),
      maxY: Math.max(acc.maxY, n.y),
    }),
    { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  );

  return { nodes, edges, bounds };
}
