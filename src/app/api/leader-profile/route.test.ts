import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";
import { PROFILE_COLUMNS } from "@/lib/domain/leaderProfile";

// requireLeader and the database are replaced, so these tests run with no
// Supabase and no session.
const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET, PUT } from "./route";

const SESSION_EMAIL = "profile-a@example.invalid";
const url = "http://localhost/api/leader-profile";
const put = (body: unknown) => PUT(new NextRequest(url, { method: "PUT", body: JSON.stringify(body) }));

beforeEach(() => {
  h.requireLeader.mockReset();
  h.getSupabaseAdmin.mockReset();
  h.requireLeader.mockResolvedValue({ leader: { email: SESSION_EMAIL, name: "Profile A", fullAccess: true } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/leader-profile", () => {
  it("passes requireLeader's 401 straight back", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await GET(new NextRequest(url))).status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("reads the caller's row with the linked group and returns its id and name", async () => {
    const row = { display_name: "Ann", role: "Leader", pathway_group_id: 2, pathway_groups: { name: "North Side" } };
    const fake = fakeSupabase({ leader_profiles: { data: row } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      profile: { display_name: "Ann", role: "Leader", pathwayGroupId: 2, pathwayGroupName: "North Side" },
    });
    expect(fake.calls).toEqual([
      ["leader_profiles", "from"],
      ["leader_profiles", "select", PROFILE_COLUMNS],
      ["leader_profiles", "eq", "email", SESSION_EMAIL],
      ["leader_profiles", "maybeSingle"],
    ]);
  });

  it("is a null profile when the leader has none yet", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ leader_profiles: { data: null } }).db);
    expect(await (await GET(new NextRequest(url))).json()).toEqual({ profile: null });
  });
});

describe("PUT /api/leader-profile", () => {
  it("writes pathwayGroupId to pathway_group_id, never the legacy text column, and answers with the group name", async () => {
    const saved = { display_name: "Ann", pathway_group_id: 2, pathway_groups: { name: "North Side" } };
    const fake = fakeSupabase({ "leader_profiles.upsert": { data: saved } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await put({
      display_name: " Ann ",
      pathwayGroupId: "2",
      pathwayGroupName: "ignored",
      pathway_group: "ignored",
      email: "someone-else@example.invalid",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: { display_name: "Ann", pathwayGroupId: 2, pathwayGroupName: "North Side" } });
    const upsert = fake.calls.find((c) => c[1] === "upsert");
    const row = upsert?.[2] as Record<string, unknown>;
    expect(row).toMatchObject({ email: SESSION_EMAIL, display_name: "Ann", pathway_group_id: 2 });
    expect(row).not.toHaveProperty("pathway_group");
    expect(row).not.toHaveProperty("pathwayGroupName");
    expect(fake.calls).toContainEqual(["leader_profiles", "select", PROFILE_COLUMNS]);
  });

  it("clears the group with null and leaves it alone when the key is absent", async () => {
    const fake = fakeSupabase({ "leader_profiles.upsert": { data: { pathway_group_id: null, pathway_groups: null } } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    await put({ pathwayGroupId: null });
    await put({ about: "hi" });
    const rows = fake.calls.filter((c) => c[1] === "upsert").map((c) => c[2] as Record<string, unknown>);
    expect(rows[0].pathway_group_id).toBeNull();
    expect(rows[1]).not.toHaveProperty("pathway_group_id");
  });

  it("is 400 for a group id that is not a number, before touching the table", async () => {
    const res = await put({ pathwayGroupId: "North Side" });
    expect(res.status).toBe(400);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for a group that does not exist", async () => {
    const message =
      'insert or update on table "leader_profiles" violates foreign key constraint "leader_profiles_pathway_group_id_fkey"';
    const fake = fakeSupabase({ "leader_profiles.upsert": { error: { message, code: "23503" } } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await put({ pathwayGroupId: 999 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That pathway group no longer exists.");
  });
  it("is 400 for an external avatar link, even https, before touching the table", async () => {
    const res = await put({ avatar_url: "https://tracker.example/pixel.png" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Photo must be an uploaded png, jpeg or webp image.");
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("saves an uploaded jpeg avatar and clears it with an empty string", async () => {
    const fake = fakeSupabase({ "leader_profiles.upsert": { data: {} } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const jpeg = "data:image/jpeg;base64,/9j/4AAQ";
    expect((await put({ avatar_url: jpeg })).status).toBe(200);
    expect((await put({ avatar_url: "" })).status).toBe(200);
    const rows = fake.calls.filter((c) => c[1] === "upsert").map((c) => c[2] as Record<string, unknown>);
    expect(rows[0].avatar_url).toBe(jpeg);
    expect(rows[1].avatar_url).toBeNull();
  });

  it("keeps the 413 for a photo that is too large", async () => {
    const res = await put({ avatar_url: "data:image/jpeg;base64," + "A".repeat(400_000) });
    expect(res.status).toBe(413);
  });

  it("is 400 for a role or APEST gift outside the lists, before touching the table", async () => {
    const role = await put({ role: "Admin" });
    expect(role.status).toBe(400);
    expect((await role.json()).error).toBe("role must be one of Leader, Apprentice, Coordinator, Member");
    const apest = await put({ apest: "Pastor" });
    expect(apest.status).toBe(400);
    expect((await apest.json()).error).toBe("apest must be one of Apostle, Prophet, Evangelist, Shepherd, Teacher");
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("accepts a listed role and gift, and clears them with an empty string", async () => {
    const fake = fakeSupabase({ "leader_profiles.upsert": { data: {} } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    expect((await put({ role: "Coordinator", apest: "Teacher" })).status).toBe(200);
    expect((await put({ role: "", apest: "" })).status).toBe(200);
    const rows = fake.calls.filter((c) => c[1] === "upsert").map((c) => c[2] as Record<string, unknown>);
    expect(rows[0]).toMatchObject({ role: "Coordinator", apest: "Teacher" });
    expect(rows[1]).toMatchObject({ role: null, apest: null });
  });
});
