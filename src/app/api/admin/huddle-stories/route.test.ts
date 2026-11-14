import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { DELETE, GET, POST, PUT } from "./route";

const PATH = "/api/admin/huddle-stories";
const ID = "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c";
const ROW = { id: ID, label: "November huddle", held_on: "2026-11-10", pathways: 5, intersections: 0, streetlights: 1 };
const BODY = { label: "November huddle", heldOn: "2026-11-10", pathways: 5, intersections: 0, streetlights: 1 };
let fake: ReturnType<typeof fakeSupabase>;
const tableCalls = () => fake.calls.filter((c) => c[0] === "huddle_stories" && c[1] !== "from");

beforeEach(() => {
  fake = fakeSupabase({
    "huddle_stories.select": { data: [ROW] },
    "huddle_stories.insert.single": { data: ROW },
    "huddle_stories.update.single": { data: ROW },
  });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("/api/admin/huddle-stories", () => {
  it("every method is 401 without the admin passcode and touches nothing", async () => {
    const responses = [
      await GET(adminRequest(PATH, { key: null })),
      await POST(adminRequest(PATH, { method: "POST", body: BODY, key: null })),
      await PUT(adminRequest(`${PATH}?id=${ID}`, { method: "PUT", body: BODY, key: null })),
      await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE", key: null })),
    ];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    expect(tableCalls()).toEqual([]);
  });

  it("GET lists entries, newest first", async () => {
    expect(await (await GET(adminRequest(PATH))).json()).toEqual({ entries: [ROW] });
    expect(fake.calls).toContainEqual(["huddle_stories", "order", "held_on", { ascending: false }]);
  });

  it("POST saves only the name, date and three numbers", async () => {
    const res = await POST(adminRequest(PATH, { method: "POST", body: { ...BODY, names: ["Ann"] } }));
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual([
      "huddle_stories",
      "insert",
      { label: "November huddle", held_on: "2026-11-10", pathways: 5, intersections: 0, streetlights: 1 },
    ]);
  });

  it("POST and PUT refuse a bad entry before any write", async () => {
    expect((await POST(adminRequest(PATH, { method: "POST", body: { ...BODY, pathways: -1 } }))).status).toBe(400);
    expect((await PUT(adminRequest(`${PATH}?id=${ID}`, { method: "PUT", body: { ...BODY, heldOn: "soon" } }))).status).toBe(400);
    expect((await PUT(adminRequest(`${PATH}?id=nope`, { method: "PUT", body: BODY }))).status).toBe(400);
    expect(tableCalls()).toEqual([]);
  });

  it("PUT and DELETE act on that one entry", async () => {
    expect((await PUT(adminRequest(`${PATH}?id=${ID}`, { method: "PUT", body: BODY }))).status).toBe(200);
    expect((await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE" }))).status).toBe(200);
    expect(fake.calls.filter((c) => c[1] === "eq")).toEqual([
      ["huddle_stories", "eq", "id", ID],
      ["huddle_stories", "eq", "id", ID],
    ]);
  });
});
