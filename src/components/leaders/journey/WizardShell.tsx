"use client";

import Link from "next/link";
import { progressLabel, timeLabel, type WizardStepMeta } from "@/lib/domain/wizard";
import { STOP_IDS } from "@/lib/domain/avenue";
import { VERSES } from "@/content/training/verses";
import PhaseOpening from "@/components/leaders/avenue/PhaseOpening";
import LampSteps from "@/components/leaders/avenue/LampSteps";
import type { DotStatus } from "@/lib/domain/stepStatus";
import JourneyFooter from "@/components/leaders/avenue/JourneyFooter";
import HeaderAvatar from "@/components/leaders/avenue/HeaderAvatar";

// Each step component receives its own saved section and two callbacks.
export interface StepProps<T> {
  value: T | undefined; // this step's saved section
  save: (value: T) => void; // saveSection for this step's section
  finish: () => void; // flush this section, then go to the next step
}

export interface WizardShellProps {
  phaseId: "phase2" | "phase3";
  user: { email: string; name: string } | null; // the signed-in leader, for the header avatar
  name: string; // "Calling" or "Launch"
  title: string; // "Discover your calling" or "Plan your launch"
  steps: WizardStepMeta[];
  lampLabels: Record<string, string>; // short lamp label per step id
  stepStatus: Record<string, DotStatus>; // off, in progress or done, per step id
  current: number;
  onSelect: (index: number) => void;
  saving: boolean; // savingSection !== null
  saveError: string | null;
  children: React.ReactNode;
}

// The forward button on every step. Outcome-phrased labels only.
export function OutcomeButton(props: { label: string; onClick: () => void; disabled?: boolean; hint?: string }) {
  const { label, onClick, disabled, hint } = props;
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full sm:w-auto min-h-[44px] px-6 rounded-full bg-[var(--accent)] text-white font-semibold disabled:opacity-50"
      >
        {label}
      </button>
      {disabled && hint ? <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

// Layout for the Calling and Launch wizards (spec 4.2). The page owns
// navigation and data; the shell draws the phase opening, a dot per step
// (off, in progress or done; the current step's label is underlined; tap
// to jump), one quiet time line, the save state, and the step itself on a
// raised night card.
export default function WizardShell(props: WizardShellProps) {
  const { phaseId, user, name, title, steps, lampLabels, stepStatus, current, onSelect, saving, saveError, children } =
    props;
  const verse = VERSES[phaseId];
  const stop = STOP_IDS.indexOf(phaseId) + 1;
  const completeCount = steps.filter((s) => s.complete).length;

  return (
    <div className="avenue-night">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="no-print flex items-center justify-between gap-4">
          <Link
            href="/leaders/training"
            className="inline-flex min-h-[44px] items-center text-sm text-[var(--muted)] hover:text-white"
          >
            Back to your journey
          </Link>
          <HeaderAvatar user={user} />
        </div>

        <div className="mt-4">
          <PhaseOpening
            size="small"
            headingLevel={1}
            stop={stop}
            name={name}
            reference={verse.reference}
            short={verse.short}
            verse={verse.text}
          >
            <p className="mb-6 text-sm text-[var(--muted)]">{title}</p>
            <LampSteps
              steps={steps.map((s) => {
                const status = stepStatus[s.id];
                if (!status) throw new Error(`WizardShell: no status for step ${s.id}`);
                return { id: s.id, label: lampLabels[s.id] ?? s.title, status };
              })}
              currentIndex={current}
              onSelect={onSelect}
              label={`${name}: ${completeCount} of ${steps.length} steps complete`}
            />
          </PhaseOpening>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="night-label">{timeLabel(steps)}</p>
          <p className="text-xs" aria-live="polite">
            {saving ? (
              <span className="text-[var(--muted)]">Saving...</span>
            ) : saveError ? (
              <span className="text-amber-400">{saveError}</span>
            ) : (
              <span className="text-[var(--muted)]">All changes saved</span>
            )}
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {progressLabel(current, steps.length)}
        </p>

        <div className="av-step night-card mt-4 p-5 md:p-8">{children}</div>

        <JourneyFooter />
      </div>
    </div>
  );
}
