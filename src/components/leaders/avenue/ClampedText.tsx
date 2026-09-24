"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ClampedTextProps {
  text: string;
  className?: string;
}

// A phase intro clamped to two lines (round 2 spec 2) with a "Read more" /
// "Show less" button. The button only appears when the text really is cut
// off: a ResizeObserver compares the clamped height with the full height,
// and runs again whenever the width changes (rotating a phone, resizing a
// window). It also measures once the web fonts have loaded: a font swap can
// re-wrap the text without changing the clamped box, which the observer
// would miss (pre-flight F9). While expanded nothing is measured, so
// "Show less" stays put.
export default function ClampedText({ text, className = "" }: ClampedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let cancelled = false;
    const measure = () => {
      if (!cancelled) setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    // ResizeObserver reports once as soon as it starts observing, so the
    // first measurement needs no separate call.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [expanded, text]);

  return (
    <div className={className}>
      <p
        ref={ref}
        id={id}
        className={`max-w-[62ch] text-sm leading-relaxed text-[var(--muted)] ${expanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
