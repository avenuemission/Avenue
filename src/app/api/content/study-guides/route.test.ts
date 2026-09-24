import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";
import { STUDY_GUIDE_COLUMNS } from "@/lib/domain/studyGuides";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET } from "./route";

const url = "http://localhost/api/content/study-guides";

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: true } });
  h.getSupabaseAdmin.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/content/study-guides", () => {
  it("is for signed-in leaders only and reads nothing otherwise", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await GET(new NextRequest(url))).status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("reads the guides with the service role, in sort order", async () => {
    const fake = fakeSupabase({ study_guides: { data: [{ id: "g1", guide_on: "2026-10-07" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await GET(new NextRequest(url));
    expect(await res.json()).toEqual({ guides: [{ id: "g1", guide_on: "2026-10-07" }] });
    expect(fake.calls).toEqual([
      ["study_guides", "from"],
      ["study_guides", "select", STUDY_GUIDE_COLUMNS],
      ["study_guides", "order", "sort_order", { ascending: true }],
    ]);
  });

  it("is a 500 without the database message on a read error", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ study_guides: { error: { message: "relation secret" } } }).db);
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
