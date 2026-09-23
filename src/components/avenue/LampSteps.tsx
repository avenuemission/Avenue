"use client";

import Glow from "./Glow";

export interface LampStep {
  id: string;
  label: string;
  done: boolean;
}

export interface LampStepsProps {
  steps: LampStep[];
  currentIndex: number | null;
  onSelect?: (index: number) => void; // omit for a display-only row
  label: string; // accessible name for the whole row
  dense?: boolean; // six narrow lamps for the Arena months
}

// A row of small lamps, one per step (spec 2): lit when complete, a blue ring
// on the current one, wrapping on phones. With onSelect each lamp is a
// button that jumps to its step. A lamp that lights glows once.
export default function LampSteps({ steps, currentIndex, onSelect, label, dense = false }: LampStepsProps) {
  return (
    <ol className={`av-lamps ${dense ? "av-lamps-dense" : ""}`} aria-label={label}>
      {steps.map((step, i) => {
        const current = i === currentIndex;
        const cls = `av-lamp ${step.done ? "is-lit" : ""} ${current ? "is-current" : ""}`;
        const inner = (
          <>
            <Glow trigger={step.done ? "lit" : null}>
              <span className="av-lamp-glass" aria-hidden="true" />
            </Glow>
            <span className="av-lamp-post" aria-hidden="true" />
            <span className="av-lamp-label">{step.label}</span>
            <span className="sr-only">
              {step.done ? ", done" : ", not done yet"}
              {current ? ", current step" : ""}
            </span>
          </>
        );
        return (
          <li key={step.id}>
            {onSelect ? (
              <button
                type="button"
                className={cls}
                onClick={() => onSelect(i)}
                aria-current={current ? "step" : undefined}
              >
                {inner}
              </button>
            ) : (
              <span className={cls}>{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
