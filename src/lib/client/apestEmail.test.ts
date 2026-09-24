import { describe, expect, it, vi } from "vitest";
import { emailApestResults } from "./apestEmail";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
const fetchReturning = (res: Response | Error) =>
  vi.fn(async () => {
    if (res instanceof Error) throw res;
    return res;
  }) as unknown as typeof fetch;

const body = { results: { apostle: 30 }, email: "ann@example.invalid" };

describe("emailApestResults", () => {
  it("true when the server sent the emails", async () => {
    const f = fetchReturning(json(200, { ok: true, emailed: true }));
    expect(await emailApestResults(body, f)).toBe(true);
    expect(f).toHaveBeenCalledWith("/api/apest-results", expect.objectContaining({ method: "POST", body: JSON.stringify(body) }));
  });

  it("false when the server could not send them (emailed: false)", async () => {
    expect(await emailApestResults(body, fetchReturning(json(200, { ok: true, emailed: false })))).toBe(false);
  });

  it("false for an error status, a non-JSON body or a network failure", async () => {
    expect(await emailApestResults(body, fetchReturning(json(429, { error: "Too many" })))).toBe(false);
    expect(await emailApestResults(body, fetchReturning(new Response("<html>502</html>", { status: 502 })))).toBe(false);
    expect(await emailApestResults(body, fetchReturning(new TypeError("Failed to fetch")))).toBe(false);
  });
});
