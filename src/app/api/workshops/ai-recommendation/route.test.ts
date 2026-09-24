import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const h = vi.hoisted(() => ({ requireLeader: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/requireLeader", () => ({ requireLeader: h.requireLeader }));

import { POST } from "./route";

const url = "http://localhost/api/workshops/ai-recommendation";
const oneResponse = { role: "pastor", final_vision: "Be kind." };

function post(body: unknown) {
  return POST(new NextRequest(url, { method: "POST", body: JSON.stringify(body) }));
}

function openAiReplies(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  h.requireLeader.mockReset().mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: true } });
  h.fetch.mockReset().mockImplementation(async () => openAiReplies("some analysis"));
  vi.stubGlobal("fetch", h.fetch);
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/workshops/ai-recommendation", () => {
  it("passes requireLeader's response straight back and calls no API", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    expect((await post({ responses: [oneResponse] })).status).toBe(401);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("403 without full access", async () => {
    h.requireLeader.mockResolvedValue({ leader: { email: "a@example.invalid", name: "A", fullAccess: false } });
    expect((await post({ responses: [oneResponse] })).status).toBe(403);
  });

  it("400 with no responses", async () => {
    expect((await post({ responses: [] })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("400 when a response is not a plain object", async () => {
    expect((await post({ responses: ["nope"] })).status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("400 when a response field is over 8000 characters", async () => {
    const res = await post({ responses: [{ final_vision: "a".repeat(8001) }] });
    expect(res.status).toBe(400);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("accepts a response field up to 8000 characters", async () => {
    const res = await post({ responses: [{ final_vision: "a".repeat(8000) }] });
    expect(res.status).toBe(200);
    expect(h.fetch).toHaveBeenCalled();
  });

  it("200 with a normal set of responses", async () => {
    const res = await post({ responses: [oneResponse] });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.written).toBe("some analysis");
    expect(json.spoken).toBe("some analysis");
  });
});
