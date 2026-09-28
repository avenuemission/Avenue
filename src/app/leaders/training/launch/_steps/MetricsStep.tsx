"use client";

import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import MetricList from "@/app/leaders/training/launch/_steps/MetricList";

// Step 8: Metrics, just before the scenarios. Read only: it introduces the
// three metrics the scenarios move. Continuing saves { read: true } under
// the "metrics" section and moves on.
export default function MetricsStep({ finish }: { finish: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Metrics</p>
        <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">How we measure a healthy group</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">
          Avenue tracks the health of every pathway with three simple metrics. They are not a score to chase. They show
          whether your group is growing the way Jesus grows His church. You&apos;ll see them move in the scenarios next.
        </p>
      </div>
      <div className="border-y border-[var(--line)] py-5">
        <MetricList />
      </div>
      <OutcomeButton label="Continue to scenarios" onClick={finish} />
    </div>
  );
}
