import type { CSSProperties } from "react";
import type { Gauge } from "@/lib/rpms";

export interface RpmsSliderProps {
  gauge: Gauge;
  value: number;
  onChange: (next: number) => void;
}

// One gauge of the weekly check-in (round 2 spec 3.1): a native range, 1 to
// 10, step 1, so arrow keys, Home and End work. The value is shown large in
// the gauge's colour, with the gauge's one-line meaning under the label.
export default function RpmsSlider({ gauge, value, onChange }: RpmsSliderProps) {
  const inputId = `rpms-${gauge.key}`;
  const meaningId = `${inputId}-meaning`;
  const style = { "--g": gauge.colour, "--p": ((value - 1) / 9) * 100 } as CSSProperties;
  return (
    <div style={style}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-semibold text-[var(--ink)]">
          {gauge.label}
        </label>
        <output htmlFor={inputId} className="font-serif text-3xl leading-none tabular-nums" style={{ color: gauge.colour }}>
          {value}
        </output>
      </div>
      <p id={meaningId} className="mt-1 text-xs text-[var(--muted)]">
        {gauge.meaning}
      </p>
      <div className="av-range mt-1">
        <span className="av-range-track" aria-hidden="true">
          <span className="av-range-fill" />
        </span>
        <input
          id={inputId}
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={meaningId}
          aria-valuetext={`${value} out of 10`}
          className="av-range-input"
        />
      </div>
    </div>
  );
}
