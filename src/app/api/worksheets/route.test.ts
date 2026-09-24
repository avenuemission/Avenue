import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The route's two server dependencies are replaced, so these tests run with
// no Supabase and no session. requireLeader's own checks are covered by
// leaderAuth.test.ts and scripts/check-auth.mjs.
const h = vi.hoisted(() => ({
  requireLeader: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { DELETE } from "./route";

const SESSION_EMAIL = "reset-a@example.invalid";

// A stand-in for the Supabase query builder: records every call, and the
// awaited delete resolves with `result`.
function fakeDb(result: { error: { message: string } | null }) {
  const calls: string[][] = [];
  const chain = {
    eq(column: string, value: string) {
      calls.push(["eq", column, value]);
      return chain;
    },
    then(onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  const db = {
    from(table: string) {
      calls.push(["from", table]);
      return {
        delete() {
          calls.push(["delete"]);
          return chain;
        },
      };
    },
  };
  return { db, calls };
}

const del = (query: string) =>
  DELETE(new NextRequest(`http://localhost/api/worksheets${query}`, { method: "DELETE" }));

beforeEach(() => {
  h.requireLeader.mockReset();
  h.getSupabaseAdmin.mockReset();
  h.requireLeader.mockResolvedValue({ leader: { email: SESSION_EMAIL, name: "Reset A", fullAccess: false } });
});

describe("DELETE /api/worksheets (reset)", () => {
  it("passes requireLeader's 401 straight back and touches no table", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) });
    const res = await del("?kind=calling");
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 without a kind and touches no table", async () => {
    const res = await del("");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "kind must be calling or launch" });
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for a kind that is not calling or launch", async () => {
    const res = await del("?kind=profile");
    expect(res.status).toBe(400);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("deletes only the signed-in leader's row of that kind, ignoring an email in the query", async () => {
    const fake = fakeDb({ error: null });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await del(`?kind=launch&email=${encodeURIComponent("someone-else@example.invalid")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fake.calls).toEqual([
      ["from", "leader_worksheets"],
      ["delete"],
      ["eq", "email", SESSION_EMAIL],
      ["eq", "kind", "launch"],
    ]);
  });

  it("checks the session before it opens the database", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeDb({ error: null }).db);
    await del("?kind=calling");
    expect(h.requireLeader.mock.invocationCallOrder[0]).toBeLessThan(h.getSupabaseAdmin.mock.invocationCallOrder[0]);
  });

  it("fails loud but never leaks the database message to the caller", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeDb({ error: { message: "permission denied" } }).db);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await del("?kind=calling");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong. Please try again." });
    spy.mockRestore();
  });
});
