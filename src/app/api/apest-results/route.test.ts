import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// OpenAI (global fetch), the mailer and the rate limiter are replaced, so
// these tests touch no network and no database.
const h = vi.hoisted(() => ({ sendEmail: vi.fn(), allow: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/mail/transport", () => ({ sendEmail: h.sendEmail, isEmailConfigured: () => true }));
vi.mock("@/lib/server/rateLimit", () => ({
  allow: h.allow,
  RATE: {
    openai: { name: "openai", windowSeconds: 3600, max: 10 },
    formRecipient: { name: "form-to", windowSeconds: 3600, max: 3 },
  },
}));

import { POST } from "./route";

const ADMIN = "henrymcmahon@avenuemission.com";
const IP = "203.0.113.7";
const results = { apostle: 30, prophet: 20, evangelist: 15, shepherd: 25, teacher: 10 };
const REFLECTION = "You lead by sending.\n\nYou also care for people.";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/apest-results", {
      method: "POST",
      headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

function openAiReplies(content: string) {
  h.fetch.mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } })
  );
}

beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  vi.stubGlobal("fetch", h.fetch);
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  vi.stubEnv("AVENUE_SITE_URL", "");
  h.allow.mockResolvedValue(true);
  h.sendEmail.mockResolvedValue(undefined);
  openAiReplies(REFLECTION);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/apest-results", () => {
  it("results only (quiz page and leader training): returns the reflection, sends no email", async () => {
    const res = await post({ results });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ response: REFLECTION });
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "openai" }), IP);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.fetch.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("with an email: sends the server-written results to that one address and tells the admin", async () => {
    const res = await post({ results, email: "ann@example.invalid", name: "Ann", company: "" });
    expect(res.status).toBe(200);
    expect(h.sendEmail.mock.calls.map((c) => c[0])).toEqual(["ann@example.invalid", ADMIN]);
    expect(h.sendEmail.mock.calls.map((c) => c[1])).toEqual([
      "Your APEST Quiz Results - Discover Your Gifts",
      "New Form Submission: APEST Quiz Results",
    ]);
    const visitor = h.sendEmail.mock.calls[0];
    expect(visitor[2]).toContain("You lead by sending.");
    expect(visitor[3]).toEqual({ text: expect.stringContaining("Apostle: 30%") });
    expect(h.sendEmail.mock.calls[1][3].text).toContain("Teacher: 10%");
  });

  it("escapes the AI text and the name in the email", async () => {
    openAiReplies(`<a href="https://evil.invalid">click</a>`);
    await post({ results, email: "ann@example.invalid", name: `<b>Ann</b>` });
    const html = h.sendEmail.mock.calls[0][2] as string;
    expect(html).not.toContain(`<a href="https://evil.invalid">`);
    expect(html).not.toContain("<b>Ann</b>");
    expect(html).toContain("&lt;b&gt;Ann&lt;/b&gt;");
  });

  it("refuses the old client-written personalizedMessage", async () => {
    const res = await post({ results, email: "ann@example.invalid", personalizedMessage: "<script>x</script>" });
    expect(res.status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses a list of addresses", async () => {
    const res = await post({ results, email: "a@x.invalid, b@y.invalid" });
    expect(res.status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses bad results and an oversized body before calling OpenAI", async () => {
    expect((await post({ results: { ...results, teacher: "10" } })).status).toBe(400);
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ results, name: "a".repeat(5000) })).status).toBe(413);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.allow).not.toHaveBeenCalled();
  });

  it("429 when the caller is over the OpenAI limit", async () => {
    h.allow.mockResolvedValueOnce(false);
    const res = await post({ results });
    expect(res.status).toBe(429);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("fails loud when the rate limiter is down", async () => {
    h.allow.mockRejectedValue(new Error("rate_limit_hit: down"));
    const res = await post({ results });
    expect(res.status).toBe(500);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("recipient over its limit: returns the reflection, skips the visitor email, still tells the admin", async () => {
    h.allow.mockImplementation(async (rule: { name: string }) => rule.name !== "form-to");
    const res = await post({ results, email: "ann@example.invalid" });
    expect(res.status).toBe(200);
    expect(h.sendEmail.mock.calls.map((c) => c[0])).toEqual([ADMIN]);
  });

  it("spam: answers success without calling OpenAI or sending", async () => {
    const res = await post({ results, email: "ann@example.invalid", company: "Acme" });
    expect(res.status).toBe(200);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("500 without sending when OpenAI fails", async () => {
    h.fetch.mockResolvedValue(new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 }));
    const res = await post({ results, email: "ann@example.invalid" });
    expect(res.status).toBe(500);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
