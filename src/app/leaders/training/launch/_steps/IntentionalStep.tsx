"use client";

import { useState } from "react";
import { OutcomeButton, type StepProps } from "@/components/leaders/journey/WizardShell";
import { launchStepComplete, type LaunchData } from "@/lib/domain/journey";
import { AreaField, StepIntro, TextField, text } from "./LaunchFields";

type Intentional = NonNullable<LaunchData["intentional"]>;

// Step 5 (p3m7, p3m8): two or three concrete commitments, and where you are
// putting yourself in a position of need.
export default function IntentionalStep({ value, save, finish }: StepProps<Intentional>) {
  const [commitments, setCommitments] = useState<string[]>(() => [0, 1, 2].map((i) => text(value?.commitments?.[i])));
  const [needPosition, setNeedPosition] = useState(() => text(value?.needPosition));

  const onCommitment = (i: number, next: string) => {
    const all = commitments.map((c, j) => (j === i ? next : c));
    setCommitments(all);
    save({ ...value, commitments: all });
  };

  const onNeed = (next: string) => {
    setNeedPosition(next);
    save({ ...value, needPosition: next });
  };

  const complete = launchStepComplete("intentional", { intentional: { ...value, commitments, needPosition } });

  return (
    <div className="space-y-6">
      <StepIntro>
        Live intentionally with those you&apos;re on mission for, and put yourself in a position of &ldquo;need
        to&rdquo;.
      </StepIntro>
      {commitments.map((c, i) => (
        <TextField
          key={i}
          id={`launch-commitment-${i + 1}`}
          label={`Commitment ${i + 1}`}
          value={c}
          onChange={(v) => onCommitment(i, v)}
          maxLength={200}
        />
      ))}
      <AreaField
        id="launch-need-position"
        label="Where are you putting yourself in a position of need?"
        value={needPosition}
        onChange={onNeed}
      />
      <OutcomeButton
        label="Commit to it"
        onClick={finish}
        disabled={!complete}
        hint="Write at least two commitments to continue."
      />
    </div>
  );
}
