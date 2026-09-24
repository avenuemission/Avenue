import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Database and the leader session are replaced, so these tests touch no
// network and no database.
const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/requireAdmin", () => ({ requireAdmin: h.requireAdmin }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET, POST } from "./route";

const row = (
  id: string,
  sentOutBy: string | null,
  email: string | null = `${id}@example.invalid`,
  linkStatus: "pending" | "confirmed" = "confirmed",
  joined = true
) => ({
  id,
  email,
  first_name: id,
  last_name: null,
  sent_out_by: sentOutBy,
  link_status: linkStatus,
  joined,
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

  it("pending leader adopts a root; GET still excludes the root's subtree", async () => {
    // What the old adoption left behind: root now points at the viewer
    // with an unconfirmed link, and root's own tree hangs below it.
    const rows = [
      row("sender", null),
      row("viewer", "sender"),
      row("root", "viewer", "root@example.invalid", "pending", true),
      row("rootKid", "root"),
      row("named", "viewer", null, "pending", false),
    ];
    h.requireLeader.mockResolvedValue({ leader: { email: "viewer@example.invalid", name: "Viewer", fullAccess: false } });
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({
        "leaders.select.single": { data: { name: "Viewer" } },
        "network_people.select.single": { data: rows[1] },
        "network_people.select": { data: rows },
      }).db
    );
    const ids = (await get()).body.people.map((p: { id: string }) => p.id);
    expect(ids).toEqual(["sender", "viewer", "named"]);
  });
});

describe("POST /api/network add", () => {
  const ACTOR = row("viewer", null);
  const eqValue = (chain: [string, ...unknown[]][], col: string) =>
    chain.find((c) => c[0] === "eq" && c[1] === col)?.[2];

  // The actor's own node, the person looked up by email, and the sender
  // looked up by id all come from maybeSingle() on network_people.
  function setupAdd(fullAccess: boolean, target: ReturnType<typeof row> | null) {
    h.requireLeader.mockResolvedValue({ leader: { email: "viewer@example.invalid", name: "Viewer", fullAccess } });
    const fake = fakeSupabase({
      "leaders.select.single": { data: { name: "Viewer" } },
      "network_people.select.single": (chain) => {
        if (eqValue(chain, "email") === "viewer@example.invalid") return { data: ACTOR };
        if (eqValue(chain, "email") === "target@example.invalid") return { data: target };
        if (eqValue(chain, "id") === "boss") return { data: { first_name: "Bossy" } };
        return { data: null };
      },
      "network_people.select": { data: [ACTOR, ...(target ? [target] : [])] },
      "network_people.update": { data: null },
      "network_people.insert": { data: null },
    });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    return fake;
  }

  async function add(email: string) {
    const res = await POST(
      new NextRequest("http://localhost/api/network", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ action: "add", firstName: "Tess", email }),
      })
    );
    return { status: res.status, body: await res.json() };
  }

  const updates = (fake: ReturnType<typeof fakeSupabase>) =>
    fake.calls.filter((c) => c[0] === "network_people" && c[1] === "update");

  it("refuses a pending leader adopting an existing unparented person, and writes nothing", async () => {
    const fake = setupAdd(false, row("target", null, "target@example.invalid"));
    const { status, body } = await add("target@example.invalid");
    expect(status).toBe(403);
    expect(body.error).toMatch(/approved/i);
    expect(updates(fake)).toEqual([]);
  });

  it("does not tell a pending leader who already added someone", async () => {
    setupAdd(false, row("target", "boss", "target@example.invalid"));
    const { status, body } = await add("target@example.invalid");
    expect(status).toBe(409);
    expect(body.error).toBe("This person is already in the network.");
  });

  it("still lets an approved leader adopt an existing unparented person", async () => {
    const fake = setupAdd(true, row("target", null, "target@example.invalid"));
    const { status, body } = await add("target@example.invalid");
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true, adopted: true });
    expect(updates(fake)).toHaveLength(1);
  });

  it("still names the sender to an approved leader", async () => {
    setupAdd(true, row("target", "boss", "target@example.invalid"));
    const { status, body } = await add("target@example.invalid");
    expect(status).toBe(409);
    expect(body.error).toBe("Bossy has already added them.");
  });

  it("still lets a pending leader add a brand-new person", async () => {
    const fake = setupAdd(false, null);
    const { status, body } = await add("target@example.invalid");
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true, adopted: false });
    expect(fake.calls.some((c) => c[0] === "network_people" && c[1] === "insert")).toBe(true);
  });
});
