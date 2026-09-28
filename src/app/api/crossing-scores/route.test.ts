import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Database and rate limits are replaced, so these tests touch no network
// and no database.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), allow: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));
vi.mock("@/lib/server/rateLimit", () => ({
  allow: h.allow,
  RATE: { crossingScore: { name: "crossing", windowSeconds: 600, max: 60 } },
}));

import { GET, POST } from "./route";

const IP = "203.0.113.9";
const TOP = [
  { initials: "JEM", score: 40, created_at: "2026-09-28T01:00:00Z" },
  { initials: "HMC", score: 31, created_at: "2026-09-28T02:00:00Z" },
];
const good = { initials: "abc", score: 12, durationMs: 20_000 };

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/crossing-scores", {
      method: "POST",
      headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  fake = fakeSupabase({ "crossing_scores.select": { data: TOP }, "crossing_scores.insert": { data: null } });
  h.getSupabaseAdmin.mockReturnValue(fake.db);
  h.allow.mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/crossing-scores", () => {
  it("reads the top 10, highest first and earliest first on a tie, without ids", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ top: TOP });
    expect(fake.calls.filter((c) => c[1] !== "from")).toEqual([
      ["crossing_scores", "select", "initials, score, created_at"],
      ["crossing_scores", "order", "score", { ascending: false }],
      ["crossing_scores", "order", "created_at", { ascending: true }],
      ["crossing_scores", "limit", 10],
    ]);
  });

  it("fails loud with a generic 500 when the read fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "crossing_scores.select": { error: { message: "relation missing" } } }).db);
    const res = await GET();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("relation");
  });
});

describe("POST /api/crossing-scores", () => {
  it("saves a good score with normalised initials and answers with the new board", async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, top: TOP });
    expect(fake.calls).toContainEqual(["crossing_scores", "insert", { initials: "ABC", score: 12, duration_ms: 20_000 }]);
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "crossing" }), IP);
  });

  it("answers 400 with the reason, before the rate limit or any write", async () => {
    for (const [body, message] of [
      [{ ...good, initials: "kkk" }, "Please choose different initials"],
      [{ ...good, initials: "a1" }, "Initials must be three letters"],
      [{ ...good, score: 500, durationMs: 2000 }, "That score doesn't look right"],
      ["{not json", "Invalid score"],
    ] as const) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(message);
    }
    expect(h.allow).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
  });

  it("429 when the caller is over the limit, before saving", async () => {
    h.allow.mockResolvedValueOnce(false);
    expect((await post(good)).status).toBe(429);
    expect(fake.calls).toEqual([]);
  });

  it("fails loud with a 500 when the limiter or the insert fails", async () => {
    h.allow.mockRejectedValueOnce(new Error("rate_limit_hit: down"));
    expect((await post(good)).status).toBe(500);
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "crossing_scores.insert": { error: { message: "check violation" } } }).db);
    expect((await post(good)).status).toBe(500);
  });
});
