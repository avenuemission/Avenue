import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Database, mailer, rate limits and the leader session are all replaced, so
// these tests touch no network and no database.
const h = vi.hoisted(() => ({
  requireLeader: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  sendEmail: vi.fn(),
  allow: vi.fn(),
}));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));
vi.mock("@/lib/server/mail/transport", () => ({ sendEmail: h.sendEmail, isEmailConfigured: () => true }));
vi.mock("@/lib/server/rateLimit", () => ({
  allow: h.allow,
  RATE: {
    form: { name: "form", windowSeconds: 600, max: 5 },
    formRecipient: { name: "form-to", windowSeconds: 3600, max: 3 },
  },
}));

import { POST } from "./route";

const ADMIN = "henrymcmahon@avenuemission.com";
const IP = "203.0.113.9";

function post(type: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/forms/${type}`, {
    method: "POST",
    headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ type }) });
}

const joinBody = {
  name: "Ann",
  email: "ann@example.invalid",
  company: "",
  data: { phone: "0400", group: "North Side" },
};

let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  fake = fakeSupabase();
  h.getSupabaseAdmin.mockReturnValue(fake.db);
  h.allow.mockResolvedValue(true);
  h.sendEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const recipients = () => h.sendEmail.mock.calls.map((c) => c[0]);
const subjects = () => h.sendEmail.mock.calls.map((c) => c[1]);

describe("POST /api/forms/[type]", () => {
  it("saves the form, notifies the admin and confirms to the one parsed address", async () => {
    const res = await post("join-pathway", joinBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(fake.calls).toContainEqual([
      "form_submissions",
      "insert",
      { form_type: "join-pathway", name: "Ann", email: "ann@example.invalid", data: { phone: "0400", group: "North Side" } },
    ]);
    expect(recipients()).toEqual([ADMIN, "ann@example.invalid"]);
    expect(subjects()).toEqual(["New Form Submission: Join Pathway Group", "Welcome to Avenue - Pathway Group Connection"]);
    // html plus a plain-text alternative
    expect(h.sendEmail.mock.calls[1][3]).toEqual({ text: expect.stringContaining("Welcome, Ann!") });
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "form" }), IP);
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "form-to" }), "ann@example.invalid");
  });

  it("answers 400 with the reason for a bad form and does nothing else", async () => {
    const res = await post("join-pathway", { ...joinBody, email: "a@x.invalid, b@y.invalid" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
    expect(h.allow).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("answers 400 for an unknown form type and for a body that is not JSON", async () => {
    expect((await post("send-anything", joinBody)).status).toBe(400);
    expect((await post("join-pathway", "{not json")).status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("spam: looks like success to the bot, saves and sends nothing", async () => {
    const res = await post("join-pathway", { ...joinBody, company: "Acme Pty Ltd" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(h.allow).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("429 when the caller's IP is over the form limit, before saving or sending", async () => {
    h.allow.mockResolvedValueOnce(false);
    const res = await post("join-pathway", joinBody);
    expect(res.status).toBe(429);
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("recipient over its limit: still saves and tells the admin, skips the visitor email", async () => {
    h.allow.mockImplementation(async (rule: { name: string }) => rule.name !== "form-to");
    const res = await post("join-pathway", joinBody);
    expect(res.status).toBe(200);
    expect(fake.calls.some((c) => c[1] === "insert")).toBe(true);
    expect(recipients()).toEqual([ADMIN]);
  });

  it("fails loud with a 500 when the rate limit check itself fails", async () => {
    h.allow.mockRejectedValue(new Error("rate_limit_hit: connection refused"));
    const res = await post("join-pathway", joinBody);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("connection refused");
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("500 when the insert fails, without leaking the database message or sending", async () => {
    fake = fakeSupabase({ "form_submissions.insert": { error: { message: "violates check constraint form_type" } } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post("join-pathway", joinBody);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("constraint");
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("no visitor email when none was given: admin only", async () => {
    await post("join-pathway", { ...joinBody, email: "" });
    expect(recipients()).toEqual([ADMIN]);
    expect(h.allow).toHaveBeenCalledTimes(1);
  });

  it("mission-support tells the admin only", async () => {
    const res = await post("mission-support", {
      name: "Ann",
      email: "ann@example.invalid",
      company: "",
      data: { supportType: "resources", message: "" },
    });
    expect(res.status).toBe(200);
    expect(recipients()).toEqual([ADMIN]);
    expect(subjects()).toEqual(["New Form Submission: Philippines Mission Trip - Support Interest"]);
  });

  it("escapes what the visitor typed in the emails", async () => {
    await post("join-pathway", { ...joinBody, name: `<img src=x onerror="alert(1)">` });
    for (const call of h.sendEmail.mock.calls) {
      expect(call[2]).not.toContain("<img");
      expect(call[2]).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    }
  });
});

describe("POST /api/forms/leader-support", () => {
  const booked = {
    name: "Someone Else",
    email: "victim@example.invalid",
    company: "",
    data: { selectedDate: "2026-10-01T08:00:00.000Z", formattedDate: "Thursday 1 October at 6:00 pm" },
  };

  beforeEach(() => {
    h.requireLeader.mockResolvedValue({ leader: { email: "lee@example.invalid", name: "Lee Leader", fullAccess: true } });
  });

  it("needs a signed-in leader", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const res = await post("leader-support", booked);
    expect(res.status).toBe(401);
    expect(h.allow).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("uses the session's email and name, never the body's", async () => {
    const res = await post("leader-support", booked);
    expect(res.status).toBe(200);
    expect(recipients()).toEqual([ADMIN, "lee@example.invalid"]);
    expect(recipients()).not.toContain("victim@example.invalid");
    expect(subjects()).toEqual(["New Form Submission: Leader Support Call Booking", "Leader Support Call Confirmed - Avenue"]);
    expect(h.sendEmail.mock.calls[1][2]).toContain("Hi Lee Leader,");
    expect(fake.calls).toContainEqual([
      "form_submissions",
      "insert",
      { form_type: "leader-support", name: "Lee Leader", email: "lee@example.invalid", data: booked.data },
    ]);
  });

  it("sends the server's Zoom link, whatever the body says", async () => {
    const res = await post("leader-support", { ...booked, data: { ...booked.data, zoomLink: "https://evil.invalid" } });
    expect(res.status).toBe(400);
    await post("leader-support", booked);
    expect(h.sendEmail.mock.calls[1][2]).toContain("monash.zoom.us");
  });

  it("custom time request", async () => {
    await post("leader-support", {
      name: "Lee",
      company: "",
      data: { requestedDate: "2026-10-03", requestedTime: "10:30", custom: "true" },
    });
    expect(subjects()).toEqual([
      "New Form Submission: Leader Support - Custom Time Request",
      "Custom Time Request Received - Avenue Leader Support",
    ]);
    expect(recipients()).toEqual([ADMIN, "lee@example.invalid"]);
  });
});

describe("POST /api/forms/leader-support with no name on the session", () => {
  it("still books, naming the leader from the session email", async () => {
    h.requireLeader.mockResolvedValue({ leader: { email: "nameless@example.invalid", name: "", fullAccess: false } });
    const res = await post("leader-support", {
      name: "",
      data: { selectedDate: "2026-10-01T08:00:00.000Z", formattedDate: "Thursday 1 October at 6:00 pm" },
    });
    expect(res.status).toBe(200);
    expect(fake.calls).toContainEqual([
      "form_submissions",
      "insert",
      expect.objectContaining({ name: "nameless", email: "nameless@example.invalid" }),
    ]);
  });
});
