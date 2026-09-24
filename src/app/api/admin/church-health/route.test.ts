import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Only the database is replaced. isAdminAuthorized and adminConfigError are
// the real ones, driven by the env values stubbed below.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { GET } from "./route";

const KEY = "test-admin-key";
const get = (authorization?: string) =>
  GET(
    new NextRequest("http://localhost/api/admin/church-health", {
      headers: authorization ? { authorization } : {},
    })
  );

beforeEach(() => {
  h.getSupabaseAdmin.mockReset();
  vi.stubEnv("ADMIN_API_KEY", KEY);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/admin/church-health", () => {
  it("is 401 without the admin key and never opens the database", async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 401 with the wrong key", async () => {
    const res = await get("Bearer nope");
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 401 when no admin key is configured on the server", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const res = await get("Bearer ");
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("reads the four tables and returns the aggregation", async () => {
    const fake = fakeSupabase({
      leaders: { data: [{ email: "ann@example.invalid", name: "Ann", full_access: true }] },
      leader_profiles: { data: [] },
      leader_people: {
        data: [
          {
            owner_email: "ann@example.invalid",
            first_name: "Sam",
            last_name: null,
            metrics: ["pathways"],
            created_at: "2026-09-15T00:00:00Z",
          },
        ],
      },
      leader_checkins: { data: [] },
    });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await get(`Bearer ${KEY}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals).toEqual({ pathways: 1, intersections: 0, streetlights: 0 });
    expect(body.leaders).toHaveLength(1);
    expect(fake.tables().sort()).toEqual(["leader_checkins", "leader_people", "leader_profiles", "leaders"]);
  });

  it("fails loud with the database message", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ leader_people: { error: { message: "boom" } } }).db);
    const res = await get(`Bearer ${KEY}`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "leader_people: boom" });
  });
});
