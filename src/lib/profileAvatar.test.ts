import { describe, expect, it } from "vitest";
import { avatarFromProfileResponse, initialsOf } from "./profileAvatar";

describe("initialsOf", () => {
  it("takes the first letters of the first two words", () => {
    expect(initialsOf("sam  de la cruz")).toBe("SD");
  });
  it("takes one letter for one word", () => {
    expect(initialsOf("Henry")).toBe("H");
  });
  it("shows a question mark for a blank name", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("avatarFromProfileResponse", () => {
  it("reads the display name and photo from the profile", () => {
    expect(
      avatarFromProfileResponse({ profile: { display_name: "Sam Lee", avatar_url: "data:image/jpeg;base64,AA" } }, "Sam")
    ).toEqual({ name: "Sam Lee", avatarUrl: "data:image/jpeg;base64,AA" });
  });
  it("falls back to the sign-in name when there is no profile yet", () => {
    expect(avatarFromProfileResponse({ profile: null }, "Sam")).toEqual({ name: "Sam", avatarUrl: "" });
    expect(avatarFromProfileResponse(null, "Sam")).toEqual({ name: "Sam", avatarUrl: "" });
  });
  it("ignores a blank name and a photo that is not a string", () => {
    expect(avatarFromProfileResponse({ profile: { display_name: "  ", avatar_url: 42 } }, "Sam")).toEqual({
      name: "Sam",
      avatarUrl: "",
    });
  });
});
