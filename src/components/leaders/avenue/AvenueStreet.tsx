"use client";

import Link from "next/link";
import { STATUS_LABEL, type AvenueStop, type HereAction, type StopId } from "@/lib/domain/avenue";

export interface AvenueStreetProps {
  stops: AvenueStop[];
  selectedId: StopId | null;
  onSelect: (id: StopId) => void;
  hereAction: HereAction | null;
  onAction?: () => void;
}

// The phone street (spec 2, mockup section 3): one street running down the
// screen, lit in lamp light from each walked stop to the next. The stop the
// leader is at opens in place with its one next action. Every stop name is
// a button that opens that phase.
export default function AvenueStreet({ stops, selectedId, onSelect, hereAction, onAction }: AvenueStreetProps) {
  return (
    <ol className="relative mt-2" aria-label="Your journey">
      {stops.map((stop, i) => {
        const last = i === stops.length - 1;
        const ongoing = stop.status === "ongoing";
        const walked = stop.status === "walked" || ongoing; // lit either way
        const here = stop.status === "here";
        const selected = selectedId === stop.id;
        return (
          <li key={stop.id} className="relative pb-6 pl-10">
            {!last ? (
              <span
                aria-hidden="true"
                className={`absolute left-[11px] top-[13px] -bottom-[13px] w-[2px] ${
                  walked ? "bg-[var(--lamp)]" : "bg-[var(--line-2)]"
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`absolute left-[5px] top-[6px] h-[14px] w-[14px] rounded-full ${ongoing ? "av-breathe-light" : ""} ${
                walked
                  ? "bg-[var(--lamp)] shadow-[0_0_16px_4px_rgba(255,197,107,0.5)]"
                  : here
                    ? "border-2 border-[var(--accent)] bg-[var(--night-2)] shadow-[0_0_0_5px_var(--accent-soft)]"
                    : "border border-[var(--line-2)] bg-[#131926]"
              }`}
            />
            <button
              type="button"
              onClick={() => onSelect(stop.id)}
              aria-current={selected ? "true" : undefined}
              className="block min-h-[44px] w-full text-left"
            >
              <span
                className={`block font-sans font-bold uppercase tracking-tight text-xl leading-tight ${
                  stop.status === "ahead" ? "text-[var(--dim)]" : "text-[var(--ink)]"
                } ${selected ? "underline decoration-[var(--line-2)] underline-offset-8" : ""}`}
              >
                {stop.name}
              </span>
              <span className={`mt-0.5 block text-[12.5px] ${here ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {STATUS_LABEL[stop.status]}
              </span>
            </button>
            {here && hereAction ? (
              <div className="mt-3 rounded-[14px] border border-[var(--line-2)] p-4">
                <p className="mb-3 text-[13.5px] text-[var(--ink-2)]">{hereAction.text}</p>
                <Link
                  href={hereAction.href}
                  onClick={onAction}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
                >
                  {hereAction.label}
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
