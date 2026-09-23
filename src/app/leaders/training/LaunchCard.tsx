"use client";

import Link from "next/link";
import { LAUNCH_TOTAL } from "@/lib/journey";

export interface LaunchCardProps {
  completed: number;
  loaded: boolean;
  error: string | null;
}

// Phase 3's hub card (spec 5.3): replaces the module grid. Steps complete
// out of LAUNCH_TOTAL, and the two ways in: resume the wizard, or view the
// printable plan.
export default function LaunchCard({ completed, loaded, error }: LaunchCardProps) {
  const total = LAUNCH_TOTAL;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="panel p-6 space-y-4">
      <p className="eyebrow">Launch</p>
      <h3 className="text-xl font-semibold text-white">Seven steps, then your plan</h3>

      {!loaded ? (
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">{completed} of {total} steps complete</p>
      )}

      <div className="h-1 w-full rounded-full border border-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${loaded && !error ? percent : 0}%` }} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/leaders/training/launch"
          className="min-h-[44px] inline-flex items-center justify-center px-5 rounded-full bg-[var(--accent)] text-white text-sm font-semibold"
        >
          {completed === 0 ? "Start Launch" : "Continue Launch"}
        </Link>
        <Link
          href="/leaders/training/launch/plan"
          className="min-h-[44px] inline-flex items-center justify-center px-5 rounded-full border border-[var(--border)] text-white text-sm font-semibold"
        >
          View my Launch Plan
        </Link>
      </div>
    </div>
  );
}
