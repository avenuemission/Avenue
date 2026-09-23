"use client";

import { useState } from "react";
import { OutcomeButton, type StepProps } from "@/components/journey/WizardShell";
import { launchStepComplete, type LaunchData } from "@/lib/journey";
import { AreaField, CallingNotFinished, StepIntro, text } from "./LaunchFields";

type Mission = NonNullable<LaunchData["mission"]>;

// Step 2 (p3m5): the group you are on mission for, prefilled from the
// people group named in Calling section 5.
export default function MissionStep({
  value,
  save,
  finish,
  callingPeopleGroup,
}: StepProps<Mission> & { callingPeopleGroup: string | undefined }) {
  const [local, setLocal] = useState<Mission>(() => ({
    who: value?.who ?? callingPeopleGroup ?? "",
    needs: text(value?.needs),
    gather: text(value?.gather),
  }));

  const onField = (key: keyof Mission, next: string) => {
    setLocal((prev) => ({ ...prev, [key]: next }));
    save({ ...value, ...local, [key]: next });
  };

  // Store the prefilled value even if the leader never edits it.
  const onFinish = () => {
    save({ ...value, ...local });
    finish();
  };

  const complete = launchStepComplete("mission", { mission: { ...value, ...local } });

  return (
    <div className="space-y-6">
      <StepIntro>Identify a group to be on mission for.</StepIntro>
      {callingPeopleGroup ? (
        <p className="text-sm text-gray-300">In Calling you said you have a heart for: &ldquo;{callingPeopleGroup}&rdquo;</p>
      ) : (
        <CallingNotFinished />
      )}
      <AreaField
        id="launch-mission-who"
        label="Who are you on mission for?"
        value={text(local.who)}
        onChange={(v) => onField("who", v)}
      />
      <AreaField
        id="launch-mission-needs"
        label="What do they need?"
        value={text(local.needs)}
        onChange={(v) => onField("needs", v)}
      />
      <AreaField
        id="launch-mission-gather"
        label="Where do they already gather?"
        value={text(local.gather)}
        onChange={(v) => onField("gather", v)}
      />
      <OutcomeButton
        label="Name my mission group"
        onClick={onFinish}
        disabled={!complete}
        hint="Name who you are on mission for to continue."
      />
    </div>
  );
}
