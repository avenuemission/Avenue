import { describe, expect, it, vi } from "vitest";
import { blankAnswers } from "@/lib/domain/workshops/survey";
import { checkSessionCode, planSubmit, submitSurvey, TOO_MANY_MESSAGE } from "./workshopSurvey";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
const fetchReturning = (res: Response | Error) =>
  vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  }) as unknown as typeof fetch;

describe("checkSessionCode", () => {
  it("valid: the server's code and the Life 3.0 flag", async () => {
    const f = fetchReturning(json(200, { valid: true, code: "ABCD", include_life_3: false }));
    expect(await checkSessionCode("abcd", f)).toEqual({ kind: "valid", code: "ABCD", includeLife3: false });
    expect(f).toHaveBeenCalledWith("/api/workshops/validate-code", expect.objectContaining({ method: "POST", body: JSON.stringify({ code: "abcd" }) }));
  });

  it("invalid: the server's message and any suggestion", async () => {
    const f = fetchReturning(json(200, { valid: false, error: 'Did you mean "ABCD"?', suggestion: "ABCD" }));
    expect(await checkSessionCode("ABCE", f)).toEqual({ kind: "invalid", error: 'Did you mean "ABCD"?', suggestion: "ABCD" });
  });

  it("429: says to wait, and is not a verdict on the code", async () => {
    const f = fetchReturning(json(429, { error: "Too many attempts. Please wait a few minutes and try again." }));
    expect(await checkSessionCode("ABCD", f)).toEqual({ kind: "unavailable", error: TOO_MANY_MESSAGE });
    expect(TOO_MANY_MESSAGE).toBe("Too many attempts. Please wait a few minutes and try again.");
  });

  it("a 500 or a non-JSON body is 'try again', never a stuck check", async () => {
    expect((await checkSessionCode("ABCD", fetchReturning(json(500, { error: "Something went wrong. Please try again." })))).kind).toBe("unavailable");
    expect((await checkSessionCode("ABCD", fetchReturning(new Response("<html>502</html>", { status: 502 })))).kind).toBe("unavailable");
    expect((await checkSessionCode("ABCD", fetchReturning(new Response("not json", { status: 200 })))).kind).toBe("unavailable");
  });

  it("a network failure is 'try again'", async () => {
    const out = await checkSessionCode("ABCD", fetchReturning(new TypeError("Failed to fetch")));
    expect(out.kind).toBe("unavailable");
  });
});

describe("planSubmit", () => {
  it("posts when a code was confirmed", () => {
    expect(planSubmit("ABCD", "ABCD")).toBe("post");
  });
  it("asks for the code when one was typed but is not confirmed", () => {
    expect(planSubmit("", "ABCD")).toBe("needCode");
  });
  it("skips the post only when no code was typed at all", () => {
    expect(planSubmit("", "  ")).toBe("skip");
  });
});

describe("submitSurvey", () => {
  const answers = blankAnswers();

  it("ok only when the server confirms the save", async () => {
    const f = fetchReturning(json(200, { success: true }));
    expect(await submitSurvey("ABCD", answers, f)).toEqual({ ok: true });
    expect(f).toHaveBeenCalledWith(
      "/api/workshops/submit",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ sessionCode: "ABCD", surveyData: answers }) })
    );
  });

  it("429: not saved, says to wait", async () => {
    const out = await submitSurvey("ABCD", answers, fetchReturning(json(429, { error: TOO_MANY_MESSAGE })));
    expect(out).toEqual({ ok: false, error: expect.stringContaining(TOO_MANY_MESSAGE) });
  });

  it("a 500, a non-JSON body or a network failure: not saved", async () => {
    for (const res of [
      json(500, { error: "Something went wrong. Please try again." }),
      new Response("<html>502</html>", { status: 502 }),
      new Response("not json", { status: 200 }),
      new TypeError("Failed to fetch"),
    ]) {
      const out = await submitSurvey("ABCD", answers, fetchReturning(res));
      expect(out.ok).toBe(false);
      expect(!out.ok && out.error).toMatch(/not saved/i);
    }
  });
});
