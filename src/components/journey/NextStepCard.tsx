"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { leaderFetch } from "@/lib/leaderFetch";
import { useWorksheet } from "@/lib/useWorksheet";
import { callingCompleteCount, launchCompleteCount, type CallingData, type LaunchData } from "@/lib/journey";
import { reconcilePhases } from "@/app/leaders/training/progressMerge";
import { mondayOf } from "@/lib/weeks";
import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { nextStep } from "@/lib/nextStep";
import { avenueStops, type AvenueProgress } from "@/lib/avenue";
import AvenueMap from "@/components/avenue/AvenueMap";

export interface NextStepCardProps {
  enabled: boolean;
  apprenticesOnRung: number | null; // from the dashboard's network read; null while loading
  networkFailed: boolean;
}

// The dashboard's journey (spec 4.4): a compact avenue showing where the
// leader is, then "Your next step" as the one lit card on the page. The
// next step is the first unfinished thing among Foundations, Calling,
// Launch and this week's check-in. Full access only; the caller gates it.
export default function NextStepCard({ enabled, apprenticesOnRung, networkFailed }: NextStepCardProps) {
  const router = useRouter();
  const calling = useWorksheet<CallingData>("calling", enabled);
  const launch = useWorksheet<LaunchData>("launch", enabled);

  const [foundations, setFoundations] = useState<{ done: number; total: number } | null>(null);
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null);
  const [checkinCount, setCheckinCount] = useState<number | null>(null);
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
        const list: CheckinEntry[] = data.checkins ?? [];
        const thisWeek = mondayOf(new Date());
        setCheckedIn(list.some((c) => c.weekStart === thisWeek));
        setCheckinCount(list.length);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const ready =
    calling.loaded &&
    launch.loaded &&
    foundations !== null &&
    checkedIn !== null &&
    checkinCount !== null &&
    (apprenticesOnRung !== null || networkFailed);
  const failed = Boolean(calling.error || launch.error || loadError);

  if (!ready && !failed) return null;

  if (failed) {
    return (
      <div className="night-card p-5">
        <p className="text-sm text-[var(--muted)]">Could not work out your next step.</p>
      </div>
    );
  }

  const callingDone = callingCompleteCount(calling.data as CallingData);
  const launchDone = launchCompleteCount(launch.data as LaunchData);
  const step = nextStep({
    foundationsDone: foundations!.done,
    foundationsTotal: foundations!.total,
    callingDone,
    launchDone,
    checkedInThisWeek: checkedIn === true,
  });
  const progress: AvenueProgress = {
    foundationsDone: foundations!.done,
    foundationsTotal: foundations!.total,
    callingDone,
    launchDone,
    checkinCount: checkinCount!,
    apprenticesOnRung: apprenticesOnRung ?? 0,
  };

  return (
    <div className="space-y-6">
      <AvenueMap
        compact
        stops={avenueStops(progress)}
        selectedId={null}
        onSelect={(id) => router.push(`/leaders/training?phase=${id}`)}
        hereAction={null}
      />
      {networkFailed ? (
        <p className="text-xs text-amber-400">We couldn&rsquo;t load your network, so Multiply may show as ahead.</p>
      ) : null}
      <div className="night-card-lit p-6">
        <span className="eyebrow">Your next step</span>
        <h2 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)]">{step.title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>
        <Link
          href={step.href}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          {step.button}
        </Link>
      </div>
    </div>
  );
}
