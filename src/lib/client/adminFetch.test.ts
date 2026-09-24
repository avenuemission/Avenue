import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_KEY_EVENT, ADMIN_KEY_STORAGE, adminErrorMessage, adminFetch } from "./adminFetch";

// Node has no window or sessionStorage: a small in-memory stand-in.
const store = new Map<string, string>();
const events: string[] = [];

beforeEach(() => {
  store.clear();
  events.length = 0;
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("window", { dispatchEvent: (e: Event) => events.push(e.type) });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminFetch", () => {
  it("sends the key as a Bearer token and keeps the caller's headers and method", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await adminFetch("/api/admin/session", "avenue", { method: "PUT", headers: { "Content-Type": "application/json" } });
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(path).toBe("/api/admin/session");
    expect(init.method).toBe("PUT");
    expect(headers.get("authorization")).toBe("Bearer avenue");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("clears the stored key on a 401 and tells the page", async () => {
    store.set(ADMIN_KEY_STORAGE, "old");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const res = await adminFetch("/api/admin/leaders", "old");
    expect(res.status).toBe(401);
    expect(store.has(ADMIN_KEY_STORAGE)).toBe(false);
    expect(events).toEqual([ADMIN_KEY_EVENT]);
  });

  it("keeps the stored key on any other status", async () => {
    store.set(ADMIN_KEY_STORAGE, "avenue");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await adminFetch("/api/admin/leaders", "avenue");
    expect(store.get(ADMIN_KEY_STORAGE)).toBe("avenue");
    expect(events).toEqual([]);
  });
});

describe("adminErrorMessage", () => {
  it("uses the server's error text, else the status", async () => {
    expect(await adminErrorMessage(new Response(JSON.stringify({ error: "id required" }), { status: 400 }))).toBe(
      "id required"
    );
    expect(await adminErrorMessage(new Response("oops", { status: 502, statusText: "Bad Gateway" }))).toBe(
      "502 Bad Gateway"
    );
  });
});
