"use client";

import { useId } from "react";

export interface MomentProps {
  title: string;
  caption: string;
  play: boolean;
  playKey?: number; // change to replay the ignite
  onDismiss: () => void;
}

// A milestone (spec 2 and 3): a lamp that ignites over about 1.4 s, a serif
// line and a small caption, in a card fixed to the bottom of the screen so
// it is seen wherever the leader has scrolled. Under reduced motion the CSS
// shows the lit state at once. The live region stays mounted so the text is
// announced when a moment appears.
export default function Moment({ title, caption, play, playKey, onDismiss }: MomentProps) {
  const haloId = `av-moment-halo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm"
    >
      {play ? (
        <div key={playKey} className="av-moment pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <svg viewBox="0 0 120 150" aria-hidden="true" className="h-auto w-[96px]">
            <defs>
              <radialGradient id={haloId}>
                <stop offset="0%" stopColor="#ffdca0" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle className="av-halo" cx="60" cy="34" r="46" fill={`url(#${haloId})`} />
            <rect x="57" y="40" width="6" height="104" fill="#3a4458" />
            <rect className="av-bulbfill" x="40" y="28" width="40" height="13" rx="4" fill="#1a2130" />
          </svg>
          <p className="mt-1 font-serif text-[26px] leading-tight text-[var(--ink)] md:text-[32px]">{title}</p>
          <p className="text-sm text-[var(--muted)]">{caption}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 min-h-[44px] px-4 text-sm font-semibold text-[var(--accent)]"
          >
            Carry on
          </button>
        </div>
      ) : null}
    </div>
  );
}
