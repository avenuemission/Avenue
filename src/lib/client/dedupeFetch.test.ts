import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// leaderFetch is replaced, so these tests touch no network and no Supabase.
const h = vi.hoisted(() => ({ leaderFetch: vi.fn() }));
vi.mock("@/lib/client/leaderFetch", () => ({ leaderFetch: h.leaderFetch }));

import { clearLeaderCache, dedupedLeaderJson, LeaderFetchError } from "./dedupeFetch";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  h.leaderFetch.mockReset();
  clearLeaderCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("dedupedLeaderJson", () => {
  it("shares one fetch between two callers of the same path", async () => {
    h.leaderFetch.mockResolvedValue(json(200, { full_access: true }));
    const [a, b] = await Promise.all([dedupedLeaderJson("/api/leader-access"), dedupedLeaderJson("/api/leader-access")]);
    expect(a).toEqual({ full_access: true });
    expect(b).toEqual({ full_access: true });
    expect(h.leaderFetch).toHaveBeenCalledTimes(1);
    expect(h.leaderFetch).toHaveBeenCalledWith("/api/leader-access");
  });

  it("serves a later caller from the cache inside maxAgeMs, then refetches", async () => {
    h.leaderFetch.mockImplementation(async () => json(200, { n: h.leaderFetch.mock.calls.length }));
    expect(await dedupedLeaderJson("/api/network")).toEqual({ n: 1 });
    vi.advanceTimersByTime(4000);
    expect(await dedupedLeaderJson("/api/network")).toEqual({ n: 1 });
    vi.advanceTimersByTime(2000);
    expect(await dedupedLeaderJson("/api/network")).toEqual({ n: 2 });
    expect(h.leaderFetch).toHaveBeenCalledTimes(2);
  });

  it("honours a custom maxAgeMs", async () => {
    h.leaderFetch.mockImplementation(async () => json(200, {}));
    await dedupedLeaderJson("/api/network", 100);
    vi.advanceTimersByTime(150);
    await dedupedLeaderJson("/api/network", 100);
    expect(h.leaderFetch).toHaveBeenCalledTimes(2);
  });

  it("keeps separate paths separate", async () => {
    h.leaderFetch.mockImplementation(async (path: string) => json(200, { path }));
    expect(await dedupedLeaderJson("/api/a")).toEqual({ path: "/api/a" });
    expect(await dedupedLeaderJson("/api/b")).toEqual({ path: "/api/b" });
    expect(h.leaderFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects every waiting caller with the server's error text and status", async () => {
    h.leaderFetch.mockResolvedValue(json(403, { error: "Not a leader account" }));
    const a = dedupedLeaderJson("/api/network");
    const b = dedupedLeaderJson("/api/network");
    await expect(a).rejects.toThrow("Not a leader account");
    const err = await b.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LeaderFetchError);
    expect((err as LeaderFetchError).status).toBe(403);
    expect((err as LeaderFetchError).serverError).toBe("Not a leader account");
    expect(h.leaderFetch).toHaveBeenCalledTimes(1);
  });

  it("names the path and status when the server gives no error text", async () => {
    h.leaderFetch.mockResolvedValue(new Response("oops", { status: 502 }));
    const err = await dedupedLeaderJson("/api/network").catch((e: unknown) => e);
    expect((err as Error).message).toBe("/api/network returned 502");
    expect((err as LeaderFetchError).serverError).toBeNull();
  });

  it("does not cache a failure: the next call fetches again", async () => {
    h.leaderFetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(json(200, { ok: 1 }));
    await expect(dedupedLeaderJson("/api/network")).rejects.toThrow("offline");
    expect(await dedupedLeaderJson("/api/network")).toEqual({ ok: 1 });
    expect(h.leaderFetch).toHaveBeenCalledTimes(2);
  });

  it("rejects when a 200 body is not JSON", async () => {
    h.leaderFetch.mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(dedupedLeaderJson("/api/network")).rejects.toThrow();
  });
});

describe("clearLeaderCache", () => {
  it("forces a fresh fetch for that path only", async () => {
    h.leaderFetch.mockImplementation(async (path: string) => json(200, { path }));
    await dedupedLeaderJson("/api/a");
    await dedupedLeaderJson("/api/b");
    clearLeaderCache("/api/a");
    await dedupedLeaderJson("/api/a");
    await dedupedLeaderJson("/api/b");
    expect(h.leaderFetch.mock.calls.map((c) => c[0])).toEqual(["/api/a", "/api/b", "/api/a"]);
  });

  it("with no path clears everything", async () => {
    h.leaderFetch.mockImplementation(async (path: string) => json(200, { path }));
    await dedupedLeaderJson("/api/a");
    await dedupedLeaderJson("/api/b");
    clearLeaderCache();
    await dedupedLeaderJson("/api/a");
    await dedupedLeaderJson("/api/b");
    expect(h.leaderFetch).toHaveBeenCalledTimes(4);
  });

  it("does not let a request started before a clear repopulate the cache", async () => {
    let resolveFirst: (r: Response) => void = () => {};
    h.leaderFetch
      .mockImplementationOnce(() => new Promise<Response>((r) => (resolveFirst = r)))
      .mockImplementation(async () => json(200, { v: "fresh" }));
    const stale = dedupedLeaderJson("/api/network");
    clearLeaderCache("/api/network");
    resolveFirst(json(200, { v: "stale" }));
    expect(await stale).toEqual({ v: "stale" });
    expect(await dedupedLeaderJson("/api/network")).toEqual({ v: "fresh" });
  });
});
