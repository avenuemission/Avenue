"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { leaderFetch } from "@/lib/leaderFetch";
import { useWorksheet } from "@/lib/useWorksheet";
import { callingCompleteCount, launchCompleteCount, type CallingData, type LaunchData } from "@/lib/journey";
import { reconcilePhases } from "@/app/leaders/training/progressMerge";
import { mondayOf } from "@/lib/weeks";
import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { nextStep } from "@/lib/nextStep";

// The dashboard's "Your next step" card: the first unfinished thing among
// Foundations, Calling, Launch and this week's check-in, with one button.
// Full access only; the caller gates rendering on that.
export default function NextStepCard({ enabled }: { enabled: boolean }) {
  const calling = useWorksheet<CallingData>("calling", enabled);
  const launch = useWorksheet<LaunchData>("launch", enabled);

  const [foundations, setFoundations] = useState<{ done: number; total: number } | null>(null);
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    leaderFetch("/api/leader-training")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        const progress = body.progress ?? {};
        const phases = reconcilePhases(progress.watchedEpisodes ?? [], progress.completedModules ?? []);
        const phase1 = phases.find((p) => p.id === "phase1");
        const done = phase1 ? phase1.modules.filter((m) => m.completed).length : 0;
        const total = phase1 ? phase1.modules.length : 0;
        setFoundations({ done, total });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
      });

    leaderFetch("/api/leader-checkins")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
        return body;
      })
      .then((data) => {
        if (cancelled) return;
        const thisWeek = mondayOf(new Date());
        setCheckedIn((data.checkins ?? []).some((c: CheckinEntry) => c.weekStart === thisWeek));
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const ready = calling.loaded && launch.loaded && foundations !== null && checkedIn !== null;
  const failed = Boolean(calling.error || launch.error || loadError);

  if (!ready && !failed) return null;

  if (failed) {
    return (
      <div className="panel p-5">
        <p className="text-sm text-[var(--muted)]">Could not work out your next step.</p>
      </div>
    );
  }

  const step = nextStep({
    foundationsDone: foundations!.done,
    foundationsTotal: foundations!.total,
    callingDone: callingCompleteCount(calling.data as CallingData),
    launchDone: launchCompleteCount(launch.data as LaunchData),
    checkedInThisWeek: checkedIn === true,
  });

  return (
    <div className="panel p-6">
      <span className="eyebrow">Your next step</span>
      <h2 className="mt-2 text-xl font-semibold text-white">{step.title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>
      <Link
        href={step.href}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {step.button}
      </Link>
    </div>
  );
}
