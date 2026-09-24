import { describe, expect, it } from "vitest";
import type { Metric, Person } from "./people";
import { enterChoice, splitName, UNSAVED_HINT, unsavedHint } from "./personPicker";

const person = (id: string, firstName: string, lastName: string | null, metrics: Metric[] = []): Person => ({
  id,
  firstName,
  lastName,
  spaces: [],
  metrics,
  invitee: false,
  icnu: null,
  networkPersonId: null,
});

const sam = person("p1", "Sam", "Lee");
const jo = person("p2", "Jo", null, ["pathways"]);
const onPathways = (p: Person) => p.metrics.includes("pathways");

describe("enterChoice", () => {
  it("does nothing for a blank field", () => {
    expect(enterChoice("   ", [sam], onPathways)).toEqual({ kind: "nothing" });
  });
  it("adds a new name, split like the Add button splits it", () => {
    expect(enterChoice("Mary Anne Smith", [sam], onPathways)).toEqual({
      kind: "add",
      firstName: "Mary",
      lastName: "Anne Smith",
    });
    expect(enterChoice(" Priya ", [sam], onPathways)).toEqual({ kind: "add", firstName: "Priya", lastName: null });
    expect(splitName("  ")).toBeNull();
  });
  it("tags an exact existing match instead of adding a second person, ignoring case and spaces", () => {
    expect(enterChoice("  sam   LEE ", [sam, jo], onPathways)).toEqual({ kind: "existing", person: sam });
  });
  it("reports an exact match already on this list, preferring a same-named person who is not", () => {
    expect(enterChoice("jo", [sam, jo], onPathways)).toEqual({ kind: "already", person: jo });
    const otherJo = person("p3", "Jo", null);
    expect(enterChoice("Jo", [jo, otherJo], onPathways)).toEqual({ kind: "existing", person: otherJo });
  });
  it("adds rather than tags when the name only partly matches someone", () => {
    expect(enterChoice("Sam", [sam], onPathways)).toEqual({ kind: "add", firstName: "Sam", lastName: null });
  });
});

describe("unsavedHint", () => {
  it("shows only when the field has text and has lost focus", () => {
    expect(unsavedHint("Sam", false)).toBe(UNSAVED_HINT);
    expect(unsavedHint("Sam", true)).toBeNull();
    expect(unsavedHint("  ", false)).toBeNull();
    expect(UNSAVED_HINT).toBe("Not saved yet. Press Enter or tap Add.");
  });
});
