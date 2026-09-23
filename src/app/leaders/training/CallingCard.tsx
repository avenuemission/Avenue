"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LampSteps from "@/components/avenue/LampSteps";
import { CALLING_LAMP_LABELS } from "@/lib/avenue";
import { CALLING_SECTION_IDS, CALLING_TOTAL, callingSectionComplete, type CallingData } from "@/lib/journey";

export interface CallingCardProps {
  data: Partial<CallingData>;
  loaded: boolean;
  error: string | null;
}

// Phase 2 on the hub (spec 4.1): one "continue" block on the night ground.
// A lamp per section (tap one to open that section), the count, and the two
// ways in: the wizard and the Calling Profile.
export default function CallingCard({ data, loaded, error }: CallingCardProps) {
  const router = useRouter();
  const ok = loaded && !error;
  const lamps = CALLING_SECTION_IDS.map((id) => ({
    id,
    label: CALLING_LAMP_LABELS[id],
    done: ok && callingSectionComplete(id, data),
  }));
  const completed = lamps.filter((l) => l.done).length;
  const firstOpen = lamps.findIndex((l) => !l.done);

  return (
    <div className="space-y-6">
      <p className="font-serif text-2xl text-[var(--ink)]">Six sections, about 37 minutes</p>
      {!loaded ? (
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          {completed} of {CALLING_TOTAL} sections complete
        </p>
      )}
      {/* Only once loaded (F4): the lamps' first render is already the real
          state, so Glow never pulses on page load. */}
      {ok ? (
        <LampSteps
          steps={lamps}
          currentIndex={firstOpen >= 0 ? firstOpen : null}
          onSelect={(i) => router.push(`/leaders/training/calling?step=${i + 1}`)}
          label={`Calling: ${completed} of ${CALLING_TOTAL} sections complete`}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/leaders/training/calling"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          {completed === 0 ? "Start Calling" : "Continue Calling"}
        </Link>
        <Link
          href="/leaders/training/calling/profile"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)]"
        >
          View my Calling Profile
        </Link>
      </div>
    </div>
  );
}
