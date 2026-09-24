import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));

import { DELETE, POST, PUT } from "./route";

const PATH = "/api/admin/content/pathway-groups";
const group = { name: "North", latitude: -37.8, longitude: 144.9, running: true };
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({
    "pathway_groups.insert": { data: [{ id: 1, ...group }] },
    "pathway_groups.update": { data: [{ id: 1, ...group }] },
  });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  h.revalidatePath.mockReset();
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin pathway group writes", () => {
  it("are 401 without the right admin key", async () => {
    expect((await POST(adminRequest(PATH, { method: "POST", body: group, key: null }))).status).toBe(401);
    expect((await PUT(adminRequest(PATH, { method: "PUT", body: { id: 1 }, key: "wrong" }))).status).toBe(401);
    expect((await DELETE(adminRequest(`${PATH}?id=1`, { method: "DELETE", key: null }))).status).toBe(401);
    expect(fake.tables()).toEqual([]);
  });

  it("POST drops unknown columns and refreshes /pathways", async () => {
    const res = await POST(adminRequest(PATH, { method: "POST", body: { ...group, id: 9, created_at: "x", admin: true } }));
    expect(res.status).toBe(200);
    expect(fake.calls.find((c) => c[1] === "insert")?.[2]).toEqual({ ...group, sort_order: 0 });
    expect(h.revalidatePath).toHaveBeenCalledWith("/pathways");
  });

  it("PUT is 400 for an out-of-range latitude and writes nothing", async () => {
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { id: 1, latitude: 200 } }));
    expect(res.status).toBe(400);
    expect(fake.tables()).toEqual([]);
  });

  it("PUT updates by numeric id; 404 when no row matched", async () => {
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { id: "1", ...group } }));
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual(["pathway_groups", "eq", "id", 1]);
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "pathway_groups.update": { data: [] } }).db);
    expect((await PUT(adminRequest(PATH, { method: "PUT", body: { id: 2, name: "x" } }))).status).toBe(404);
  });

  it("DELETE needs a numeric id", async () => {
    expect((await DELETE(adminRequest(`${PATH}?id=abc`, { method: "DELETE" }))).status).toBe(400);
    expect((await DELETE(adminRequest(`${PATH}?id=3`, { method: "DELETE" }))).status).toBe(200);
    expect(fake.calls).toContainEqual(["pathway_groups", "eq", "id", 3]);
  });
});
