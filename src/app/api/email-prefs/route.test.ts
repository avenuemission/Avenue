import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";
import { DEFAULT_PREFS, MISSING_TABLES_MESSAGE, PREFS_COLUMNS } from "@/lib/emails/prefs";

// The route's two server dependencies are replaced, so these tests run with
// no Supabase and no session. requireLeader's own checks are covered by
// leaderAuth.test.ts and scripts/check-auth.mjs.
const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET, PATCH } from "./route";

const SESSION_EMAIL = "prefs-a@example.invalid";
const url = "http://localhost/api/email-prefs";
const get = () => GET(new NextRequest(url));
const patch = (body: unknown, query = "") =>
  PATCH(new NextRequest(`${url}${query}`, { method: "PATCH", body: JSON.stringify(body) }));

beforeEach(() => {
  h.requireLeader.mockReset();
  h.getSupabaseAdmin.mockReset();
  h.requireLeader.mockResolvedValue({ leader: { email: SESSION_EMAIL, name: "Prefs A", fullAccess: true } });
});

describe("GET /api/email-prefs", () => {
  it("passes requireLeader's 401 straight back and touches no table", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const res = await get();
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is all on when the leader has no row, reading only their own row", async () => {
    const fake = fakeSupabase({ leader_email_prefs: { data: null } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ prefs: DEFAULT_PREFS });
    expect(fake.calls).toEqual([
      ["leader_email_prefs", "from"],
      ["leader_email_prefs", "select", PREFS_COLUMNS],
      ["leader_email_prefs", "eq", "email", SESSION_EMAIL],
      ["leader_email_prefs", "maybeSingle"],
    ]);
  });

  it("returns the stored settings", async () => {
    const row = { email: SESSION_EMAIL, rpms: true, digest: false, church_health: true, apprentice: false, milestones: true, unsubscribe_token: "t" };
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ leader_email_prefs: { data: row } }).db);
    expect(await (await get()).json()).toEqual({ prefs: { ...DEFAULT_PREFS, digest: false, apprentice: false } });
  });

  it("fails loud with the migration hint while the table is missing", async () => {
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({
        leader_email_prefs: { error: { message: "Could not find the table 'public.leader_email_prefs' in the schema cache" } },
      }).db
    );
    const res = await get();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain(MISSING_TABLES_MESSAGE);
  });
});

describe("PATCH /api/email-prefs", () => {
  it("passes requireLeader's 401 straight back, before reading the body or any table", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const res = await patch({ rpms: false });
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for a body that is not a set of known true or false settings, and touches no table", async () => {
    for (const body of [null, {}, { digest: "no" }, { email: "someone-else@example.invalid", digest: false }]) {
      const res = await patch(body);
      expect(res.status).toBe(400);
    }
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("saves the signed-in leader's settings only, ignoring an email in the query", async () => {
    const saved = { email: SESSION_EMAIL, rpms: false, digest: true, church_health: true, apprentice: true, milestones: true, unsubscribe_token: "t" };
    const fake = fakeSupabase({ "leader_email_prefs.upsert": { data: saved } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await patch({ rpms: false }, `?email=${encodeURIComponent("someone-else@example.invalid")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ prefs: { ...DEFAULT_PREFS, rpms: false } });
    const upsert = fake.calls.find((c) => c[1] === "upsert");
    expect(upsert?.[2]).toEqual({ rpms: false, email: SESSION_EMAIL, updated_at: expect.any(String) });
    expect(upsert?.[3]).toEqual({ onConflict: "email" });
  });

  it("fails loud with the database message", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leader_email_prefs.upsert": { error: { message: "permission denied" } } }).db);
    const res = await patch({ rpms: false });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "permission denied" });
  });
});
