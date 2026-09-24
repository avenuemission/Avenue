import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { GET, POST } from "./route";

const url = "http://localhost/api/workshops/sessions";
let fake: ReturnType<typeof fakeSupabase>;

function post(body: unknown) {
  return POST(new NextRequest(url, { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: true } });
  fake = fakeSupabase({
    "workshop_sessions.select": { data: [{ code: "ABCD" }] },
    "workshop_sessions.insert.single": { data: { code: "ABCD" } },
  });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/workshops/sessions", () => {
  it("passes requireLeader's response straight back", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await GET(new NextRequest(url))).status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it("lists via the admin client", async () => {
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ code: "ABCD" }]);
  });
});

describe("POST /api/workshops/sessions", () => {
  it("403 without full access", async () => {
    h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
    expect((await post({ code: "ABCD" })).status).toBe(403);
  });

  it("400 without a code", async () => {
    expect((await post({})).status).toBe(400);
  });

  it("creates a session via the admin client", async () => {
    const res = await post({ code: "abcd" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ code: "ABCD" });
    const row = fake.calls.find((c) => c[1] === "insert")?.[2] as Record<string, unknown>;
    expect(row.code).toBe("ABCD");
  });

  it("409 for a duplicate code", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "workshop_sessions.insert.single": { error: { message: "dup", code: "23505" } } }).db);
    expect((await post({ code: "ABCD" })).status).toBe(409);
  });
});
