import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";
import { adminRequest, stubAdminEnv } from "@/test/adminRoute";

const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));

import { DELETE, GET, POST, PUT } from "./route";

const PATH = "/api/admin/content/intersection-events";
const ID = "0b8f7a52-2c1e-4d3a-9a57-6c7f0e1d2b3c";
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase({
    "intersection_events.update": { data: [{ key: "prayerAndPraise", title: "P" }] },
    "intersection_event_dates.insert": { data: [{ id: ID }] },
  });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  h.revalidatePath.mockReset();
  stubAdminEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin intersection event writes", () => {
  it("are 401 without the admin key", async () => {
    expect((await PUT(adminRequest(PATH, { method: "PUT", body: { key: "k" }, key: null }))).status).toBe(401);
    expect((await POST(adminRequest(PATH, { method: "POST", body: {}, key: null }))).status).toBe(401);
    expect((await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE", key: null }))).status).toBe(401);
    expect(fake.tables()).toEqual([]);
  });

  it("PUT updates only title, description, location and time, then refreshes /intersection", async () => {
    const body = { key: "prayerAndPraise", title: "P", location: "Hall", sort_order: 99, created_at: "x" };
    const res = await PUT(adminRequest(PATH, { method: "PUT", body }));
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual(["intersection_events", "update", { title: "P", location: "Hall" }]);
    expect(fake.calls).toContainEqual(["intersection_events", "eq", "key", "prayerAndPraise"]);
    expect(h.revalidatePath).toHaveBeenCalledWith("/intersection");
  });

  it("POST adds a date with the default time, and refuses a bad date", async () => {
    const ok = await POST(adminRequest(PATH, { method: "POST", body: { event_key: "k", event_date: "2026-10-07" } }));
    expect(ok.status).toBe(200);
    expect(fake.calls).toContainEqual([
      "intersection_event_dates",
      "insert",
      { event_key: "k", event_date: "2026-10-07", event_time: "19:00" },
    ]);
    const bad = await POST(adminRequest(PATH, { method: "POST", body: { event_key: "k", event_date: "soon" } }));
    expect(bad.status).toBe(400);
  });

  it("DELETE needs a uuid id", async () => {
    expect((await DELETE(adminRequest(`${PATH}?id=1`, { method: "DELETE" }))).status).toBe(400);
    expect((await DELETE(adminRequest(`${PATH}?id=${ID}`, { method: "DELETE" }))).status).toBe(200);
    expect(fake.calls).toContainEqual(["intersection_event_dates", "eq", "id", ID]);
  });
});

describe("GET /api/admin/content/intersection-events", () => {
  it("is 401 without the admin key and reads nothing", async () => {
    const res = await GET(adminRequest(PATH, { key: null }));
    expect(res.status).toBe(401);
    expect(fake.tables()).toEqual([]);
  });

  it("reads the events and their dates", async () => {
    const events = [{ key: "prayerAndPraise", title: "P" }];
    const dates = [{ id: ID, event_key: "prayerAndPraise", event_date: "2026-10-07", event_time: "19:00" }];
    fake = fakeSupabase({ intersection_events: { data: events }, intersection_event_dates: { data: dates } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await GET(adminRequest(PATH));
    expect(await res.json()).toEqual({ events, dates });
  });

  it("is a 500 when either read fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ intersection_event_dates: { error: { message: "boom" } } }).db);
    expect((await GET(adminRequest(PATH))).status).toBe(500);
  });
});
