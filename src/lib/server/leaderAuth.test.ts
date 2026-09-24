import { describe, expect, it, vi } from "vitest";
import { bearerToken, resolveLeader, type ResolveDeps } from "./leaderAuth";

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    emailForToken: vi.fn(async () => "Leader@Example.invalid"),
    findLeader: vi.fn(async () => ({ name: "Leader", full_access: false })),
    ...overrides,
  };
}

describe("bearerToken", () => {
  it("reads a bearer token", () => expect(bearerToken("Bearer abc.def")).toBe("abc.def"));
  it("is case-insensitive on the scheme", () => expect(bearerToken("bearer abc")).toBe("abc"));
  it("rejects a missing header", () => expect(bearerToken(null)).toBeNull());
  it("rejects an empty token", () => expect(bearerToken("Bearer ")).toBeNull());
  it("rejects other schemes", () => expect(bearerToken("Basic abc")).toBeNull());
});

describe("resolveLeader", () => {
  it("401s with no header and never looks anything up", async () => {
    const d = deps();
    const r = await resolveLeader(null, d);
    expect(r).toEqual({ ok: false, status: 401, error: "Sign in required" });
    expect(d.emailForToken).not.toHaveBeenCalled();
    expect(d.findLeader).not.toHaveBeenCalled();
  });

  it("401s when the token does not verify, and never queries leaders", async () => {
    const d = deps({ emailForToken: vi.fn(async () => null) });
    const r = await resolveLeader("Bearer bad", d);
    expect(r).toEqual({ ok: false, status: 401, error: "Session expired, please sign in again" });
    expect(d.findLeader).not.toHaveBeenCalled();
  });

  it("403s when the verified email is not in leaders", async () => {
    const d = deps({ findLeader: vi.fn(async () => null) });
    const r = await resolveLeader("Bearer good", d);
    expect(r).toEqual({ ok: false, status: 403, error: "Not a leader account" });
  });

  it("looks the leader up by the lowercased verified email", async () => {
    const d = deps();
    await resolveLeader("Bearer good", d);
    expect(d.findLeader).toHaveBeenCalledWith("leader@example.invalid");
  });

  it("returns the identity on success", async () => {
    const r = await resolveLeader("Bearer good", deps({ findLeader: vi.fn(async () => ({ name: null, full_access: true })) }));
    expect(r).toEqual({ ok: true, leader: { email: "leader@example.invalid", name: "", fullAccess: true } });
  });

  it("500s when the token check throws", async () => {
    const r = await resolveLeader("Bearer good", deps({ emailForToken: vi.fn(async () => { throw new Error("auth down"); }) }));
    expect(r).toEqual({ ok: false, status: 500, error: "auth down" });
  });

  it("500s when the leaders query throws", async () => {
    const r = await resolveLeader("Bearer good", deps({ findLeader: vi.fn(async () => { throw new Error("db down"); }) }));
    expect(r).toEqual({ ok: false, status: 500, error: "db down" });
  });
});
