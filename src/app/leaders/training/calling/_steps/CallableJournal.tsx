"use client";

import { useState } from "react";
import type { StepProps } from "@/components/leaders/journey/WizardShell";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import type { CallingData } from "@/lib/domain/journey";
import { JOURNAL_PROMPTS, WILLING_OPTIONS, WILLING_QUESTION } from "@/content/calling";

type Callable = NonNullable<CallingData["callable"]>;
type JournalKey = (typeof JOURNAL_PROMPTS)[number]["key"];

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Section 2: four private journal prompts, then "are you willing and
// available to be called by God?".
export default function CallableJournal({ value, save, finish }: StepProps<Callable>) {
  // Local copy so typing is instant; every change also saves.
  const [answers, setAnswers] = useState<Record<JournalKey, string>>(() => ({
    crowding: text(value?.crowding),
    shadow: text(value?.shadow),
    fear: text(value?.fear),
    ifCalled: text(value?.ifCalled),
  }));

  const onType = (key: JournalKey, next: string) => {
    setAnswers((prev) => ({ ...prev, [key]: next }));
    save({ ...value, [key]: next });
  };

  const willing = WILLING_OPTIONS.find((o) => o.value === value?.willing);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">Private to you. Only you can see these answers.</p>

      {JOURNAL_PROMPTS.map((prompt) => {
        const id = `callable-${prompt.key}`;
        return (
          <div key={prompt.key}>
            <label htmlFor={id} className="block text-sm font-semibold text-white leading-relaxed">
              {prompt.label}
            </label>
            <textarea
              id={id}
              rows={3}
              maxLength={2000}
              value={answers[prompt.key]}
              onChange={(e) => onType(prompt.key, e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base text-white"
            />
          </div>
        );
      })}

      <div>
        <h2 className="text-lg font-semibold text-white">{WILLING_QUESTION}</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {WILLING_OPTIONS.map((option) => {
            const pressed = value?.willing === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={pressed}
                onClick={() => save({ ...value, willing: option.value })}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold text-white ${
                  pressed ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {willing ? (
          <p className="mt-3 text-sm leading-relaxed text-gray-300" aria-live="polite">
            {willing.response}
          </p>
        ) : null}
      </div>

      <OutcomeButton
        label="Save my availability"
        onClick={finish}
        disabled={!willing}
        hint="Answer the question to continue."
      />
    </div>
  );
}
