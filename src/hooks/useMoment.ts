"use client";

import { useState } from "react";
import {
  advanceFlags,
  flagsSignature,
  momentCopy,
  pickMoment,
  type Flags,
  type MomentCopy,
  type MomentKey,
} from "@/lib/domain/moments";

export interface ActiveMoment extends MomentCopy {
  key: MomentKey;
  n: number; // bumps on every new moment so the card replays
}

// Watches milestone flags and returns the moment to play when one has just
// turned true. Pass only flags whose data has loaded; see advanceFlags.
export function useMoment(flags: Flags, launchDate?: string): { moment: ActiveMoment | null; dismiss: () => void } {
  const sig = flagsSignature(flags);
  const [today] = useState(() => new Date());
  const [tracked, setTracked] = useState<{ sig: string | null; seen: Flags | null }>({ sig: null, seen: null });
  const [moment, setMoment] = useState<ActiveMoment | null>(null);

  if (tracked.sig !== sig) {
    const { seen, fired } = advanceFlags(tracked.seen, flags);
    setTracked({ sig, seen });
    const key = pickMoment(fired);
    if (key) setMoment({ key, n: (moment?.n ?? 0) + 1, ...momentCopy(key, { today, launchDate }) });
  }

  return { moment, dismiss: () => setMoment(null) };
}
