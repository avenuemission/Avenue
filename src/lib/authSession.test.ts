import { describe, expect, it } from "vitest";
import { parseStoredUser } from "./authSession";

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
