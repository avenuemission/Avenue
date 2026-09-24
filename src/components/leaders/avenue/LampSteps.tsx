"use client";

import Glow from "./Glow";
import StepDot from "./StepDot";
import { DOT_SR_TEXT, type DotStatus } from "@/lib/domain/stepStatus";

export interface LampStep {
  id: string;
  label: string;
  status: DotStatus;
}

export interface LampStepsProps {
  steps: LampStep[];
  currentIndex: number | null;
  onSelect?: (index: number) => void; // omit for a display-only row
  label: string; // accessible name for the whole row
  dense?: boolean; // six narrow lamps for the Arena months
}

// A row of step dots (round 3 spec 4), one per step, wrapping on phones:
// off, in progress (pulsing) or done (lit). The step you are on is shown by
// its label only, bright and underlined. With onSelect each step is a
// button that jumps to it. A dot that turns done glows once.
export default function LampSteps({ steps, currentIndex, onSelect, label, dense = false }: LampStepsProps) {
  return (
    <ol className={`av-lamps ${dense ? "av-lamps-dense" : ""}`} aria-label={label}>
      {steps.map((step, i) => {
        const current = i === currentIndex;
        const cls = `av-lamp is-${step.status} ${current ? "is-current" : ""}`;
        const inner = (
          <>
            <Glow trigger={step.status === "done" ? "lit" : null}>
              <StepDot status={step.status} />
            </Glow>
            <span className="av-lamp-label">{step.label}</span>
            <span className="sr-only">
              {DOT_SR_TEXT[step.status]}
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
