"use client";

import { useState } from "react";
import { OutcomeButton, type StepProps } from "@/components/journey/WizardShell";
import TaggedPeople from "@/components/people/TaggedPeople";
import { launchStepComplete, type LaunchData } from "@/lib/journey";
import type { Person } from "@/lib/people";
import { AreaField, StepIntro, text } from "./LaunchFields";

type Invite = NonNullable<LaunchData["invite"]>;

// Step 7 (p3m13, p3m14, p3m15): the invite list (the invitee flag on
// My People), how you keep track of birthdays and needs, and who
// shepherds whom.
export default function InviteStep({
  value,
  save,
  finish,
  people,
  peopleLoaded,
  peopleError,
  onPersonChange,
}: StepProps<Invite> & {
  people: Person[];
  peopleLoaded: boolean;
  peopleError: string | null;
  onPersonChange: (p: Person) => void;
}) {
  const [local, setLocal] = useState<Invite>(() => ({
    tracking: text(value?.tracking),
    shepherding: text(value?.shepherding),
  }));

  const onField = (key: keyof Invite, next: string) => {
    setLocal((prev) => ({ ...prev, [key]: next }));
    save({ ...value, [key]: next });
  };

  const complete = launchStepComplete("invite", { invite: { ...value, ...local } });

  return (
    <div className="space-y-6">
      <StepIntro>
        Invite others, track important dates like birthdays, and look out for people when they are sick or in need.
      </StepIntro>

      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Your invite list</h3>
        {!peopleLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your people...</p>
        ) : peopleError ? (
          <p className="text-sm text-red-400">{peopleError}</p>
        ) : (
          <TaggedPeople
            tag={{ kind: "invitee" }}
            people={people}
            onChange={onPersonChange}
            emptyText="No one on your invite list yet."
          />
        )}
      </div>

      <AreaField
        id="launch-invite-tracking"
        label="How will you keep track of birthdays and needs?"
        value={text(local.tracking)}
        onChange={(v) => onField("tracking", v)}
      />
      <AreaField
        id="launch-invite-shepherding"
        label="Who shepherds whom?"
        value={text(local.shepherding)}
        onChange={(v) => onField("shepherding", v)}
      />
      <OutcomeButton
        label="Enter the Arena"
        onClick={finish}
        disabled={!complete}
        hint="Answer both questions to continue."
      />
    </div>
  );
}
