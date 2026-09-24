import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET } from "./route";

const url = "http://localhost/api/content/pathway-groups";

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
  h.getSupabaseAdmin.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/content/pathway-groups", () => {
  it("is for signed-in leaders only and reads nothing otherwise", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await GET(new NextRequest(url))).status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("gives the group picker each group's id and name only, in sort order", async () => {
    const fake = fakeSupabase({ pathway_groups: { data: [{ id: 2, name: "Heathmont" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await GET(new NextRequest(url));
    expect(await res.json()).toEqual({ groups: [{ id: 2, name: "Heathmont" }] });
    expect(fake.calls).toEqual([
      ["pathway_groups", "from"],
      ["pathway_groups", "select", "id, name"],
      ["pathway_groups", "order", "sort_order", { ascending: true }],
    ]);
  });

  it("is a 500 on a read error", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ pathway_groups: { error: { message: "boom" } } }).db);
    expect((await GET(new NextRequest(url))).status).toBe(500);
  });
});
