"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { OutcomeButton, type StepProps } from "@/components/journey/WizardShell";
import PersonPicker from "@/components/people/PersonPicker";
import { launchStepComplete, type LaunchData } from "@/lib/journey";
import type { Person } from "@/lib/people";
import { StepIntro } from "./LaunchFields";

type Team = NonNullable<LaunchData["team"]>;

const MAX_TEAM = 4;

function cleanIds(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === "string"))] : [];
}

// Step 4 (p3m3, p3m4): name 2 to 4 people. The team is a list of person ids
// in the Launch worksheet; choosing or removing someone never edits them.
export default function TeamStep({
  value,
  save,
  finish,
  people,
  peopleLoaded,
  peopleError,
  onPersonChange,
}: StepProps<Team> & {
  people: Person[];
  peopleLoaded: boolean;
  peopleError: string | null;
  onPersonChange: (p: Person) => void;
}) {
  const [personIds, setPersonIds] = useState<string[]>(() => cleanIds(value?.personIds));

  const setIds = (next: string[]) => {
    setPersonIds(next);
    save({ ...value, personIds: next });
  };

  const add = (p: Person) => {
    onPersonChange(p);
    if (!personIds.includes(p.id) && personIds.length < MAX_TEAM) setIds([...personIds, p.id]);
  };

  const remove = (id: string) => setIds(personIds.filter((x) => x !== id));

  const complete = launchStepComplete("team", { team: { ...value, personIds } });

  return (
    <div className="space-y-6">
      <StepIntro>
        When Nehemiah arrived in Jerusalem, he created a core team, taking a few men with him, and didn&apos;t tell
        anyone what God had laid on his heart (Neh. 2:11-15). Identify and invite 2 to 4 people.
      </StepIntro>

      {!peopleLoaded ? (
        <p className="text-sm text-[var(--muted)]">Loading your people...</p>
      ) : peopleError ? (
        <p className="text-sm text-red-400">{peopleError}</p>
      ) : (
        <div className="space-y-3">
          {personIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {personIds.map((id) => {
                const p = people.find((x) => x.id === id);
                const name = p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : "Someone no longer in My People";
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-3 pr-1 py-1 text-sm text-white"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      aria-label={`Remove ${name} from your launch team`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted)] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}
          {personIds.length < MAX_TEAM ? (
            <PersonPicker tag={{ kind: "none" }} people={people} onChange={add} exclude={personIds} />
          ) : null}
        </div>
      )}

      {/* The trailing ! beats .panel's own unlayered border colour. */}
      {personIds.length < 2 ? (
        <div className="panel p-4 border-amber-400/60!">
          <p className="eyebrow">Stop</p>
          <p className="mt-2 text-sm leading-relaxed text-white">
            You have no launch team yet. Nehemiah took a few people with him before he told anyone. Name at least two.
          </p>
        </div>
      ) : null}

      <OutcomeButton
        label="Confirm my launch team"
        onClick={finish}
        disabled={!complete}
        hint="Name at least two people to continue."
      />
    </div>
  );
}
