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
    form: { name: "form", windowSeconds: 600, max: 5 },
    formRecipient: { name: "form-to", windowSeconds: 3600, max: 3 },
  },
}));

import { POST } from "./route";
import { signText } from "@/lib/server/signedText";
import { APEST_ROLES } from "@/lib/domain/apest";

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
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  h.allow.mockResolvedValue(true);
  h.sendEmail.mockResolvedValue(undefined);
  openAiReplies(REFLECTION);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const signed = (text = REFLECTION) => ({ reflection: text, signature: signText(text, results) });

describe("POST /api/apest-results: the reflection (no email)", () => {
  it("returns the reflection and its signature, sends no email", async () => {
    const res = await post({ results });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.response).toBe(REFLECTION);
    expect(json.signature).toBe(signText(REFLECTION, results));
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "openai" }), IP);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.fetch.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("429 when the caller is over the OpenAI limit", async () => {
    h.allow.mockResolvedValueOnce(false);
    expect((await post({ results })).status).toBe(429);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("fails loud when the rate limiter is down", async () => {
    h.allow.mockRejectedValue(new Error("rate_limit_hit: down"));
    expect((await post({ results })).status).toBe(500);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("500 when OpenAI fails", async () => {
    h.fetch.mockResolvedValue(new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 }));
    expect((await post({ results })).status).toBe(500);
  });

  it("refuses bad results and an oversized body before calling OpenAI", async () => {
    expect((await post({ results: { ...results, teacher: "10" } })).status).toBe(400);
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ results, name: "a".repeat(30000) })).status).toBe(413);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.allow).not.toHaveBeenCalled();
  });
});

describe("POST /api/apest-results: emailing the results", () => {
  it("emails exactly the reflection the page showed, with no second OpenAI call", async () => {
    const res = await post({ results, email: "ann@example.invalid", name: "Ann", company: "", ...signed() });
    expect(res.status).toBe(200);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "form" }), IP);
    expect(h.sendEmail.mock.calls.map((c) => c[0])).toEqual(["ann@example.invalid", ADMIN]);
    expect(h.sendEmail.mock.calls.map((c) => c[1])).toEqual([
      "Your APEST Quiz Results - Discover Your Gifts",
      "New Form Submission: APEST Quiz Results",
    ]);
    const visitor = h.sendEmail.mock.calls[0];
    expect(visitor[2]).toContain("You lead by sending.");
    expect(visitor[2]).toContain("You also care for people.");
    expect(visitor[3]).toEqual({ text: expect.stringContaining("Apostle: 30%") });
    expect(h.sendEmail.mock.calls[1][3].text).toContain("Teacher: 10%");
  });

  it("400 and nothing sent when the reflection was changed", async () => {
    const res = await post({
      results,
      email: "ann@example.invalid",
      reflection: `${REFLECTION} Click https://evil.invalid`,
      signature: signText(REFLECTION, results),
    });
    expect(res.status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("400 when the results were changed after signing", async () => {
    const res = await post({ results: { ...results, teacher: 11 }, email: "ann@example.invalid", ...signed() });
    expect(res.status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("400 for a signature of the wrong length", async () => {
    const res = await post({ results, email: "ann@example.invalid", reflection: REFLECTION, signature: "abc123" });
    expect(res.status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("with no AI reflection (OpenAI failed on the page): emails the strongest gift's text the page showed", async () => {
    await post({ results, email: "ann@example.invalid" });
    expect(h.fetch).not.toHaveBeenCalled();
    // apostle is the top role in these results
    expect(h.sendEmail.mock.calls[0][3].text).toContain(APEST_ROLES.apostle.leadershipBenefit);
  });

  it("escapes the reflection and the name in the email", async () => {
    const evil = `<a href="https://evil.invalid">click</a>`;
    await post({ results, email: "ann@example.invalid", name: "<b>Ann</b>", ...signed(evil) });
    const html = h.sendEmail.mock.calls[0][2] as string;
    expect(html).not.toContain(`<a href="https://evil.invalid">`);
    expect(html).not.toContain("<b>Ann</b>");
    expect(html).toContain("&lt;b&gt;Ann&lt;/b&gt;");
  });

  it("refuses the old client-written personalizedMessage", async () => {
    const res = await post({ results, email: "ann@example.invalid", personalizedMessage: "<script>x</script>" });
    expect(res.status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("refuses a list of addresses", async () => {
    expect((await post({ results, email: "a@x.invalid, b@y.invalid", ...signed() })).status).toBe(400);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("429 when the caller is over the form limit", async () => {
    h.allow.mockResolvedValueOnce(false);
    expect((await post({ results, email: "ann@example.invalid", ...signed() })).status).toBe(429);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it("recipient over its limit: skips the visitor email, still tells the admin", async () => {
    h.allow.mockImplementation(async (rule: { name: string }) => rule.name !== "form-to");
    const res = await post({ results, email: "ann@example.invalid", ...signed() });
    expect(res.status).toBe(200);
    expect(h.sendEmail.mock.calls.map((c) => c[0])).toEqual([ADMIN]);
  });

  it("spam: answers success, calls nothing and sends nothing", async () => {
    const res = await post({ results, email: "ann@example.invalid", company: "Acme", ...signed() });
    expect(res.status).toBe(200);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.allow).not.toHaveBeenCalled();
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
