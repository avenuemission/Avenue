"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { progressLabel, timeLabel, type WizardStepMeta } from "@/lib/wizard";

// Each step component receives its own saved section and two callbacks.
export interface StepProps<T> {
  value: T | undefined; // this step's saved section
  save: (value: T) => void; // saveSection for this step's section
  finish: () => void; // flush this section, then go to the next step
}

export interface WizardShellProps {
  eyebrow: string; // "Calling" or "Launch"
  title: string; // "Discover your calling" or "Plan your launch"
  steps: WizardStepMeta[];
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

// Layout for the Calling and Launch wizards. The page owns navigation and
// data; the shell only draws progress, the step list and the save state.
export default function WizardShell(props: WizardShellProps) {
  const { eyebrow, title, steps, current, onSelect, saving, saveError, children } = props;
  const [listOpen, setListOpen] = useState(false);

  const completeCount = steps.filter((s) => s.complete).length;
  const percent = steps.length === 0 ? 0 : (completeCount / steps.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/leaders/training"
        className="no-print min-h-[44px] inline-flex items-center text-sm text-[var(--muted)] hover:text-white"
      >
        Back to your journey
      </Link>

      <p className="eyebrow mt-4">{eyebrow}</p>
      <h1 className="text-3xl md:text-4xl font-semibold text-white mt-2">{title}</h1>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tracking-[0.2em] text-[var(--muted)]">
            <span>{progressLabel(current, steps.length)}</span>
            <span>{timeLabel(steps)}</span>
          </div>
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
        <div className="mt-2 h-1 w-full rounded-full bg-[var(--border)] overflow-hidden">
          <div className="h-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-4 no-print">
        <button
          type="button"
          aria-expanded={listOpen}
          onClick={() => setListOpen((open) => !open)}
          className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-sm font-semibold text-white"
        >
          {listOpen ? "Hide steps" : "All steps"}
        </button>
        {listOpen ? (
          <ol className="mt-3 space-y-2">
            {steps.map((step, i) => {
              const isCurrent = i === current;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "step" : undefined}
                    onClick={() => {
                      onSelect(i);
                      setListOpen(false);
                    }}
                    className={`min-h-[44px] w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg border ${
                      isCurrent ? "border-[var(--accent)]" : "border-[var(--border)]"
                    }`}
                  >
                    {step.complete ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--accent)]" aria-label="Complete" />
                    ) : (
                      <span className="h-6 w-6 shrink-0 rounded-full border border-[var(--border)] text-xs text-[var(--muted)] inline-flex items-center justify-center">
                        {i + 1}
                      </span>
                    )}
                    <span className="flex-1 text-sm text-white">{step.title}</span>
                    <span className="text-xs text-[var(--muted)]">~{step.minutes} min</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <div className="panel p-5 md:p-8 mt-4">{children}</div>
    </div>
  );
}
