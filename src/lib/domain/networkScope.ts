// ============================================================
// Who a leader may see in the discipleship network (spec D4).
// Approved leaders (full access) see everyone. A pending leader sees only
// their own node, the person who sent them out (whatever that link's
// status), and everyone descended from them through CONFIRMED links, plus
// their own direct children who have not joined (the names they added).
// An unconfirmed link to a joined person is only someone's claim, so it
// never opens that person's tree to a pending leader. Pure, so the rule is
// unit tested rather than clicked through.
// ============================================================

export interface ScopedPerson {
  id: string;
  sentOutBy: string | null;
  linkStatus: string;
  joined: boolean;
}

// The walk trusts nothing about the graph's shape: every node is visited
// at most once, so a corrupted row that points back at an ancestor (or at
// itself) can never make it loop. The original order and objects are kept.
export function scopeNetwork<T extends ScopedPerson>(people: T[], viewerId: string | null, fullAccess: boolean): T[] {
  if (fullAccess) return people;
  if (viewerId === null) return [];
  const viewer = people.find((p) => p.id === viewerId);
  if (!viewer) return [];

  const childrenOf = new Map<string, T[]>();
  for (const p of people) {
    if (!p.sentOutBy) continue;
    const list = childrenOf.get(p.sentOutBy) ?? [];
    list.push(p);
    childrenOf.set(p.sentOutBy, list);
  }
  const followed = (parentId: string, child: T) =>
    child.linkStatus === "confirmed" || (parentId === viewerId && !child.joined);

  const visible = new Set<string>([viewerId]);
  const queue = [viewerId];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const child of childrenOf.get(id) ?? []) {
      if (visible.has(child.id) || !followed(id, child)) continue;
      visible.add(child.id);
      queue.push(child.id);
    }
  }
  if (viewer.sentOutBy) visible.add(viewer.sentOutBy);

  return people.filter((p) => visible.has(p.id));
}
