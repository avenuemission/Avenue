import { describe, expect, it } from "vitest";
import { validatePersonInput } from "./people";

describe("validatePersonInput", () => {
  it("accepts a minimal create", () => {
    expect(validatePersonInput({ firstName: " Sam " }, "create")).toEqual({ values: { first_name: "Sam" } });
  });
  it("requires firstName on create", () => {
    expect(validatePersonInput({}, "create")).toEqual({ error: "First name is required" });
  });
  it("does not require firstName on update", () => {
    expect(validatePersonInput({ invitee: true }, "update")).toEqual({ values: { invitee: true } });
  });
  it("rejects a name over 80 characters", () => {
    expect(validatePersonInput({ firstName: "a".repeat(81) }, "create")).toEqual({ error: "First name must be 80 characters or fewer" });
  });
  it("turns an empty lastName into null", () => {
    expect(validatePersonInput({ firstName: "Sam", lastName: "  " }, "create")).toEqual({ values: { first_name: "Sam", last_name: null } });
  });
  it("accepts known spaces and metrics, deduplicated", () => {
    expect(validatePersonInput({ spaces: ["third", "first", "third"], metrics: ["streetlights"] }, "update")).toEqual({
      values: { spaces: ["third", "first"], metrics: ["streetlights"] },
    });
  });
  it("rejects an unknown space", () => {
    expect(validatePersonInput({ spaces: ["fourth"] }, "update")).toEqual({ error: "spaces contains an invalid value: \"fourth\"" });
  });
  it("rejects an unknown metric", () => {
    expect(validatePersonInput({ metrics: ["baptisms"] }, "update")).toEqual({ error: "metrics contains an invalid value: \"baptisms\"" });
  });
  it("rejects icnu over 2000 characters", () => {
    expect(validatePersonInput({ icnu: "x".repeat(2001) }, "update")).toEqual({ error: "ICNU must be 2000 characters or fewer" });
  });
  it("rejects a non-boolean invitee", () => {
    expect(validatePersonInput({ invitee: "yes" }, "update")).toEqual({ error: "invitee must be true or false" });
  });
  it("accepts a uuid networkPersonId and null", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(validatePersonInput({ networkPersonId: id }, "update")).toEqual({ values: { network_person_id: id } });
    expect(validatePersonInput({ networkPersonId: null }, "update")).toEqual({ values: { network_person_id: null } });
  });
  it("rejects a malformed networkPersonId", () => {
    expect(validatePersonInput({ networkPersonId: "abc" }, "update")).toEqual({ error: "networkPersonId must be a uuid or null" });
  });
  it("ignores unknown fields such as owner_email", () => {
    expect(validatePersonInput({ firstName: "Sam", owner_email: "x@y.z", id: "1" }, "create")).toEqual({ values: { first_name: "Sam" } });
  });
  it("rejects a non-object body", () => {
    expect(validatePersonInput(null, "create")).toEqual({ error: "Body must be a JSON object" });
  });
});
