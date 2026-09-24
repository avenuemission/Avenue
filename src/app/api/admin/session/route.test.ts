import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { GET } from "./route";

const PATH = "/api/admin/session";

beforeEach(() => {
  h.getSupabaseAdmin.mockReset().mockReturnValue(fakeSupabase().db);
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/admin/session", () => {
  it("is 204 with no body for the right key", async () => {
    const res = await GET(adminRequest(PATH));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("is 401 without a key or with a wrong one", async () => {
    expect((await GET(adminRequest(PATH, { key: null }))).status).toBe(401);
    expect((await GET(adminRequest(PATH, { key: "avenue2" }))).status).toBe(401);
  });

  it("is 429 with the lockout message while this IP is locked out", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ rate_limit_blocked: { data: true } }).db);
    const res = await GET(adminRequest(PATH));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("Too many attempts. Please wait a few minutes and try again.");
  });
});
