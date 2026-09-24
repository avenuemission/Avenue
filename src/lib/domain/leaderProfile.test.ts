import { describe, expect, it } from "vitest";
import { PROFILE_COLUMNS, pathwayGroupIdFrom, profileResponse } from "./leaderProfile";

describe("PROFILE_COLUMNS", () => {
  it("reads the group link and the linked group's name, never the legacy text column", () => {
    expect(PROFILE_COLUMNS).toContain("pathway_group_id");
    expect(PROFILE_COLUMNS).toContain("pathway_groups(name)");
    expect(PROFILE_COLUMNS.split(",").map((c) => c.trim())).not.toContain("pathway_group");
  });
});

describe("profileResponse", () => {
  it("is null when the leader has no profile row", () => {
    expect(profileResponse(null)).toBeNull();
  });

  it("returns the id plus the group name for display", () => {
    const row = {
      display_name: "Ann Lee",
      avatar_url: null,
      role: "Leader",
      apest: "Shepherd",
      pathway_group_id: 3,
      pathway_groups: { name: "North Side" },
    };
    expect(profileResponse(row)).toEqual({
      display_name: "Ann Lee",
      avatar_url: null,
      role: "Leader",
      apest: "Shepherd",
      pathwayGroupId: 3,
      pathwayGroupName: "North Side",
    });
  });

  it("has no group when the link is empty", () => {
    expect(profileResponse({ display_name: "Ann", pathway_group_id: null, pathway_groups: null })).toEqual({
      display_name: "Ann",
      pathwayGroupId: null,
      pathwayGroupName: null,
    });
  });

  it("never passes the legacy text column or the email through", () => {
    const out = profileResponse({ email: "a@example.invalid", pathway_group: "Old text", pathway_group_id: null, pathway_groups: null });
    expect(out).not.toHaveProperty("pathway_group");
    expect(out).not.toHaveProperty("email");
  });
});

describe("pathwayGroupIdFrom", () => {
  it("reads a group id from a number or a digit string", () => {
    expect(pathwayGroupIdFrom(3)).toEqual({ id: 3 });
    expect(pathwayGroupIdFrom("12")).toEqual({ id: 12 });
  });

  it("treats null and an empty choice as no group", () => {
    expect(pathwayGroupIdFrom(null)).toEqual({ id: null });
    expect(pathwayGroupIdFrom("")).toEqual({ id: null });
  });

  it("refuses anything else", () => {
    for (const bad of [0, -1, 1.5, "abc", "3 ", "North Side", true, {}, undefined]) {
      expect(pathwayGroupIdFrom(bad)).toEqual({ error: "pathwayGroupId must be a pathway group id or null" });
    }
  });
});
