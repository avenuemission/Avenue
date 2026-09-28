import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { DELETE, GET } from "./route";

const PATH = "/api/admin/crossing-scores";
const ID = "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c";
const ROW = { id: ID, initials: "JEM", score: 40, duration_ms: 60_000, created_at: "2026-09-28T01:00:00Z" };
let fake: ReturnType<typeof fakeSupabase>;
// The table's own calls, without requireAdmin's lockout lookups.
const scoreCalls = () => fake.calls.filter((c) => c[0] === "crossing_scores" && c[1] !== "from");

beforeEach(() => {
  fake = fakeSupabase({ "crossing_scores.select": { data: [ROW] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/admin/crossing-scores", () => {
  it("every method is 401 without the admin key and reads nothing", async () => {
    const responses = [
      await GET(adminRequest(PATH, { key: null })),
      await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE", key: null })),
    ];
    expect(responses.map((r) => r.status)).toEqual([401, 401]);
    expect(fake.tables()).toEqual([]);
  });

  it("GET lists the top 100 with ids", async () => {
    const res = await GET(adminRequest(PATH));
    expect(await res.json()).toEqual({ scores: [ROW] });
    expect(fake.calls).toContainEqual(["crossing_scores", "limit", 100]);
  });

  it("DELETE needs a uuid id and deletes only that row", async () => {
    expect((await DELETE(adminRequest(`${PATH}?id=abc`, { method: "DELETE" }))).status).toBe(400);
    expect(scoreCalls()).toEqual([]);
    expect((await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE" }))).status).toBe(200);
    expect(scoreCalls()).toEqual([
      ["crossing_scores", "delete"],
      ["crossing_scores", "eq", "id", ID],
    ]);
  });
});
