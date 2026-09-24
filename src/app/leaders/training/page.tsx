"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { recentMondays } from "@/lib/weeks";
import { LogOut, ArrowLeft, X } from "lucide-react";

import Phase4Growth, { CHECKIN_HISTORY_WEEKS } from "./Phase4Growth";
import Phase5Multiply from "./Phase5Multiply";
import PhaseModules from "./PhaseModules";
import CallingCard from "./CallingCard";
import LaunchCard from "./LaunchCard";
import { VERSES } from "./verses";
import { useTrainingProgress } from "./useTrainingProgress";
import { useCheckins } from "./useCheckins";
import { useNetworkView } from "./useNetworkView";
import { useMyPeople } from "@/lib/useMyPeople";
import { useWorksheet } from "@/lib/useWorksheet";
import { leaderFetch } from "@/lib/leaderFetch";
import { callingCompleteCount, launchCompleteCount, type CallingData, type LaunchData } from "@/lib/journey";
import {
  apprenticesOnRung,
  avenueStops,
  greetingFor,
  hereActionFor,
  stopWalked,
  streetStatusLine,
  STOP_IDS,
  type AvenueProgress,
  type StopId,
} from "@/lib/avenue";
import AvenueMap from "@/components/avenue/AvenueMap";
import PhaseOpening from "@/components/avenue/PhaseOpening";
import ClampedText from "@/components/avenue/ClampedText";
import HeaderAvatar from "@/components/avenue/HeaderAvatar";
import JourneyFooter from "@/components/avenue/JourneyFooter";
import Moment from "@/components/avenue/Moment";
import { useMoment } from "@/components/avenue/useMoment";

function isStopId(value: string | null): value is StopId {
  return value !== null && (STOP_IDS as readonly string[]).includes(value);
}

