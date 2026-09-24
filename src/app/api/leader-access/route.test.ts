import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Database, mailer, rate limits and the leader session are all replaced, so
// these tests touch no network and no database.
const h = vi.hoisted(() => ({
  requireLeader: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  sendLeaderSignupNotification: vi.fn(),
  allow: vi.fn(),
}));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));
vi.mock("@/lib/emails/public/admin", () => ({ sendLeaderSignupNotification: h.sendLeaderSignupNotification }));
vi.mock("@/lib/server/rateLimit", () => ({
  allow: h.allow,
  RATE: { signup: { name: "signup", windowSeconds: 3600, max: 5 } },
}));

import { POST } from "./route";

const IP = "203.0.113.9";
const SAME = { ok: true, message: "Thanks. We will be in touch once your access is approved." };

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/leader-access", {
      method: "POST",
      headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

let fake: ReturnType<typeof fakeSupabase>;
const leaderInserts = () => fake.calls.filter((c) => c[0] === "leaders" && (c[1] === "insert" || c[1] === "upsert"));

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  fake = fakeSupabase({ "leaders.upsert": { data: [{ id: "new" }] } });
  h.getSupabaseAdmin.mockReturnValue(fake.db);
  h.allow.mockResolvedValue(true);
  h.sendLeaderSignupNotification.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/leader-access", () => {
  it("registers a new leader as pending with a server-made id and tells the admin", async () => {
    const res = await post({ id: "attacker-id", email: " Ann@Example.invalid ", name: " Ann Lee " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SAME);

    const [write] = leaderInserts();
    expect(write).toBeDefined();
    const row = write[2] as Record<string, unknown>;
    expect(row.email).toBe("ann@example.invalid");
    expect(row.name).toBe("Ann Lee");
    expect(row.full_access).toBe(false);
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(h.sendLeaderSignupNotification).toHaveBeenCalledWith("Ann Lee", "ann@example.invalid");
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "signup" }), IP);
  });

  it("gives an existing email the same answer and writes nothing", async () => {
    fake = fakeSupabase({ "leaders.select": { data: { id: "x", email: "ann@example.invalid", full_access: true } } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ email: "ann@example.invalid", name: "Ann" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SAME);
    expect(leaderInserts()).toEqual([]);
    expect(fake.tables()).not.toContain("network_people");
    expect(h.sendLeaderSignupNotification).not.toHaveBeenCalled();
  });

  it("does not tell the admin twice when a racing sign-up already inserted the row", async () => {
    fake = fakeSupabase({ "leaders.upsert": { data: [] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ email: "ann@example.invalid", name: "Ann" });
    expect(await res.json()).toEqual(SAME);
    expect(h.sendLeaderSignupNotification).not.toHaveBeenCalled();
    expect(fake.tables()).not.toContain("network_people");
  });

  it("answers a filled honeypot as if it worked and does nothing", async () => {
    const res = await post({ email: "bot@example.invalid", name: "Bot", company: "Acme" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SAME);
    expect(fake.calls).toEqual([]);
    expect(h.sendLeaderSignupNotification).not.toHaveBeenCalled();
  });

  it("answers 429 once the rate limit is spent, before touching leaders", async () => {
    h.allow.mockResolvedValue(false);
    const res = await post({ email: "ann@example.invalid", name: "Ann" });
    expect(res.status).toBe(429);
    expect(fake.tables()).not.toContain("leaders");
    expect(h.sendLeaderSignupNotification).not.toHaveBeenCalled();
  });

  it.each([
    ["no email", { name: "Ann" }],
    ["a bad email", { email: "not-an-email", name: "Ann" }],
    ["two emails", { email: "a@x.invalid, b@y.invalid", name: "Ann" }],
    ["an over-long email", { email: `${"a".repeat(250)}@x.io`, name: "Ann" }],
    ["no name", { email: "ann@example.invalid", name: "   " }],
    ["a name over 100 characters", { email: "ann@example.invalid", name: "A".repeat(101) }],
    ["a non-string name", { email: "ann@example.invalid", name: 42 }],
  ])("answers 400 for %s and writes nothing", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(leaderInserts()).toEqual([]);
  });

  it("answers 400 for a body that is not JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("still succeeds when the admin email fails, and logs it", async () => {
    h.sendLeaderSignupNotification.mockRejectedValue(new Error("smtp down"));
    const res = await post({ email: "ann@example.invalid", name: "Ann" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SAME);
    expect(console.error).toHaveBeenCalled();
  });

  it("answers a generic 500 when the leader lookup fails", async () => {
    fake = fakeSupabase({ "leaders.select": { error: { message: "relation leaders secret detail" } } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post({ email: "ann@example.invalid", name: "Ann" });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  it("answers a generic 500 when the rate limiter is down", async () => {
    h.allow.mockRejectedValue(new Error("rpc down"));
    const res = await post({ email: "ann@example.invalid", name: "Ann" });
    expect(res.status).toBe(500);
  });
});
