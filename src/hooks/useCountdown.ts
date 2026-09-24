"use client";

import { useSyncExternalStore } from "react";
import { timeLeftUntil, type TimeLeft } from "@/lib/domain/dates/countdown";

// One clock for every countdown on the page: a tick each second.
function subscribe(onTick: () => void): () => void {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const beforeHydration = () => null;

// Time left until `target`, re-rendering each second. `target` may be a
// function of now, for a target that moves on once it passes (the next
// weekly gathering). Null on the server and during hydration, so the
// server HTML never carries a clock reading.
export function useCountdown(target: Date | ((now: Date) => Date)): TimeLeft | null {
  const seconds = useSyncExternalStore(subscribe, nowSeconds, beforeHydration);
  if (seconds === null) return null;
  const now = new Date(seconds * 1000);
  return timeLeftUntil(typeof target === "function" ? target(now) : target, now);
}
