"use client";

import { useState } from "react";
import { OutcomeButton, type StepProps } from "@/components/leaders/journey/WizardShell";
import { launchStepComplete, type LaunchData } from "@/lib/domain/journey";
import { AreaField, StepIntro, text } from "./LaunchFields";

type Prayer = NonNullable<LaunchData["prayer"]>;

// Step 1 (p3m2, p3m4): pray and fast first, with others, as a team.
export default function PrayerStep({ value, save, finish }: StepProps<Prayer>) {
  const [local, setLocal] = useState<Prayer>(() => ({
    when: text(value?.when),
    who: text(value?.who),
    teamPrayer: text(value?.teamPrayer),
  }));

  const onField = (key: keyof Prayer, next: string) => {
    setLocal((prev) => ({ ...prev, [key]: next }));
    save({ ...value, [key]: next });
  };

  const complete = launchStepComplete("prayer", { prayer: { ...value, ...local } });

  return (
    <div className="space-y-6">
      <StepIntro>
        When Nehemiah heard the state of his city and the walls fallen down, he brought his sorrow to prayer and
        fasting (Neh. 1). Bring your launch vision to God in prayer and fasting.
      </StepIntro>
      <AreaField
        id="launch-prayer-when"
        label="When will you pray and fast about the launch?"
        value={text(local.when)}
        onChange={(v) => onField("when", v)}
      />
      <AreaField
        id="launch-prayer-who"
        label="Who prays with you?"
        value={text(local.who)}
        onChange={(v) => onField("who", v)}
      />
      <AreaField
        id="launch-prayer-team"
        label="How often will your launch team meet to pray?"
        value={text(local.teamPrayer)}
        onChange={(v) => onField("teamPrayer", v)}
      />
      <OutcomeButton
        label="Save my prayer plan"
        onClick={finish}
        disabled={!complete}
        hint="Say when you will pray to continue."
      />
    </div>
  );
}
