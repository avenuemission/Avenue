import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));

import { PUT } from "./route";

const PATH = "/api/admin/content/site-stats";
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({ "site_stats.upsert": { data: [{ key: "communities", value: 5, label: "C" }] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  h.revalidatePath.mockReset();
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PUT /api/admin/content/site-stats", () => {
  it("is 401 without the admin key", async () => {
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { key: "communities", value: 5 }, key: null }));
    expect(res.status).toBe(401);
    expect(fake.tables()).toEqual([]);
  });

  it("is 400 for a negative value", async () => {
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { key: "communities", value: -1 } }));
    expect(res.status).toBe(400);
    expect(fake.tables()).toEqual([]);
  });

  it("upserts key, value and label only, then refreshes /pathways", async () => {
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { key: "communities", value: 5, label: "C", x: 1 } }));
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual([
      "site_stats",
      "upsert",
      { key: "communities", value: 5, label: "C" },
      { onConflict: "key" },
    ]);
    expect(h.revalidatePath).toHaveBeenCalledWith("/pathways");
  });
});
