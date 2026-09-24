// ============================================================
// Who a leader may see in the discipleship network (spec D4).
// Approved leaders (full access) see everyone. A pending leader sees only
// their own node, the person who sent them out, and everyone descended
// from them. Pure, so the rule is unit tested rather than clicked through.
// ============================================================

export interface ScopedPerson {
  id: string;
  sentOutBy: string | null;
}

// The walk trusts nothing about the graph's shape: every node is visited
// at most once, so a corrupted row that points back at an ancestor (or at
// itself) can never make it loop. The original order and objects are kept.
export function scopeNetwork<T extends ScopedPerson>(people: T[], viewerId: string | null, fullAccess: boolean): T[] {
  if (fullAccess) return people;
  if (viewerId === null) return [];
  const viewer = people.find((p) => p.id === viewerId);
  if (!viewer) return [];

  const childrenOf = new Map<string, string[]>();
  for (const p of people) {
    if (!p.sentOutBy) continue;
    const list = childrenOf.get(p.sentOutBy) ?? [];
    list.push(p.id);
    childrenOf.set(p.sentOutBy, list);
  }

  const visible = new Set<string>([viewerId]);
  const queue = [viewerId];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const childId of childrenOf.get(id) ?? []) {
      if (visible.has(childId)) continue;
      visible.add(childId);
      queue.push(childId);
    }
  }
  if (viewer.sentOutBy) visible.add(viewer.sentOutBy);

  return people.filter((p) => visible.has(p.id));
}
