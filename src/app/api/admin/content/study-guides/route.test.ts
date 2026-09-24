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

const PATH = "/api/admin/content/study-guides";
const ID = "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c";
const guide = { guide_on: "2026-10-07", series: "James", topic: "Joy", spotify_url: "https://open.spotify.com/x" };
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({
    "study_guides.insert": { data: [{ id: ID, ...guide }] },
    "study_guides.update": { data: [{ id: ID, ...guide }] },
  });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  h.revalidatePath.mockReset();
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin study guide writes", () => {
  it("are 401 without the admin key and write nothing", async () => {
    const responses = [
      await POST(adminRequest(PATH, { method: "POST", body: guide, key: null })),
      await PUT(adminRequest(PATH, { method: "PUT", body: { id: ID, ...guide }, key: null })),
      await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE", key: null })),
    ];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(fake.tables()).toEqual([]);
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("POST is 400 for a javascript: link and writes nothing", async () => {
    const res = await POST(adminRequest(PATH, { method: "POST", body: { ...guide, pdf_url: "javascript:alert(1)" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("pdf_url must be an https:// link");
    expect(fake.tables()).toEqual([]);
  });

  it("PUT is 400 for a colour that is not #rrggbb", async () => {
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { id: ID, color: "red" } }));
    expect(res.status).toBe(400);
    expect(fake.tables()).toEqual([]);
  });

  it("POST writes only the whitelisted columns and refreshes the pages that show guides", async () => {
    const res = await POST(adminRequest(PATH, { method: "POST", body: { ...guide, id: "x", created_at: "y" } }));
    expect(res.status).toBe(200);
    const insert = fake.calls.find((c) => c[1] === "insert");
    expect(insert?.[2]).toEqual({ ...guide, sort_order: 0 });
    expect(h.revalidatePath.mock.calls.map((c) => c[0]).sort()).toEqual(["/leaders/study-guides", "/pathways"]);
  });

  it("PUT needs a uuid id and updates that row", async () => {
    expect((await PUT(adminRequest(PATH, { method: "PUT", body: { topic: "x" } }))).status).toBe(400);
    const res = await PUT(adminRequest(PATH, { method: "PUT", body: { id: ID, topic: "Hope" } }));
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual(["study_guides", "update", { topic: "Hope" }]);
    expect(fake.calls).toContainEqual(["study_guides", "eq", "id", ID]);
  });

  it("DELETE needs a uuid id", async () => {
    expect((await DELETE(adminRequest(`${PATH}?id=7`, { method: "DELETE" }))).status).toBe(400);
    expect((await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE" }))).status).toBe(200);
    expect(fake.calls).toContainEqual(["study_guides", "eq", "id", ID]);
    expect(h.revalidatePath).toHaveBeenCalledWith("/pathways");
  });

  it("is 400 for a body that is not JSON", async () => {
    expect((await POST(adminRequest(PATH, { method: "POST", body: "{nope" }))).status).toBe(400);
  });
});
