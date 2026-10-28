import { Fragment } from "react";
import type { Metadata } from "next";
import { CalendarDays, Clock, MapPin, Sparkles } from "lucide-react";
import { ONRAMP } from "@/content/onramp";
import { pageMetadata } from "@/lib/domain/pageMeta";
import OnrampForm from "./_components/OnrampForm";

// /onramp: sign-up for the Avenue On-Ramp leadership training day. People
// reach it by scanning a QR code off the screen at church, so it is built
// phone first: a short header, then the form, with nothing to scroll past.
// Event details live in src/content/onramp.ts (change VENUE there).

export const metadata: Metadata = pageMetadata("/onramp");

const DETAILS = [
  { icon: CalendarDays, text: ONRAMP.date },
  { icon: Clock, text: ONRAMP.time },
  { icon: MapPin, text: ONRAMP.venue },
  { icon: Sparkles, text: ONRAMP.note },
];

export default function OnrampPage() {
  return (
    <div className="avenue-night">
      <div className="mx-auto max-w-xl px-5 pb-16 pt-8 sm:pt-14">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--lamp)]">{ONRAMP.kind}</p>
          <h1 className="mt-2 text-[clamp(38px,11vw,60px)] font-bold uppercase leading-[0.95] tracking-tight text-white">
            {/* Words wrap between, never inside, so "On-Ramp" never splits at its hyphen. */}
            {ONRAMP.title.split(" ").map((word, i) => (
              <Fragment key={word}>
                {i > 0 && " "}
                <span className="whitespace-nowrap">{word}</span>
              </Fragment>
            ))}
          </h1>
          <p className="mt-3 text-lg text-[var(--ink-2)] sm:text-xl">{ONRAMP.tagline}</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[var(--ink-2)]">
            {DETAILS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 flex-none text-[var(--lamp)]" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </header>

        <div className="mt-8">
          <OnrampForm />
        </div>
      </div>
    </div>
  );
}
