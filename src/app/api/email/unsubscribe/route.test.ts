import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// No session is involved: the token is the only key. Only the database is
// replaced.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET, POST } from "./route";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const at = (query: string) => `http://localhost/api/email/unsubscribe${query}`;
const get = (query: string) => GET(new NextRequest(at(query)));
// A mail client's RFC 8058 one-click POST carries this body; it is ignored.
const post = (query: string) =>
  POST(
    new NextRequest(at(query), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click&email=someone-else%40example.invalid&rpms=true",
    })
  );

beforeEach(() => {
  h.getSupabaseAdmin.mockReset();
  vi.stubEnv("AVENUE_SITE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const updatePayload = (calls: unknown[][]) => calls.find((c) => c[1] === "update")?.[2];

describe("GET /api/email/unsubscribe", () => {
  it("shows a one-button confirm page and writes nothing", async () => {
    const res = await get(`?token=${TOKEN}&kind=digest`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('<form method="post"');
    expect(html).toContain(`/api/email/unsubscribe?token=${TOKEN}&amp;kind=digest`);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for markup in the kind or token, and never reflects it", async () => {
    for (const query of [
      `?token=${TOKEN}&kind=${encodeURIComponent("<script>alert(1)</script>")}`,
      `?token=${encodeURIComponent('"><script>alert(1)</script>')}&kind=digest`,
    ]) {
      for (const res of [await get(query), await post(query)]) {
        expect(res.status).toBe(400);
        const html = await res.text();
        expect(html).not.toContain("<script");
        expect(html).not.toContain("alert(1)");
      }
    }
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for a token that is not a UUID, and writes nothing", async () => {
    const res = await get("?token=abc&kind=digest");
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("not valid");
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe("POST /api/email/unsubscribe", () => {
  it("turns only that kind off, on the row with that token, ignoring the body", async () => {
    const fake = fakeSupabase({ "leader_email_prefs.update": { data: [{ email: "a@example.invalid" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post(`?token=${TOKEN}&kind=digest`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
    expect(updatePayload(fake.calls)).toEqual({ digest: false, updated_at: expect.any(String) });
    expect(fake.calls).toContainEqual(["leader_email_prefs", "eq", "unsubscribe_token", TOKEN]);
    expect(fake.tables()).toEqual(["leader_email_prefs"]);
  });

  it("turns every kind off for kind=all, and nothing on", async () => {
    const fake = fakeSupabase({ "leader_email_prefs.update": { data: [{ email: "a@example.invalid" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    await post(`?token=${TOKEN}&kind=all`);
    expect(updatePayload(fake.calls)).toEqual({
      rpms: false,
      digest: false,
      church_health: false,
      apprentice: false,
      milestones: false,
      updated_at: expect.any(String),
    });
  });

  it("gives an unknown token the same page and status as a known one, so tokens cannot be probed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leader_email_prefs.update": { data: [] } }).db);
    const unknown = await post(`?token=${TOKEN}&kind=rpms`);
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({ "leader_email_prefs.update": { data: [{ email: "a@example.invalid" }] } }).db
    );
    const known = await post(`?token=${TOKEN}&kind=rpms`);
    expect(unknown.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(await unknown.text()).toBe(await known.text());
    expect(warn).toHaveBeenCalledWith("unsubscribe: token matched no row");
  });

  it("never shows the leader's email on the success page", async () => {
    const email = "private-leader@example.invalid";
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leader_email_prefs.update": { data: [{ email }] } }).db);
    const res = await post(`?token=${TOKEN}&kind=digest`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("unsubscribed");
    expect(html).toContain(">AVENUE<");
    expect(html).not.toContain(email);
    expect(html).not.toContain("private-leader");
  });

  it("is idempotent: posting twice is 200 both times with the same update", async () => {
    const fake = fakeSupabase({ "leader_email_prefs.update": { data: [{ email: "a@example.invalid" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const first = await post(`?token=${TOKEN}&kind=milestones`);
    const second = await post(`?token=${TOKEN}&kind=milestones`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const updates = fake.calls.filter((c) => c[1] === "update").map((c) => c[2]);
    expect(updates).toHaveLength(2);
    for (const u of updates) expect(u).toEqual({ milestones: false, updated_at: expect.any(String) });
  });

  it("is 400 for an unknown kind, and writes nothing", async () => {
    const res = await post(`?token=${TOKEN}&kind=everything`);
    expect(res.status).toBe(400);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("fails loud in the log but shows the reader no database detail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({
        "leader_email_prefs.update": {
          error: { message: "Could not find the table 'public.leader_email_prefs' in the schema cache" },
        },
      }).db
    );
    const res = await post(`?token=${TOKEN}&kind=rpms`);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("schema cache");
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0].join(" "))).toContain("Leader email tables are missing");
  });
});
