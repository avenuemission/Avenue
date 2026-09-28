"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface ExpanderProps {
  id: string;
  title: string;
  intro?: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

// A button row that opens a section in place (round 2 spec 3 and 5): a bold
// uppercase heading, an optional one-line intro, and, only while closed, a one-line
// summary. 44 px or taller, aria-expanded, a hairline above. The chevron
// turns without animating under reduced motion. The heading button holds
// only the title and chevron, so its accessible name stays short; the
// intro and summary sit below it and are read as its description
// (pre-flight F12).
export default function Expander({ id, title, intro, summary, open, onToggle, children }: ExpanderProps) {
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  const introId = `${id}-intro`;
  const summaryId = `${id}-summary`;
  const showSummary = !open && !!summary;
  const describedBy = [intro ? introId : null, showSummary ? summaryId : null].filter(Boolean).join(" ") || undefined;
  return (
    <section className="border-t border-[var(--line)]">
      <h3 className="m-0">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-describedby={describedBy}
          onClick={onToggle}
          className="flex min-h-[44px] w-full items-center gap-4 pt-5 pb-1 text-left"
        >
          <span className="min-w-0 flex-1 font-sans font-bold uppercase tracking-tight text-xl leading-tight md:text-2xl text-[var(--ink)]">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 flex-shrink-0 text-[var(--muted)] motion-safe:transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      <div className="pb-5">
        {intro ? (
          <p id={introId} className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {intro}
          </p>
        ) : null}
        {showSummary ? (
          <p id={summaryId} className="mt-2 text-sm tabular-nums text-[var(--ink-2)]">
            {summary}
          </p>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="pb-10">
          {children}
        </div>
      ) : null}
    </section>
  );
}
