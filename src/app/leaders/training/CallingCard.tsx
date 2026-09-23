"use client";

import Link from "next/link";

export interface CallingCardProps {
  completed: number;
  loaded: boolean;
  error: string | null;
}

// Phase 2's hub card (spec 4.3): replaces the module grid. Sections
// complete out of 6, and the two ways in: resume the wizard, or view the
// printable profile.
export default function CallingCard({ completed, loaded, error }: CallingCardProps) {
  const total = 6;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="panel p-6 space-y-4">
      <p className="eyebrow">Calling</p>
      <h3 className="text-xl font-semibold text-white">Six sections, about 37 minutes</h3>

      {!loaded ? (
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">{completed} of 6 sections complete</p>
      )}

      <div className="h-1 w-full rounded-full border border-[var(--border)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${loaded && !error ? percent : 0}%` }} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/leaders/training/calling"
          className="min-h-[44px] inline-flex items-center justify-center px-5 rounded-full bg-[var(--accent)] text-white text-sm font-semibold"
        >
          {completed === 0 ? "Start Calling" : "Continue Calling"}
        </Link>
        <Link
          href="/leaders/training/calling/profile"
          className="min-h-[44px] inline-flex items-center justify-center px-5 rounded-full border border-[var(--border)] text-white text-sm font-semibold"
        >
          View my Calling Profile
        </Link>
      </div>
    </div>
  );
}
