// PersonPicker's typed-name rules (round 3 spec 5). Pure. Enter must do
// what the leader expects: tag an exact existing match (as picking the
// suggestion does), or add the typed name (as the Add button does). A
// typed name that was never saved says so once the field loses focus.
import type { Person } from "@/lib/people";

export const UNSAVED_HINT = "Not saved yet. Press Enter or tap Add.";

export type EnterChoice =
  | { kind: "nothing" }
  | { kind: "existing"; person: Person }
  | { kind: "already"; person: Person }
  | { kind: "add"; firstName: string; lastName: string | null };

// "Mary Anne Smith" is first name Mary, last name "Anne Smith"; one word
// has no last name. The Add button uses this too.
export function splitName(query: string): { firstName: string; lastName: string | null } | null {
  const [first, ...rest] = query.trim().split(/\s+/);
  if (!first) return null;
  return { firstName: first, lastName: rest.join(" ") || null };
}

function normalised(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// isListed: already carries this picker's tag, or is excluded (the launch
// team's current members). Among exact matches, one not yet listed wins.
export function enterChoice(query: string, people: Person[], isListed: (p: Person) => boolean): EnterChoice {
  const q = normalised(query);
  if (!q) return { kind: "nothing" };
  const exact = people.filter((p) => normalised(`${p.firstName} ${p.lastName ?? ""}`) === q);
  const unlisted = exact.find((p) => !isListed(p));
  if (unlisted) return { kind: "existing", person: unlisted };
  if (exact.length > 0) return { kind: "already", person: exact[0] };
  const name = splitName(query);
  if (!name) return { kind: "nothing" };
  return { kind: "add", ...name };
}

export function unsavedHint(query: string, focused: boolean): string | null {
  return !focused && query.trim().length > 0 ? UNSAVED_HINT : null;
}
