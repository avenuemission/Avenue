import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { RateDeps } from "@/lib/server/rateLimit";
import { adminKeyMatches, requireAdmin } from "./requireAdmin";

const KEY = "avenue";

function fakeDeps(overrides: Partial<RateDeps> = {}): RateDeps {
  return {
    hit: vi.fn(async () => true),
    blocked: vi.fn(async () => false),
    ...overrides,
  };
}

function request(options: { authorization?: string; ip?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.authorization) headers.authorization = options.authorization;
  if (options.ip) headers["x-nf-client-connection-ip"] = options.ip;
  return new NextRequest("http://localhost/api/admin/leaders", { headers });
}

describe("adminKeyMatches", () => {
  it("matches the right key", () => {
    expect(adminKeyMatches(`Bearer ${KEY}`, KEY)).toBe(true);
  });

  it("rejects the wrong key", () => {
    expect(adminKeyMatches("Bearer nope", KEY)).toBe(false);
  });

  it("rejects a key of a different length", () => {
    expect(adminKeyMatches("Bearer x", KEY)).toBe(false);
    expect(adminKeyMatches("Bearer avenue-and-then-some-more", KEY)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(adminKeyMatches(null, KEY)).toBe(false);
  });

  it("is false when no admin key is configured on the server", () => {
    expect(adminKeyMatches(`Bearer ${KEY}`, undefined)).toBe(false);
    expect(adminKeyMatches(`Bearer ${KEY}`, "")).toBe(false);
  });

  it("is case-sensitive on the Bearer scheme, same as the old check", () => {
    expect(adminKeyMatches(`bearer ${KEY}`, KEY)).toBe(false);
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_API_KEY", KEY);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is 429 when the IP is already locked out, even with the right key", async () => {
    const deps = fakeDeps({ blocked: vi.fn(async () => true) });
    const result = await requireAdmin(request({ authorization: `Bearer ${KEY}`, ip: "1.2.3.4" }), deps);
    expect("response" in result && result.response.status).toBe(429);
    expect(deps.hit).not.toHaveBeenCalled();
  });

  it("counts a failed key against the lockout and returns 401", async () => {
    const deps = fakeDeps();
    const result = await requireAdmin(request({ authorization: "Bearer wrong", ip: "1.2.3.4" }), deps);
    expect("response" in result && result.response.status).toBe(401);
    expect(deps.hit).toHaveBeenCalledWith("admin-fail:1.2.3.4", 900, 5);
  });

  it("counts a missing key as a failure", async () => {
    const deps = fakeDeps();
    const result = await requireAdmin(request({ ip: "1.2.3.4" }), deps);
    expect("response" in result && result.response.status).toBe(401);
    expect(deps.hit).toHaveBeenCalledWith("admin-fail:1.2.3.4", 900, 5);
  });

  it("succeeds with the right key and a healthy service-role key, without counting a failure", async () => {
    const deps = fakeDeps();
    const result = await requireAdmin(request({ authorization: `Bearer ${KEY}`, ip: "1.2.3.4" }), deps);
    expect(result).toEqual({ ok: true });
    expect(deps.hit).not.toHaveBeenCalled();
    expect(deps.blocked).toHaveBeenCalledWith("admin-fail:1.2.3.4", 900, 5);
  });

  it("surfaces the service-role-key diagnostic before any rate-limit or key check", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const deps = fakeDeps();
    const result = await requireAdmin(request({ authorization: `Bearer ${KEY}`, ip: "1.2.3.4" }), deps);
    expect("response" in result && result.response.status).toBe(500);
    expect(deps.hit).not.toHaveBeenCalled();
    expect(deps.blocked).not.toHaveBeenCalled();
  });

  it("returns the misconfig message with no injected deps at all, since it never reaches the rate-limit RPCs", async () => {
    // No deps argument: if adminConfigError() did not run first, this would
    // fall through to the real supabaseRateDeps(), which calls
    // getSupabaseAdmin() and throws for exactly this same misconfiguration,
    // turning a diagnosable message into a bare 500 (or an unhandled
    // rejection, since callers don't wrap requireAdmin in try/catch).
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const result = await requireAdmin(request({ authorization: `Bearer ${KEY}`, ip: "1.2.3.4" }));
    expect("response" in result && result.response.status).toBe(500);
    const body = "response" in result ? await result.response.json() : null;
    expect(body?.error).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("wraps a rate-limit RPC failure in a generic serverError instead of throwing", async () => {
    const deps = fakeDeps({ blocked: vi.fn(async () => { throw new Error("db unreachable"); }) });
    const result = await requireAdmin(request({ authorization: `Bearer ${KEY}`, ip: "1.2.3.4" }), deps);
    expect("response" in result && result.response.status).toBe(500);
    const body = "response" in result ? await result.response.json() : null;
    expect(body).toEqual({ error: "Something went wrong. Please try again." });
  });
});
