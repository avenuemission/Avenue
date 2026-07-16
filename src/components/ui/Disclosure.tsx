"use client";

import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DisclosureProps {
  question: string;
  children: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * One accordion row, on a solid panel (no frosted glass). Used for Mission /
 * Vision / Values and the Beliefs list. Accessible: real button, aria-expanded,
 * keyboard focus visible.
 */
export default function Disclosure({ question, children, isExpanded, onToggle }: DisclosureProps) {
  const panelId = useId();

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
      >
        <span className="text-lg md:text-xl font-semibold text-white">{question}</span>
        <ChevronDown
          size={22}
          aria-hidden="true"
          className={`flex-shrink-0 text-[var(--muted)] transition-transform duration-300 ${
            isExpanded ? "rotate-180 text-[var(--accent)]" : ""
          }`}
        />
      </button>
      <div
        id={panelId}
        className={`grid transition-all duration-500 ease-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 text-base md:text-lg leading-relaxed text-[var(--muted)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
