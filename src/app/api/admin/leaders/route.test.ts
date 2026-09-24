import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { DELETE, GET, POST, PUT } from "./route";

const PATH = "/api/admin/leaders";
const leader = { id: "1", email: "a@example.invalid", name: "A", full_access: true, created_at: "2026-09-01" };
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({
    "leaders.select": { data: [leader] },
    "leaders.insert": { data: [leader] },
    "leaders.update": { data: [leader] },
    "leaders.delete": { data: [{ email: leader.email }] },
  });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/admin/leaders", () => {
  it("every method is 401 without the admin key and reads nothing", async () => {
    const responses = [
      await GET(adminRequest(PATH, { key: null })),
      await POST(adminRequest(PATH, { method: "POST", body: { email: "b@example.invalid", name: "B" }, key: null })),
      await PUT(adminRequest(PATH, { method: "PUT", body: { email: leader.email, full_access: true }, key: null })),
      await DELETE(adminRequest(`${PATH}?email=${leader.email}`, { method: "DELETE", key: null })),
    ];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    expect(fake.tables()).toEqual([]);
  });

  it("GET lists leaders newest first", async () => {
    const res = await GET(adminRequest(PATH));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ leaders: [leader] });
    expect(fake.calls).toContainEqual(["leaders", "order", "created_at", { ascending: false }]);
  });

  it("POST inserts only email, name, full_access and an id; 409 for a duplicate", async () => {
    const res = await POST(adminRequest(PATH, { method: "POST", body: { email: "B@Example.invalid", name: "B", role: "x" } }));
    expect(res.status).toBe(200);
    const row = fake.calls.find((c) => c[1] === "insert")?.[2] as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(["email", "full_access", "id", "name"]);
    expect(row).toMatchObject({ email: "b@example.invalid", name: "B", full_access: false });

    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leaders.insert": { error: { message: "dup", code: "23505" } } }).db);
    const dup = await POST(adminRequest(PATH, { method: "POST", body: { email: "b@example.invalid", name: "B" } }));
    expect(dup.status).toBe(409);
  });

  it("PUT is 400 without a boolean, 404 for a missing leader, 200 with the leader", async () => {
    expect((await PUT(adminRequest(PATH, { method: "PUT", body: { email: leader.email } }))).status).toBe(400);
    const ok = await PUT(adminRequest(PATH, { method: "PUT", body: { email: "A@example.invalid", full_access: true } }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).leader).toEqual(leader);
    expect(fake.calls).toContainEqual(["leaders", "eq", "email", "a@example.invalid"]);
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leaders.update": { data: [] } }).db);
    expect((await PUT(adminRequest(PATH, { method: "PUT", body: { email: "x@y.co", full_access: true } }))).status).toBe(404);
  });

  it("DELETE needs an email and is 404 when nobody matched", async () => {
    expect((await DELETE(adminRequest(PATH, { method: "DELETE" }))).status).toBe(400);
    expect((await DELETE(adminRequest(`${PATH}?email=${leader.email}`, { method: "DELETE" }))).status).toBe(200);
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leaders.delete": { data: [] } }).db);
    expect((await DELETE(adminRequest(`${PATH}?email=x@y.co`, { method: "DELETE" }))).status).toBe(404);
  });
});
