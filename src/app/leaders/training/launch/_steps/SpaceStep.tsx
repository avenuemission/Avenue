"use client";

import { useState } from "react";
import { OutcomeButton, type StepProps } from "@/components/leaders/journey/WizardShell";
import { launchStepComplete, type LaunchData } from "@/lib/domain/journey";
import { SPACES, type Space } from "@/lib/domain/people";
import { SPACE_CONTENT } from "@/content/calling";
import { CallingNotFinished, StepIntro, TextField, text } from "./LaunchFields";

type SpaceSection = NonNullable<LaunchData["space"]>;

// Step 3 (p3m6): where the group will meet, prefilled from the hosting
// space chosen in Calling section 5, then the specific place.
export default function SpaceStep({
  value,
  save,
  finish,
  callingHosting,
}: StepProps<SpaceSection> & { callingHosting: Space | undefined }) {
  const [local, setLocal] = useState<SpaceSection>(() => ({
    hosting: value?.hosting ?? callingHosting,
    place: text(value?.place),
  }));

  const update = (patch: Partial<SpaceSection>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    save({ ...value, ...local, ...patch });
  };

  // Store the prefilled space even if the leader never changes it.
  const onFinish = () => {
    save({ ...value, ...local });
    finish();
  };

  const complete = launchStepComplete("space", { space: { ...value, ...local } });
  const chosen = callingHosting ? SPACE_CONTENT[callingHosting] : null;

  return (
    <div className="space-y-6">
      <StepIntro>Identify the space where you will connect with your mission group.</StepIntro>
      {chosen ? (
        <p className="text-sm text-gray-300">
          In Calling you chose your {chosen.name} ({chosen.short}).
        </p>
      ) : (
        <CallingNotFinished />
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {SPACES.map((s) => {
          const space = SPACE_CONTENT[s];
          const pressed = local.hosting === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={pressed}
              onClick={() => update({ hosting: s })}
              className={`min-h-[44px] rounded-lg border px-4 py-3 text-left ${
                pressed ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              <span className="block text-sm font-semibold text-white">
                {space.name}: {space.short}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{space.line}</span>
              <span className="mt-2 block text-xs leading-relaxed text-gray-300">{space.pro}</span>
            </button>
          );
        })}
      </div>
      <TextField
        id="launch-space-place"
        label="Where exactly? Name the place."
        value={text(local.place)}
        onChange={(v) => update({ place: v })}
        maxLength={200}
      />
      <OutcomeButton
        label="Choose my space"
        onClick={onFinish}
        disabled={!complete}
        hint="Choose a space and name the place to continue."
      />
    </div>
  );
}
