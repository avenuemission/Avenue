"use client";
import { leaderFetch } from "@/lib/client/leaderFetch";

// A failed leader read: the HTTP status and the server's own error text
// (null when the body had none), so a caller can keep its own wording.
export class LeaderFetchError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    readonly serverError: string | null
  ) {
    super(serverError ?? `${path} returned ${status}`);
    this.name = "LeaderFetchError";
  }
}

interface Entry {
  promise: Promise<unknown>;
  // Set once the request has succeeded; until then the entry is in flight.
  settledAt: number | null;
}

const cache = new Map<string, Entry>();

async function load(path: string): Promise<unknown> {
  const res = await leaderFetch(path);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const text = (body as { error?: unknown } | null)?.error;
    throw new LeaderFetchError(path, res.status, typeof text === "string" && text ? text : null);
  }
  return res.json();
}

// One GET per leader API path, shared by every component that asks for it
// at the same time (the layout, the dashboard, the avatar), and kept for
// maxAgeMs after it succeeds. A failure is never cached: the next call
// fetches again. Writes call clearLeaderCache(path) so the next read is
// fresh.
export function dedupedLeaderJson<T>(path: string, maxAgeMs = 5000): Promise<T> {
  const hit = cache.get(path);
  if (hit && (hit.settledAt === null || Date.now() - hit.settledAt < maxAgeMs)) {
    return hit.promise as Promise<T>;
  }
  const entry: Entry = { promise: Promise.resolve(), settledAt: null };
  entry.promise = load(path).then(
    (data) => {
      // Only the entry still in the cache is marked: a request that was
      // cleared while in flight must not come back as a fresh answer.
      if (cache.get(path) === entry) entry.settledAt = Date.now();
      return data;
    },
    (e: unknown) => {
      if (cache.get(path) === entry) cache.delete(path);
      throw e;
    }
  );
  cache.set(path, entry);
  return entry.promise as Promise<T>;
}

export function clearLeaderCache(path?: string): void {
  if (path === undefined) cache.clear();
  else cache.delete(path);
}
