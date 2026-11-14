import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET } from "./route";

const get = () => GET(new NextRequest("http://localhost/api/huddle-stories"));

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-14T02:00:00Z"));
  h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
  h.getSupabaseAdmin.mockReturnValue(
    fakeSupabase({
      "huddle_stories.select": {
        data: [
          { id: "1", label: "Jan–Aug huddles", held_on: "2026-08-31", pathways: 11, intersections: 5, streetlights: 3 },
          { id: "2", label: "November huddle", held_on: "2026-11-10", pathways: 5, intersections: 0, streetlights: 1 },
        ],
      },
    }).db
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/huddle-stories", () => {
  it("gives any leader this year's totals and the latest huddle", async () => {
    const res = await get();
    expect(await res.json()).toEqual({
      year: 2026,
      totals: { pathways: 16, intersections: 5, streetlights: 4 },
      latest: { label: "November huddle", heldOn: "2026-11-10", added: 6 },
    });
    vi.useRealTimers();
  });

  it("answers with requireLeader's refusal and reads nothing", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await get()).status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
