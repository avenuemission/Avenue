import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allow, isBlocked, RATE, supabaseRateDeps, type RateDeps } from "./rateLimit";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ getSupabaseAdmin: h.getSupabaseAdmin }));

function fakeDeps(overrides: Partial<RateDeps> = {}): RateDeps {
  return {
    hit: vi.fn(async () => true),
    blocked: vi.fn(async () => false),
    ...overrides,
  };
}

describe("RATE", () => {
  it("has the exact rules the rest of the app relies on", () => {
    expect(RATE).toEqual({
      form: { name: "form", windowSeconds: 600, max: 30 },
      formRecipient: { name: "form-to", windowSeconds: 3600, max: 3 },
      signup: { name: "signup", windowSeconds: 3600, max: 5 },
      openai: { name: "openai", windowSeconds: 3600, max: 60 },
      workshopCode: { name: "ws-code", windowSeconds: 600, max: 300 },
      workshopSubmit: { name: "ws-submit", windowSeconds: 600, max: 200 },
      adminFail: { name: "admin-fail", windowSeconds: 900, max: 5 },
      crossingScore: { name: "crossing", windowSeconds: 600, max: 60 },
      onramp: { name: "onramp", windowSeconds: 600, max: 300 },
    });
  });
});

describe("allow", () => {
  it("builds the key as `${rule.name}:${id}` and passes the window/max through", async () => {
    const deps = fakeDeps();
    const result = await allow(RATE.form, "1.2.3.4", deps);
    expect(result).toBe(true);
    expect(deps.hit).toHaveBeenCalledWith("form:1.2.3.4", 600, 30);
  });

  it("returns false when the deps report the caller is over the limit", async () => {
    const deps = fakeDeps({ hit: vi.fn(async () => false) });
    expect(await allow(RATE.adminFail, "9.9.9.9", deps)).toBe(false);
  });
});

describe("isBlocked", () => {
  it("builds the same key shape and passes the window/max through", async () => {
    const deps = fakeDeps();
    const result = await isBlocked(RATE.adminFail, "1.2.3.4", deps);
    expect(result).toBe(false);
    expect(deps.blocked).toHaveBeenCalledWith("admin-fail:1.2.3.4", 900, 5);
  });

  it("returns true when the deps report the caller is blocked", async () => {
    const deps = fakeDeps({ blocked: vi.fn(async () => true) });
    expect(await isBlocked(RATE.adminFail, "1.2.3.4", deps)).toBe(true);
  });
});

describe("supabaseRateDeps", () => {
  const asClient = (db: unknown) => db as SupabaseClient;

  it("hit() calls the rate_limit_hit RPC and returns its boolean result", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    h.getSupabaseAdmin.mockReturnValue(asClient({ rpc }));
    const deps = supabaseRateDeps();
    expect(await deps.hit("form:1.2.3.4", 600, 5)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", { p_key: "form:1.2.3.4", p_window_seconds: 600, p_max: 5 });
  });

  it("blocked() calls the rate_limit_blocked RPC and returns its boolean result", async () => {
    const rpc = vi.fn(async () => ({ data: false, error: null }));
    h.getSupabaseAdmin.mockReturnValue(asClient({ rpc }));
    const deps = supabaseRateDeps();
    expect(await deps.blocked("admin-fail:1.2.3.4", 900, 5)).toBe(false);
    expect(rpc).toHaveBeenCalledWith("rate_limit_blocked", {
      p_key: "admin-fail:1.2.3.4",
      p_window_seconds: 900,
      p_max: 5,
    });
  });

  it("hit() throws on an RPC error rather than silently allowing or blocking", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    h.getSupabaseAdmin.mockReturnValue(asClient({ rpc }));
    const deps = supabaseRateDeps();
    await expect(deps.hit("form:1.2.3.4", 600, 5)).rejects.toThrow("rate_limit_hit: boom");
  });

  it("blocked() throws on an RPC error", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    h.getSupabaseAdmin.mockReturnValue(asClient({ rpc }));
    const deps = supabaseRateDeps();
    await expect(deps.blocked("admin-fail:1.2.3.4", 900, 5)).rejects.toThrow("rate_limit_blocked: boom");
  });
});
