import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Database, mailer and rate limits are replaced, so these tests touch no
// network and no database.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), allow: vi.fn(), sendEmail: vi.fn(), configured: vi.fn() }));
vi.mock("@/lib/server/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));
vi.mock("@/lib/server/mail/transport", () => ({ sendEmail: h.sendEmail, isEmailConfigured: h.configured }));
vi.mock("@/lib/server/rateLimit", () => ({
  allow: h.allow,
  RATE: { onramp: { name: "onramp", windowSeconds: 600, max: 300 } },
}));

import { POST } from "./route";

const IP = "203.0.113.9";
const good = { name: "Ann Lee", email: "Ann@Example.Invalid", workshops: ["worship", "digital"], company: "" };
const NEW = { data: { created_at: "2026-10-31T01:00:00Z", updated_at: "2026-10-31T01:00:00Z" } };

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/onramp", {
      method: "POST",
      headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  fake = fakeSupabase({ "onramp_signups.upsert.single": NEW });
  h.getSupabaseAdmin.mockReturnValue(fake.db);
  h.allow.mockResolvedValue(true);
  h.configured.mockReturnValue(true);
  h.sendEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/onramp", () => {
  it("saves one row per email (upsert on email) and emails a confirmation", async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, updated: false, emailed: true });
    expect(fake.calls).toContainEqual([
      "onramp_signups",
      "upsert",
      { name: "Ann Lee", email: "ann@example.invalid", workshops: ["worship", "digital"] },
      { onConflict: "email" },
    ]);
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "onramp" }), IP);
    expect(h.sendEmail).toHaveBeenCalledWith(
      "ann@example.invalid",
      expect.stringContaining("You're in"),
      expect.stringContaining("Worship leading"),
      { text: expect.stringContaining("Digital mission") }
    );
  });

  it("reports a second sign-up from the same email as an update", async () => {
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({ "onramp_signups.upsert.single": { data: { created_at: "2026-10-31T01:00:00Z", updated_at: "2026-10-31T02:00:00Z" } } }).db
    );
    expect(await (await post(good)).json()).toEqual({ ok: true, updated: true, emailed: true });
  });

  it("answers 400 with the reason, before the rate limit or any write", async () => {
    for (const [body, message] of [
      [{ ...good, name: " " }, "Please enter your name."],
      [{ ...good, email: "ann@" }, "Please enter a valid email address."],
      [{ ...good, workshops: [] }, "Please pick at least 1 workshop."],
      [{ ...good, workshops: ["worship", "digital", "creative"] }, "Please pick no more than 2 workshops."],
      ["{not json", "Something went wrong with the form. Please try again."],
    ] as const) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(message);
    }
    expect(h.allow).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("spam: looks like success to the bot, saves and sends nothing", async () => {
    expect(await (await post({ ...good, company: "Acme" })).json()).toEqual({ ok: true, updated: false, emailed: false });
    expect(h.allow).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("429 when the caller is over the limit, before saving", async () => {
    h.allow.mockResolvedValueOnce(false);
    expect((await post(good)).status).toBe(429);
    expect(fake.calls).toEqual([]);
  });

  it("still succeeds when email is not set up or the send fails, and says so", async () => {
    h.configured.mockReturnValueOnce(false);
    expect(await (await post(good)).json()).toEqual({ ok: true, updated: false, emailed: false });
    expect(h.sendEmail).not.toHaveBeenCalled();
    h.sendEmail.mockRejectedValueOnce(new Error("smtp down"));
    expect(await (await post(good)).json()).toEqual({ ok: true, updated: false, emailed: false });
  });

  it("fails loud with a generic 500 when the save or the limiter fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "onramp_signups.upsert.single": { error: { message: "check violation" } } }).db);
    const res = await post(good);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("violation");
    h.allow.mockRejectedValueOnce(new Error("rate_limit_hit: down"));
    expect((await post(good)).status).toBe(500);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
