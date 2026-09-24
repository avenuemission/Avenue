import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Database and the leader session are replaced, so these tests touch no
// network and no database.
const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/requireAdmin", () => ({ requireAdmin: h.requireAdmin }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET } from "./route";

const row = (id: string, sentOutBy: string | null, email: string | null = `${id}@example.invalid`) => ({
  id,
  email,
  first_name: id,
  last_name: null,
  sent_out_by: sentOutBy,
  link_status: "confirmed",
  joined: true,
  apprentice_step: 0,
});

// root -> sender -> viewer -> child; sibling shares the sender; stranger alone.
const ROWS = [
  row("root", null),
  row("sender", "root"),
  row("viewer", "sender"),
  row("sibling", "sender"),
  row("child", "viewer", null),
  row("stranger", null),
];

function setup(fullAccess: boolean) {
  h.requireLeader.mockResolvedValue({ leader: { email: "viewer@example.invalid", name: "Viewer", fullAccess } });
  const fake = fakeSupabase({
    "leaders.select.single": { data: { name: "Viewer" } },
    "network_people.select.single": { data: ROWS[2] },
    "network_people.select": { data: ROWS },
    "leader_profiles.select": { data: [{ email: "sender@example.invalid", avatar_url: "data:image/png;base64,AA" }] },
  });
  h.getSupabaseAdmin.mockReturnValue(fake.db);
  return fake;
}

async function get() {
  const res = await GET(new NextRequest("http://localhost/api/network", { headers: { authorization: "Bearer t" } }));
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/network", () => {
  it("gives an approved leader everyone, with no emails", async () => {
    setup(true);
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body.viewerId).toBe("viewer");
    expect(body.people.map((p: { id: string }) => p.id)).toEqual(ROWS.map((r) => r.id));
    for (const p of body.people) expect(p).not.toHaveProperty("email");
  });

  it("gives a pending leader only themselves, their sender and their descendants", async () => {
    setup(false);
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body.people.map((p: { id: string }) => p.id)).toEqual(["sender", "viewer", "child"]);
    for (const p of body.people) expect(p).not.toHaveProperty("email");
  });

  it("keeps the sender's first name and avatar for the pending-sender banner", async () => {
    setup(false);
    const { body } = await get();
    const sender = body.people.find((p: { id: string }) => p.id === "sender");
    expect(sender.firstName).toBe("sender");
    expect(sender.avatarUrl).toBe("data:image/png;base64,AA");
  });

  it("counts depth from the viewer the same way for both", async () => {
    setup(false);
    expect((await get()).body.depth).toEqual({ generations: 1, people: 1 });
    setup(true);
    expect((await get()).body.depth).toEqual({ generations: 1, people: 1 });
  });

  it("passes the session check's refusal straight through", async () => {
    h.requireLeader.mockResolvedValue({ response: new Response(JSON.stringify({ error: "no" }), { status: 401 }) });
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase().db);
    expect((await get()).status).toBe(401);
  });
});
