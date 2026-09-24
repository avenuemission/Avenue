import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Supabase and leaderFetch are replaced, so nothing touches the network.
const h = vi.hoisted(() => ({ signOut: vi.fn(), leaderFetch: vi.fn() }));
vi.mock("@/lib/client/supabaseBrowser", () => ({ supabase: { auth: { signOut: h.signOut } } }));
vi.mock("@/lib/client/leaderFetch", () => ({ leaderFetch: h.leaderFetch }));

import { logout } from "./auth";
import { dedupedLeaderJson } from "./dedupeFetch";

beforeEach(() => {
  h.signOut.mockReset().mockResolvedValue({ error: null });
  h.leaderFetch.mockReset().mockImplementation(async () => new Response(JSON.stringify({ full_access: true }), { status: 200 }));
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { removeItem: vi.fn(), getItem: vi.fn(), setItem: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("logout", () => {
  it("drops the shared leader reads, so the next leader never sees the last one's answers", async () => {
    await dedupedLeaderJson("/api/leader-access");
    logout();
    await dedupedLeaderJson("/api/leader-access");
    expect(h.leaderFetch).toHaveBeenCalledTimes(2);
  });

  it("still clears the cached user and signs out locally", () => {
    logout();
    expect(localStorage.removeItem).toHaveBeenCalledWith("avenue_auth_session");
    expect(h.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