export default function TrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  // null means "not chosen": the hub then opens the stop the leader is at.
  const [expandedPhase, setExpandedPhase] = useState<StopId | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("phase");
    return isStopId(p) ? p : null;
  });
  // The stop opened when none was chosen: the "here" stop, set once (F3).
  const [defaultPhase, setDefaultPhase] = useState<StopId | null>(null);
  const [videoModal, setVideoModal] = useState<{ youtubeId: string; title: string } | null>(null);
  const [greetingTime] = useState(() => new Date());

  const {
    phases,
    progressLoaded,
    loadError,
    saving,
    saveError,
    conflictNotice,
    toggleModuleComplete,
    toggleEpisodeWatched,
  } = useTrainingProgress(user, accessChecked, hasAccess);
  const {
    checkins,
    checkinsLoaded,
    setCheckinsLoaded,
    checkinLoadError,
    setCheckinLoadAttempt,
    checkinForm,
    setCheckinForm,
    checkinSaving,
    checkinSaveError,
    checkinSaved,
    editingWeekStart,
    saveCheckin,
  } = useCheckins(user, accessChecked, hasAccess);
  const {
    networkPeople,
    networkViewerId,
    networkDepth,
    networkLoaded,
    networkError,
    stepUpdatingId,
    stepError,
    setApprenticeStep,
    addPerson,
    addingPerson,
  } = useNetworkView(user, accessChecked, hasAccess);
  const ready = accessChecked && hasAccess && !!user;
  const { people, peopleLoaded, peopleError, upsertPerson, patchPerson, ensurePersonForNetwork, icnuDrafts } =
    useMyPeople(ready);
  const calling = useWorksheet<CallingData>("calling", ready);
  const launch = useWorksheet<LaunchData>("launch", ready);
  const callingDone = callingCompleteCount(calling.data);
  const launchDone = launchCompleteCount(launch.data);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
      leaderFetch("/api/leader-access")
        .then((res) => res.json())
        .then((data) => {
          setHasAccess(data.full_access === true);
          setAccessChecked(true);
          if (!data.full_access) {
            router.push("/leaders");
          }
        })
        .catch(() => {
          setAccessChecked(true);
          router.push("/leaders");
        });
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const openVideo = (youtubeId: string, title: string) => {
    setVideoModal({ youtubeId, title });
  };

  const closeVideo = () => {
    setVideoModal(null);
  };

  // Phase 5's own content below. The map's Multiply count uses
  // apprenticesOnRung (avenue.ts), the one definition shared with the dashboard.
  const sentByViewer = networkPeople.filter((p) => p.sentOutBy === networkViewerId);

  // The avenue (spec 2.1): which stops are walked, and where the leader is.
  const foundations = phases.find((p) => p.id === "phase1");
  const avenueProgress: AvenueProgress = {
    foundationsDone: foundations ? foundations.modules.filter((m) => m.completed).length : 0,
    foundationsTotal: foundations ? foundations.modules.length : 0,
    callingDone,
    launchDone,
    checkinCount: checkins.length,
    apprenticesOnRung: apprenticesOnRung(networkPeople, networkViewerId),
  };
  // The map, the status line and the default stop wait for every read the
  // stops depend on (F3). Without this they would first show Calling or
  // Launch as unwalked, then jump once the worksheets arrived. A failed read
  // still counts as loaded, so an error never leaves the page waiting.
  const journeyLoaded = calling.loaded && launch.loaded && checkinsLoaded && networkLoaded;
  const stops = avenueStops(avenueProgress);
  const hereStop = stops.find((s) => s.status === "here") ?? null;
  const hereAction = hereStop ? hereActionFor(hereStop.id, avenueProgress) : null;
  // Latched the first time everything has loaded (adjusted during render,
  // like useMoment). Latching keeps the open stop still when a later reload
  // (check-in retry) flips a loaded flag, or when walking a stop moves "here"
  // while its moment plays.
  if (journeyLoaded && defaultPhase === null) setDefaultPhase(hereStop?.id ?? "phase4");
  const journeyReady = defaultPhase !== null;
  const openPhase: StopId | null = expandedPhase ?? defaultPhase;

  // Phase-walked moments that can happen on this page (spec 3): the last
  // Foundations module, the first check-in, the first apprentice on rung 1.
  // A flag is only passed once its data has loaded, so loading never plays one.
  const momentFlags: Record<string, boolean> = {};
  if (progressLoaded) momentFlags["walked:phase1"] = stopWalked("phase1", avenueProgress);
  if (checkinsLoaded && !checkinLoadError) momentFlags["walked:phase4"] = stopWalked("phase4", avenueProgress);
  if (networkLoaded && !networkError) momentFlags["walked:phase5"] = stopWalked("phase5", avenueProgress);
  const { moment, dismiss } = useMoment(momentFlags);

  if (!mounted || !user || !accessChecked || !hasAccess) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  // A load failure is shown plainly rather than silently rendering an empty
  // journey, which would look identical to having lost every tick.
  if (loadError) {
    return (
      <div className="avenue-night flex items-center justify-center px-6">
        <div className="max-w-md text-center text-[var(--ink)]">
          <p className="mb-2">{loadError}</p>
          <p className="text-sm text-[var(--muted)]">Your saved progress has not been touched.</p>
        </div>
      </div>
    );
  }

  if (!progressLoaded) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="avenue-night relative">
      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={closeVideo}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">{videoModal.title}</h3>
              <button
                type="button"
                onClick={closeVideo}
                aria-label="Close video"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full rounded-xl"
                src={`https://www.youtube.com/embed/${videoModal.youtubeId}?autoplay=1`}
                title={videoModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Header: the sticky pill, quieter */}
      <header className="sticky top-4 z-50 mx-4 mt-4 flex max-w-5xl items-center justify-between rounded-full border border-[var(--line)] bg-[var(--night-2)] pl-6 pr-2 py-2 lg:mx-auto">
        <span className="text-sm font-semibold text-[var(--ink)]">Leadership Journey</span>
        <div className="flex items-center gap-4">
          {saving && <span className="hidden text-xs text-[var(--muted)] sm:inline">Saving...</span>}
          {!saving && saveError && (
            <span className="hidden max-w-[220px] text-xs text-red-400 sm:inline">{saveError}</span>
          )}
          {!saving && !saveError && conflictNotice && (
            // Visible at every width: a leader whose tick just silently
            // reverted needs the explanation most on the device most likely
            // to be the "second device" in a conflict.
            <span className="inline-block max-w-[200px] text-xs text-amber-400 sm:max-w-[260px]">{conflictNotice}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Logout</span>
          </button>
          <HeaderAvatar user={user} />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/leaders"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Greeting (spec 4.1) */}
        <div className="mb-8 mt-6">
          <p className="eyebrow">Your journey</p>
          <h1 className="mt-2 font-serif text-[34px] leading-[1.05] text-[var(--ink)] md:text-[52px]">
            {greetingFor(greetingTime, user.name)}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {journeyReady ? streetStatusLine(stops) : "Finding where you are on the street..."}
          </p>
        </div>

        {/* The avenue: map A from md, the vertical street on phones. Drawn
            only once every read has landed (F3), so no lamp flips on load. */}
        {journeyReady ? (
          <AvenueMap
            stops={stops}
            selectedId={openPhase}
            onSelect={setExpandedPhase}
            hereAction={hereAction}
            onAction={() => {
              if (hereStop) setExpandedPhase(hereStop.id);
            }}
          />
        ) : null}

        {/* The open stop */}
        <div className="mt-12 space-y-10">
          {phases.map((phase) => {
            if (phase.id !== openPhase) return null;

            // Growth and Multiplication are ongoing rhythms, not checklists:
            // each gets its own content instead of the modules list.
            const isGrowthPhase = phase.id === "phase4";
            const isMultiplyPhase = phase.id === "phase5";
            const isCallingPhase = phase.id === "phase2";
            const isLaunchPhase = phase.id === "phase3";
            // editingWeekStart, not a fresh mondayOf(new Date()) here: this
            // label is shown next to the form that edits it, and saveCheckin
            // sends this exact same value.
            const currentWeekStart = editingWeekStart;
            const currentWeekLabel = new Date(`${currentWeekStart}T00:00:00`).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
            });
            const historyWeeks = recentMondays(CHECKIN_HISTORY_WEEKS, new Date()).slice().reverse();
            const verse = VERSES[phase.id as StopId];

            return (
              <section key={phase.id} aria-label={phase.title}>
                <PhaseOpening
                  stop={phase.number}
                  name={phase.title}
                  reference={verse.reference}
                  short={verse.short}
                  verse={verse.text}
                />
                {phase.subtitle !== phase.scripture ? <p className="night-label mt-6">{phase.subtitle}</p> : null}
                <ClampedText text={phase.description} className="mt-4" />
                {isMultiplyPhase ? (
                  <p className="night-label mt-4">
                    {/* Gated on networkLoaded/networkError so it never flashes
                        "Sending nobody yet" before the network has loaded. */}
                    {!networkLoaded
                      ? "Loading..."
                      : networkError
                        ? "Could not load"
                        : sentByViewer.length === 0
                          ? "Sending nobody yet"
                          : `Sending ${sentByViewer.length} out`}
                  </p>
                ) : null}

                <div className="mt-10">
                  {isGrowthPhase ? (
                    <Phase4Growth
                      currentWeekLabel={currentWeekLabel}
                      currentWeekStart={currentWeekStart}
                      historyWeeks={historyWeeks}
                      checkins={checkins}
                      checkinsLoaded={checkinsLoaded}
                      setCheckinsLoaded={setCheckinsLoaded}
                      checkinLoadError={checkinLoadError}
                      setCheckinLoadAttempt={setCheckinLoadAttempt}
                      checkinForm={checkinForm}
                      setCheckinForm={setCheckinForm}
                      checkinSaving={checkinSaving}
                      checkinSaveError={checkinSaveError}
                      checkinSaved={checkinSaved}
                      saveCheckin={saveCheckin}
                      people={people}
                      peopleLoaded={peopleLoaded}
                      peopleError={peopleError}
                      onPersonChange={upsertPerson}
                    />
                  ) : isMultiplyPhase ? (
                    <Phase5Multiply
                      sentByViewer={sentByViewer}
                      networkLoaded={networkLoaded}
                      networkError={networkError}
                      networkDepth={networkDepth}
                      stepUpdatingId={stepUpdatingId}
                      stepError={stepError}
                      setApprenticeStep={setApprenticeStep}
                      people={people}
                      peopleLoaded={peopleLoaded}
                      peopleError={peopleError}
                      ensurePersonForNetwork={ensurePersonForNetwork}
                      patchPerson={patchPerson}
                      icnuDrafts={icnuDrafts}
                      addPerson={addPerson}
                      addingPerson={addingPerson}
                    />
                  ) : isCallingPhase ? (
                    <CallingCard data={calling.data} loaded={calling.loaded} error={calling.error} />
                  ) : isLaunchPhase ? (
                    <LaunchCard data={launch.data} loaded={launch.loaded} error={launch.error} />
                  ) : (
                    <PhaseModules
                      phase={phase}
                      toggleModuleComplete={toggleModuleComplete}
                      toggleEpisodeWatched={toggleEpisodeWatched}
                      openVideo={openVideo}
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <JourneyFooter />
      </main>

      <Moment
        play={moment !== null}
        playKey={moment?.n}
        title={moment?.title ?? ""}
        caption={moment?.caption ?? ""}
        onDismiss={dismiss}
      />
    </div>
  );
}
