import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonError, serverError, tooMany } from "./http";

describe("jsonError", () => {
  it("returns the given status with an { error } body", async () => {
    const res = jsonError(400, "bad input");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "bad input" });
  });
});

describe("tooMany", () => {
  it("is a 429 with the standard wait message", async () => {
    const res = tooMany();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many attempts. Please wait a few minutes and try again." });
  });
});

describe("serverError", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it("is a 500 with a generic message, never the cause", async () => {
    const cause = new Error("relation leaders does not exist, connection string: postgres://secret");
    const res = serverError("church-health read", cause);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong. Please try again." });
    expect(JSON.stringify(body)).not.toContain("postgres://secret");
    expect(JSON.stringify(body)).not.toContain("relation leaders");
  });

  it("logs the context and the real cause server-side", () => {
    const cause = new Error("boom");
    serverError("submissions insert", cause);
    expect(spy).toHaveBeenCalledWith("submissions insert", cause);
  });

  it("never leaks the cause for a non-Error cause either", async () => {
    const res = serverError("network reparent", { secret: "sb_secret_abc123" });
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("sb_secret_abc123");
  });
});
