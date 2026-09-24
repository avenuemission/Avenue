import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_STORAGE_KEY, getCurrentUser, parseStoredUser } from "./authSession";

describe("parseStoredUser", () => {
  it("returns a well-formed cached user", () => {
    const raw = JSON.stringify({ id: "u1", email: "a@example.invalid", name: "A" });
    expect(parseStoredUser(raw)).toEqual({ id: "u1", email: "a@example.invalid", name: "A" });
  });
  it("returns null for invalid JSON instead of throwing", () => {
    expect(parseStoredUser("{not json")).toBeNull();
    expect(parseStoredUser("")).toBeNull();
  });
  it("returns null for JSON of the wrong shape", () => {
    expect(parseStoredUser("null")).toBeNull();
    expect(parseStoredUser("5")).toBeNull();
    expect(parseStoredUser('"text"')).toBeNull();
    expect(parseStoredUser("[]")).toBeNull();
    expect(parseStoredUser(JSON.stringify({ id: "u1", email: 3, name: "A" }))).toBeNull();
    expect(parseStoredUser(JSON.stringify({ id: "u1", email: "a@example.invalid" }))).toBeNull();
  });
});

describe("getCurrentUser", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: vi.fn((k: string) => void store.delete(k)),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads the cached user", () => {
    store.set(AUTH_STORAGE_KEY, JSON.stringify({ id: "u1", email: "a@example.invalid", name: "A" }));
    expect(getCurrentUser()).toEqual({ id: "u1", email: "a@example.invalid", name: "A" });
  });
  it("returns null when signed out", () => {
    expect(getCurrentUser()).toBeNull();
  });
  it("removes a corrupt value and reads as signed out", () => {
    store.set(AUTH_STORAGE_KEY, "{not json");
    expect(getCurrentUser()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith("avenue_auth_session");
  });
});
