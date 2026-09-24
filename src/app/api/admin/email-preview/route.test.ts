import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Snapshot } from "@/lib/emails/compose";
import { PREVIEW_TOKEN } from "@/lib/emails/prefs";
import { fakeSupabase } from "@/test/fakeSupabase";

// The database and the snapshot loader are replaced; the admin key check is
// the real one.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), loadSnapshot: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));
vi.mock("@/lib/emails/loadSnapshot", () => ({ loadSnapshot: h.loadSnapshot }));

import { GET } from "./route";

const KEY = "test-admin-key";
const ANN = "ann@example.invalid";
const TOKEN = "11111111-1111-4111-8111-111111111111";

// Monday 5 October 2026, 07:00 in Melbourne.
const snapshot: Snapshot = {
  now: new Date("2026-10-04T20:00:00Z"),
  leaders: [{ email: ANN, name: "Ann Lee", full_access: true }],
  prefs: [
    { email: ANN, rpms: true, digest: true, church_health: true, apprentice: true, milestones: true, unsubscribe_token: TOKEN },
  ],
  profiles: [],
  checkins: [],
  people: [],
  network: [],
  training: [],
  worksheets: [],
  guides: [],
  foundationsModuleIds: ["p1m0"],
};

const get = (query: string, key: string | null = KEY) =>
  GET(
    new NextRequest(`http://localhost/api/admin/email-preview${query}`, {
      headers: key ? { authorization: `Bearer ${key}` } : {},
    })
  );

beforeEach(() => {
  // requireAdmin's rate-limit check now calls getSupabaseAdmin().rpc(...)
  // before the key is even checked, so the fake needs a working rpc, not an
  // empty object. fakeSupabase()'s default rpc result (not blocked) is
  // harmless for every test here.
  h.getSupabaseAdmin.mockReset().mockReturnValue(fakeSupabase().db);
  h.loadSnapshot.mockReset().mockResolvedValue(snapshot);
  vi.stubEnv("ADMIN_API_KEY", KEY);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  vi.stubEnv("AVENUE_SITE_URL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/admin/email-preview", () => {
  it("is 401 without the admin key and loads nothing", async () => {
    const res = await get(`?kind=digest&email=${ANN}`, null);
    expect(res.status).toBe(401);
    expect(h.loadSnapshot).not.toHaveBeenCalled();
  });

  it("is 400 for an unknown kind or a missing email", async () => {
    expect((await get(`?kind=weekly&email=${ANN}`)).status).toBe(400);
    expect((await get("?kind=digest")).status).toBe(400);
    expect(h.loadSnapshot).not.toHaveBeenCalled();
  });

  it("is 404 for someone who is not a leader", async () => {
    const res = await get("?kind=digest&email=nobody%40example.invalid");
    expect(res.status).toBe(404);
  });

  it("renders the leader's email as the engine would, with a preview token instead of theirs", async () => {
    const res = await get(`?kind=digest&email=${encodeURIComponent(ANN.toUpperCase())}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subject).toBe("Your week ahead");
    expect(body.periodKey).toBe("2026-10-05");
    expect(body.html).toContain("<!DOCTYPE html>");
    expect(body.html).toContain(`token=${PREVIEW_TOKEN}`);
    expect(body.html + body.text).not.toContain(TOKEN);
    expect(body.text).toContain("Good morning, Ann.");
    expect(body.note).toBeNull();
  });

  it("shows a sample milestone when none is due, and says so", async () => {
    const body = await (await get(`?kind=milestones&email=${ANN}`)).json();
    expect(body.subject).toBe("You walked Foundations");
    expect(body.note).toContain("sample");
  });

  it("says the apprentice email would be skipped for a leader with no apprentices", async () => {
    const body = await (await get(`?kind=apprentice&email=${ANN}`)).json();
    expect(body.html).toBeNull();
    expect(body.note).toContain("no apprentices");
  });
});
