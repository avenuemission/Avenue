"use client";

import type { ReactNode } from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { nextMelbourneWeekly } from "@/lib/domain/dates/melbourne";

const WEDNESDAY = 3;

// The navbar counts down to the next Prayer & Praise: Wednesday, 7 pm in
// Melbourne, moving on to the next week as each one starts.
const nextPrayerAndPraise = (now: Date) => nextMelbourneWeekly(now, WEDNESDAY, 19);

interface CountdownTimerProps {
  variant?: "navbar" | "event";
  target?: Date | ((now: Date) => Date);
  /** Shown until the clock is read in the browser. */
  placeholder?: ReactNode;
}

const pad = (num: number) => num.toString().padStart(2, "0");

export default function CountdownTimer({ variant = "navbar", target = nextPrayerAndPraise, placeholder = null }: CountdownTimerProps) {
  const timeLeft = useCountdown(target);
  if (!timeLeft) return placeholder;

  if (variant === "navbar") {
    return (
      <div className="flex items-center bg-blue-900/80 rounded-full px-4 py-2 space-x-3">
        <span className="text-xs font-medium text-white uppercase tracking-wider">
          Next Intersection
        </span>
        <span className="text-sm font-mono text-white">
          {pad(timeLeft.days)}:{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:
          {pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-purple-500">
        {pad(timeLeft.days)} DAYS
      </div>
      <div className="text-2xl font-bold text-purple-500">
        {pad(timeLeft.hours)} HOURS
      </div>
      <div className="text-2xl font-bold text-purple-500">
        {pad(timeLeft.minutes)} MINS
      </div>
      <div className="text-2xl font-bold text-purple-500">
        {pad(timeLeft.seconds)} SECONDS
      </div>
    </div>
  );
}
