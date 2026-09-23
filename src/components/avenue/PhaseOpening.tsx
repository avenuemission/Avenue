import type { ReactNode } from "react";

export interface PhaseOpeningProps {
  stop: number;
  name: string;
  reference: string;
  short: string;
  verse?: string | null;
  size?: "large" | "small";
  headingLevel?: 1 | 2;
  children?: ReactNode;
}

// The opening of a stop (spec 2, mockup section 2): "Stop N of 5 · Ephesians
// 4" with a small lit bulb, the phase name in large serif, the verse in serif
// italic followed by (NLT) and the full reference in mono. With no verse
// text, the reference itself is the headline: never guessed text.
export default function PhaseOpening({
  stop,
  name,
  reference,
  short,
  verse,
  size = "large",
  headingLevel = 2,
  children,
}: PhaseOpeningProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={`av-opening ${size === "small" ? "av-opening-small" : ""}`}>
      <p className="av-stop">
        <span className="av-bulb" aria-hidden="true" />
        Stop {stop} of 5 · {short}
      </p>
      <Heading className="av-phase-title">{name}</Heading>
      {verse ? (
        <>
          <p className="av-verse">
            {verse} <span className="text-sm not-italic text-[var(--muted)]">(NLT)</span>
          </p>
          <p className="av-verse-ref">{reference}</p>
        </>
      ) : (
        <p className="av-verse">{reference}</p>
      )}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
