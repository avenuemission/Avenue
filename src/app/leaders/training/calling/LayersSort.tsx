"use client";

import { useState } from "react";
import type { StepProps } from "@/components/journey/WizardShell";
import { OutcomeButton } from "@/components/journey/WizardShell";
import { layersScore, type CallingData, type Layer } from "@/lib/journey";
import { LAYER_KEY, LAYER_LABELS, LAYER_STATEMENTS } from "./content";

const LAYER_ORDER: Layer[] = ["shared", "specific", "seasonal"];

// Section 1: sort nine statements into the Shared, Specific and Seasonal
// layers. Tap a statement, then tap its layer.
export default function LayersSort({ value, save, finish }: StepProps<NonNullable<CallingData["layers"]>>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastFeedbackId, setLastFeedbackId] = useState<string | null>(null);

  const placements = value?.placements ?? {};
  // Saved data arrives as JSON, so only a known layer counts as placed.
  const placedLayer = (id: string): Layer | undefined => {
    const layer = placements[id];
    return LAYER_ORDER.includes(layer) ? layer : undefined;
  };
  const placed = LAYER_STATEMENTS.filter((s) => placedLayer(s.id) !== undefined).length;
  const score = layersScore(placements, LAYER_KEY);

  const place = (id: string, layer: Layer) => {
    save({ placements: { ...value?.placements, [id]: layer } });
    setLastFeedbackId(id);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {LAYER_ORDER.map((layer) => {
          const label = LAYER_LABELS[layer];
          return (
            <div key={layer} className="rounded-lg border border-[var(--border)] p-3">
              <p className="font-semibold text-white">{label.name}</p>
              <p className="eyebrow mt-1">{label.kind}</p>
              <p className="mt-2 text-sm text-gray-300 leading-relaxed">{label.line}</p>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-gray-300">Tap a statement, then tap the layer it belongs to.</p>

      <ul className="space-y-2">
        {LAYER_STATEMENTS.map((statement) => {
          const chosen = placedLayer(statement.id);
          const isSelected = selectedId === statement.id;
          const showFeedback = lastFeedbackId === statement.id && chosen !== undefined && !isSelected;
          const correct = LAYER_KEY[statement.id];
          return (
            <li key={statement.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : statement.id)}
                className={`min-h-[44px] w-full text-left px-3 py-2 rounded-lg border flex items-start justify-between gap-3 ${
                  isSelected ? "border-[var(--accent)]" : "border-[var(--border)]"
                }`}
              >
                <span className="text-sm text-white">{statement.text}</span>
                {chosen ? (
                  <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {LAYER_LABELS[chosen].name}
                  </span>
                ) : null}
              </button>

              {isSelected ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {LAYER_ORDER.map((layer) => (
                    <button
                      key={layer}
                      type="button"
                      onClick={() => place(statement.id, layer)}
                      className={`min-h-[44px] rounded-full border text-sm font-semibold text-white ${
                        chosen === layer ? "border-[var(--accent)]" : "border-[var(--border)]"
                      }`}
                    >
                      {LAYER_LABELS[layer].name}
                    </button>
                  ))}
                </div>
              ) : null}

              {showFeedback ? (
                chosen === correct ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--accent)]" aria-live="polite">
                    Yes. {statement.reason}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-amber-400" aria-live="polite">
                    Not quite: this one is {LAYER_LABELS[correct].name} ({LAYER_LABELS[correct].kind}). {statement.reason}
                  </p>
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-[var(--muted)]">
        {placed} of 9 placed · {score} in the right layer
      </p>

      <OutcomeButton
        label="Lock in my three layers"
        onClick={finish}
        disabled={placed < 9}
        hint="Place all nine statements to continue."
      />
    </div>
  );
}
