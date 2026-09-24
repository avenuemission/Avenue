import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";
import { blankAnswers } from "@/lib/domain/workshops/survey";

// The rate limiter and the database are replaced, so these tests touch no
// network and no database.
const h = vi.hoisted(() => ({ allow: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/server/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/rateLimit")>()),
  allow: h.allow,
}));
vi.mock("@/lib/server/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { POST } from "./route";

const IP = "203.0.113.9";
let fake: ReturnType<typeof fakeSupabase>;

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/workshops/submit", {
      method: "POST",
      headers: { "x-nf-client-connection-ip": IP, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  h.allow.mockReset().mockResolvedValue(true);
  fake = fakeSupabase({ "survey_responses.insert": { data: [{ id: "1" }] } });
  h.getSupabaseAdmin.mockReset().mockReturnValue(fake.db);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/workshops/submit", () => {
  it("inserts a valid submission via the admin client and rate-limits by IP", async () => {
    const res = await post({ sessionCode: "ABCD", surveyData: { ...blankAnswers(), finalVision: "Be kind." } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(h.allow).toHaveBeenCalledWith(expect.objectContaining({ name: "ws-submit" }), IP);
    const row = fake.calls.find((c) => c[1] === "insert")?.[2] as Record<string, unknown>;
    expect(row.session_code).toBe("ABCD");
    expect(row.final_vision).toBe("Be kind.");
  });

  it("429 when the caller is over the submit limit, no insert attempted", async () => {
    h.allow.mockResolvedValueOnce(false);
    const res = await post({ sessionCode: "ABCD", surveyData: blankAnswers() });
    expect(res.status).toBe(429);
    expect(fake.calls).toEqual([]);
  });

  it("a JSON 500, never a bodyless one, when the rate limiter is down", async () => {
    h.allow.mockRejectedValueOnce(new Error("rate_limit_hit: connection refused"));
    const res = await post({ sessionCode: "ABCD", surveyData: blankAnswers() });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong. Please try again." });
    expect(fake.calls).toEqual([]);
  });

  it("400 for missing sessionCode or surveyData, no insert attempted", async () => {
    expect((await post({ surveyData: blankAnswers() })).status).toBe(400);
    expect((await post({ sessionCode: "ABCD" })).status).toBe(400);
    expect((await post("{nope")).status).toBe(400);
    expect(fake.calls).toEqual([]);
  });

  it("400 for an unknown survey field, no insert attempted", async () => {
    const res = await post({ sessionCode: "ABCD", surveyData: { ...blankAnswers(), notAField: "x" } });
    expect(res.status).toBe(400);
    expect(fake.calls).toEqual([]);
  });

  it("400 for an answer over 2000 characters, no insert attempted", async () => {
    const res = await post({ sessionCode: "ABCD", surveyData: { ...blankAnswers(), finalVision: "a".repeat(2001) } });
    expect(res.status).toBe(400);
    expect(fake.calls).toEqual([]);
  });

  it("400 for a Tegmark rank out of range, no insert attempted", async () => {
    const res = await post({ sessionCode: "ABCD", surveyData: { ...blankAnswers(), tegmarkRankProtector: "9" } });
    expect(res.status).toBe(400);
    expect(fake.calls).toEqual([]);
  });

  it("500 when the insert fails", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "survey_responses.insert": { error: { message: "down" } } }).db);
    const res = await post({ sessionCode: "ABCD", surveyData: blankAnswers() });
    expect(res.status).toBe(500);
  });
});
