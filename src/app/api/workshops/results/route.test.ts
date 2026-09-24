import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { GET } from "./route";

let fake: ReturnType<typeof fakeSupabase>;

function get(url: string) {
  return GET(new NextRequest(`http://localhost${url}`));
}

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: true } });
  fake = fakeSupabase({ "survey_responses.select": { data: [{ id: "1", session_code: "ABCD" }] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/workshops/results", () => {
  it("passes requireLeader's response straight back", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const res = await get("/api/workshops/results?code=ABCD");
    expect(res.status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it("403 without full access", async () => {
    h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
    expect((await get("/api/workshops/results?code=ABCD")).status).toBe(403);
  });

  it("reads via the admin client, filtered by code", async () => {
    const res = await get("/api/workshops/results?code=abcd");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "1", session_code: "ABCD" }]);
    expect(fake.calls).toContainEqual(["survey_responses", "eq", "session_code", "ABCD"]);
  });

  it("ALL reads every response, unfiltered", async () => {
    const res = await get("/api/workshops/results?code=ALL");
    expect(res.status).toBe(200);
    expect(fake.calls.some((c) => c[1] === "eq")).toBe(false);
  });

  it("500 on a database error", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "survey_responses.select": { error: { message: "down" } } }).db);
    expect((await get("/api/workshops/results?code=ALL")).status).toBe(500);
  });
});
