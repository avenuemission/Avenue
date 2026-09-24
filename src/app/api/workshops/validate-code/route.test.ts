import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ allow: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/rateLimit")>()),
  allow: h.allow,
}));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { POST } from "./route";

const IP = "203.0.113.10";
let fake: ReturnType<typeof fakeSupabase>;

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/workshops/validate-code", {
      method: "POST",
      headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  h.allow.mockReset().mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/workshops/validate-code", () => {
  it("rate-limits by IP before touching the database", async () => {
    h.allow.mockResolvedValueOnce(false);
    fake = fakeSupabase();
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ code: "ABCD" });
    expect(res.status).toBe(429);
    expect(fake.calls).toEqual([]);
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "ws-code" }), IP);
  });

  it("a JSON 500, never a bodyless one, when the rate limiter is down", async () => {
    h.allow.mockRejectedValueOnce(new Error("rate_limit_hit: connection refused"));
    fake = fakeSupabase();
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ code: "ABCD" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong. Please try again." });
    expect(fake.calls).toEqual([]);
  });

  it("valid: an exact match via the admin client", async () => {
    fake = fakeSupabase({ "workshop_sessions.select.single": { data: { code: "ABCD", status: "active", include_life_3: true } } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ code: "abcd" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, code: "ABCD", include_life_3: true });
  });

  it("400 when no code is given", async () => {
    fake = fakeSupabase();
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    expect((await post({})).status).toBe(400);
    expect((await post("{nope")).status).toBe(400);
    expect(fake.calls).toEqual([]);
  });

  it("suggests the closest active code within 2 edits", async () => {
    fake = fakeSupabase({
      "workshop_sessions.select.single": { data: null },
      "workshop_sessions.select": { data: [{ code: "ABCD" }] },
    });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ code: "ABCE" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.suggestion).toBe("ABCD");
  });

  it("not found when nothing is close", async () => {
    fake = fakeSupabase({
      "workshop_sessions.select.single": { data: null },
      "workshop_sessions.select": { data: [{ code: "ZZZZ" }] },
    });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ code: "ABCD" });
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.suggestion).toBeUndefined();
  });
});
