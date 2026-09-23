// A keyed create-once lock: concurrent callers for the same key share one
// in-flight promise instead of each starting their own request, and a
// rejected attempt clears its slot so the next call retries rather than
// replaying the same failure forever. The map is owned by the caller (kept
// alive for as long as duplicate creates must be prevented, e.g. one hook
// instance's lifetime) so this function stays pure and easy to test.
export function createOnce<T>(map: Map<string, Promise<T>>, key: string, factory: () => Promise<T>): Promise<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const promise = factory().catch((e: unknown) => {
    map.delete(key);
    throw e;
  });
  map.set(key, promise);
  return promise;
}
