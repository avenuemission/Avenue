import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { DELETE } from "./route";

let fake: ReturnType<typeof fakeSupabase>;

function del(url: string) {
  return DELETE(new NextRequest(`http://localhost${url}`, { method: "DELETE" }));
}

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: true } });
  fake = fakeSupabase({ "survey_responses.delete": { data: [{ id: "1" }] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("DELETE /api/workshops/clear", () => {
  it("passes requireLeader's response straight back and touches no database", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const res = await del("/api/workshops/clear?code=ABCD");
    expect(res.status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it("403 without full access", async () => {
    h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
    const res = await del("/api/workshops/clear?code=ABCD");
    expect(res.status).toBe(403);
    expect(fake.calls).toEqual([]);
  });

  it("400 without a code", async () => {
    const res = await del("/api/workshops/clear");
    expect(res.status).toBe(400);
  });

  it("deletes via the service-role admin client, which can bypass RLS (the anon key could not)", async () => {
    const res = await del("/api/workshops/clear?code=abcd");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(fake.calls).toContainEqual(["survey_responses", "eq", "session_code", "ABCD"]);
    expect(fake.calls.some((c) => c[1] === "delete")).toBe(true);
  });

  it("500 when the delete fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "survey_responses.delete": { error: { message: "down" } } }).db);
    const res = await del("/api/workshops/clear?code=ABCD");
    expect(res.status).toBe(500);
  });
});
