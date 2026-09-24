"use client";

import { useState, type ReactNode } from "react";
import { shouldGlow, type GlowTrigger } from "@/lib/domain/moments";

export interface GlowProps {
  trigger: GlowTrigger;
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
}

// The gentle version of a moment (spec 2): a 600 ms warm pulse on the thing
// that just changed. Pass trigger "lit" or null for a lamp, or a count that
// glows when it goes up. Never glows on first render. Alternating two
// identical animations restarts the pulse without remounting the children,
// so an input inside keeps its focus.
export default function Glow({ trigger, children, className = "inline-block rounded-full", as = "span" }: GlowProps) {
  const [last, setLast] = useState<GlowTrigger>(trigger);
  const [pulses, setPulses] = useState(0);

  if (!Object.is(last, trigger)) {
    setLast(trigger);
    if (shouldGlow(last, trigger)) setPulses((n) => n + 1);
  }

  const pulse = pulses === 0 ? "" : pulses % 2 === 1 ? "av-glow-a" : "av-glow-b";
  const Tag = as;
  return <Tag className={`${className} ${pulse}`}>{children}</Tag>;
}
