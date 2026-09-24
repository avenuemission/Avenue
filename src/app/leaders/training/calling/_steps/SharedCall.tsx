"use client";

import type { StepProps } from "@/components/leaders/journey/WizardShell";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import { isIsoDate, type CallingData } from "@/lib/domain/journey";
import { SHARED_SCENARIO } from "@/content/calling";
import { formatLong } from "@/lib/domain/dates/format";

type Shared = NonNullable<CallingData["shared"]>;

// Today as YYYY-MM-DD in the leader's own time zone.
function todayLocal(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

// Section 3: a short scenario about inviting people into your life, then
// saying yes to the Shared Call.
export default function SharedCall({ value, save, finish }: StepProps<Shared>) {
  const chosen = SHARED_SCENARIO.choices.find((c) => c.value === value?.scenario);
  const saidYes = value?.yes === true;
  const date = value?.date;

  const sayYes = () => {
    save({ ...value, yes: true, date: todayLocal() });
    finish();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{SHARED_SCENARIO.prompt}</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHARED_SCENARIO.choices.map((choice) => {
            const pressed = value?.scenario === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                aria-pressed={pressed}
                onClick={() => save({ ...value, scenario: choice.value })}
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-left text-sm font-semibold text-white ${
                  pressed ? "border-[var(--accent)]" : "border-[var(--border)]"
                }`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        {chosen ? (
          <p className="mt-3 text-sm leading-relaxed text-gray-300" aria-live="polite">
            {chosen.feedback}
          </p>
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">{SHARED_SCENARIO.yesQuestion}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{SHARED_SCENARIO.yesNote}</p>
      </div>

      {saidYes ? (
        <>
          <p className="text-sm text-white">
            {isIsoDate(date) ? `You said yes on ${formatLong(date)}.` : "You said yes."}
          </p>
          <OutcomeButton label="On to the Specific Call" onClick={finish} />
        </>
      ) : (
        <OutcomeButton label="Save my yes" onClick={sayYes} />
      )}
    </div>
  );
}
