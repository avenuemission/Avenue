import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));

import { POST } from "./route";

const url = "http://localhost/api/workshops/ai-speak";

function post(body: unknown) {
  return POST(new NextRequest(url, { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: true } });
  h.fetch.mockReset().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
  vi.stubGlobal("fetch", h.fetch);
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/workshops/ai-speak", () => {
  it("passes requireLeader's response straight back and calls no API", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await post({ text: "hi" })).status).toBe(401);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("403 without full access", async () => {
    h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
    expect((await post({ text: "hi" })).status).toBe(403);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("400 with no text", async () => {
    expect((await post({})).status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("accepts text up to 8000 characters", async () => {
    const res = await post({ text: "a".repeat(8000) });
    expect(res.status).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("400 for text over 8000 characters, no API call made", async () => {
    const res = await post({ text: "a".repeat(8001) });
    expect(res.status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
