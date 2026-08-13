// ============================================================
// Pure helpers for /api/network. No database, no React, so the rules
// that matter are unit tested rather than clicked through.
// ============================================================

// A person cannot be more than this many links from a root. Well past
// anything real, and it stops a corrupted chain hanging a request.
export const MAX_CHAIN = 50;

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  return cleaned === "" ? null : cleaned;
}

// Would setting childId's parent to newParentId close a loop? Walks up
// from the proposed parent. Anything suspicious (reaching the child,
// revisiting a node, or an absurdly long chain) is a refusal, because
// the cost of a false refusal is one confused leader and the cost of a
// false pass is a graph that hangs the page.
export function wouldCreateCycle(
  parentOf: Map<string, string | null>,
  childId: string,
  newParentId: string | null
): boolean {
  if (newParentId === null) return false;
  if (newParentId === childId) return true;

  const seen = new Set<string>();
  let current: string | null = newParentId;

  for (let hops = 0; current !== null; hops++) {
    if (hops >= MAX_CHAIN) return true;
    if (current === childId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }

  return false;
}
