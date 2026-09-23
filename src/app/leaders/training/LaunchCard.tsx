"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LampSteps from "@/components/avenue/LampSteps";
import { LAUNCH_LAMP_LABELS } from "@/lib/avenue";
import { LAUNCH_STEP_IDS, LAUNCH_TOTAL, launchStepComplete, type LaunchData } from "@/lib/journey";

export interface LaunchCardProps {
  data: Partial<LaunchData>;
  loaded: boolean;
  error: string | null;
}

// Phase 3 on the hub (spec 4.1): a lamp per planning step (tap one to open
// that step), the count, and the two ways in: the wizard and the Launch Plan.
export default function LaunchCard({ data, loaded, error }: LaunchCardProps) {
  const router = useRouter();
  const ok = loaded && !error;
  const lamps = LAUNCH_STEP_IDS.map((id) => ({
    id,
    label: LAUNCH_LAMP_LABELS[id],
    done: ok && launchStepComplete(id, data),
  }));
  const completed = lamps.filter((l) => l.done).length;
  const firstOpen = lamps.findIndex((l) => !l.done);

  return (
    <div className="space-y-6">
      <p className="font-serif text-2xl text-[var(--ink)]">Seven steps, then your plan</p>
      {!loaded ? (
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          {completed} of {LAUNCH_TOTAL} steps complete
        </p>
      )}
      {/* Only once loaded (F4), so no lamp glows on page load. */}
      {ok ? (
        <LampSteps
          steps={lamps}
          currentIndex={firstOpen >= 0 ? firstOpen : null}
          onSelect={(i) => router.push(`/leaders/training/launch?step=${i + 1}`)}
          label={`Launch: ${completed} of ${LAUNCH_TOTAL} steps complete`}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/leaders/training/launch"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          {completed === 0 ? "Start Launch" : "Continue Launch"}
        </Link>
        <Link
          href="/leaders/training/launch/plan"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)]"
        >
          View my Launch Plan
        </Link>
      </div>
    </div>
  );
}
