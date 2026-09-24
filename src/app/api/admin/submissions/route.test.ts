import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { DELETE, GET, PATCH } from "./route";

const PATH = "/api/admin/submissions";
const ID = "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c";
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({ "form_submissions.select": { data: [{ id: ID, form_type: "join-pathway" }] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/admin/submissions", () => {
  it("every method is 401 without the admin key and reads nothing", async () => {
    const responses = [
      await GET(adminRequest(PATH, { key: null })),
      await PATCH(adminRequest(PATH, { method: "PATCH", body: { id: ID, archived: true }, key: null })),
      await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE", key: null })),
    ];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(fake.tables()).toEqual([]);
  });

  it("GET filters by form type, but not for all", async () => {
    await GET(adminRequest(`${PATH}?type=join-pathway`));
    expect(fake.calls).toContainEqual(["form_submissions", "eq", "form_type", "join-pathway"]);
    const all = fakeSupabase();
    h.getSupabaseAdmin.mockReturnValue(all.db);
    const res = await GET(adminRequest(`${PATH}?type=all`));
    expect(await res.json()).toEqual({ submissions: [] });
    expect(all.calls.some((c) => c[1] === "eq")).toBe(false);
  });

  it("PATCH archives by uuid and refuses anything else", async () => {
    expect((await PATCH(adminRequest(PATH, { method: "PATCH", body: { id: "7", archived: true } }))).status).toBe(400);
    const res = await PATCH(adminRequest(PATH, { method: "PATCH", body: { id: ID, archived: true, form_type: "x" } }));
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual(["form_submissions", "update", { archived: true }]);
  });

  it("DELETE needs a uuid id", async () => {
    expect((await DELETE(adminRequest(`${PATH}?id=abc`, { method: "DELETE" }))).status).toBe(400);
    expect((await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE" }))).status).toBe(200);
    expect(fake.calls).toContainEqual(["form_submissions", "eq", "id", ID]);
  });
});
