import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { GET } from "./route";

const PATH = "/api/admin/onramp";
const ROW = {
  id: "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c",
  name: "Ann",
  email: "ann@example.invalid",
  workshops: ["worship"],
  created_at: "2026-10-31T01:00:00Z",
  updated_at: "2026-10-31T01:00:00Z",
};
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({ "onramp_signups.select": { data: [ROW] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/admin/onramp", () => {
  it("is 401 without the admin passcode and reads no sign-ups", async () => {
    expect((await GET(adminRequest(PATH, { key: null }))).status).toBe(401);
    expect((await GET(adminRequest(PATH, { key: "wrong" }))).status).toBe(401);
    expect(fake.calls.some((c) => c[0] === "onramp_signups")).toBe(false);
  });

  it("lists every sign-up, newest first", async () => {
    const res = await GET(adminRequest(PATH));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signups: [ROW] });
    expect(fake.calls).toContainEqual(["onramp_signups", "order", "created_at", { ascending: false }]);
  });
});
