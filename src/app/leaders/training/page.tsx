"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { recentMondays } from "@/lib/weeks";
import {
  LogOut,
  ArrowLeft,
  ChevronDown,
  BookOpen,
  X,
  Heart,
  Users,
} from "lucide-react";

import { Phase } from "./phases";
import Phase4Growth, { CHECKIN_HISTORY_WEEKS } from "./Phase4Growth";
import Phase5Multiply from "./Phase5Multiply";
import PhaseModules from "./PhaseModules";
import { useTrainingProgress } from "./useTrainingProgress";
import { useCheckins } from "./useCheckins";
import { useNetworkView } from "./useNetworkView";
import { useMyPeople } from "@/lib/useMyPeople";
import { leaderFetch } from "@/lib/leaderFetch";

// No separate component needed - inline in the layout below

export default function TrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>("phase1");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videoModal, setVideoModal] = useState<{ youtubeId: string; title: string } | null>(null);

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
  } = useNetworkView(user, accessChecked, hasAccess);
  const { people, peopleLoaded, peopleError, upsertPerson, createPerson, patchPerson } = useMyPeople(
    accessChecked && hasAccess && !!user
  );

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

  const togglePhase = (id: string) => {
    setExpandedPhase(expandedPhase === id ? null : id);
  };

  const getPhaseProgress = (phase: Phase) => {
    const completed = phase.modules.filter((m) => m.completed).length;
    return { completed, total: phase.modules.length, percent: Math.round((completed / phase.modules.length) * 100) };
  };

  const getOverallProgress = () => {
    // The denominator here is deliberately not every module in
    // INITIAL_PHASES. Phases 4 and 5 (Growth and Multiplication) are
    // ongoing rhythms, not checklists: their module grids are never
    // rendered (see isGrowthPhase / isMultiplyPhase below, which replace
    // the modules grid entirely for those two phases), so the modules
    // still declared on them in INITIAL_PHASES can never be ticked.
    // Counting them would cap this headline number below 100% forever with
    // no way to close the gap, for every leader who finishes everything
    // reachable. Excluding phases 4 and 5 matches the fact that they
    // already show no completion percentage anywhere else in the page.
    const reachablePhases = phases.filter((p) => p.id !== "phase4" && p.id !== "phase5");
    const allModules = reachablePhases.flatMap((p) => p.modules);
    const completed = allModules.filter((m) => m.completed).length;
    return Math.round((completed / allModules.length) * 100);
  };

  const openVideo = (youtubeId: string, title: string) => {
    setVideoModal({ youtubeId, title });
  };

  const closeVideo = () => {
    setVideoModal(null);
  };

  // Used by both the orbital summary and phase 5's own content below, so
  // both read the exact same computation rather than two that could drift.
  const sentByViewer = networkPeople.filter((p) => p.sentOutBy === networkViewerId);
  const checkedInThisWeek = checkins.some((c) => c.weekStart === editingWeekStart);

  if (!mounted || !user || !accessChecked || !hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // A load failure is shown plainly rather than silently rendering an empty
  // journey, which would look identical to having lost every tick.
  if (loadError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-white text-center max-w-md">
          <p className="mb-2">{loadError}</p>
          <p className="text-gray-400 text-sm">Your saved progress has not been touched.</p>
        </div>
      </div>
    );
  }

  if (!progressLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closeVideo}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">{videoModal.title}</h3>
              <button onClick={closeVideo} className="text-gray-400 hover:text-white transition-colors">
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
      {/* Animated Gradient Background */}

      {/* Header */}
      <header className="sticky top-4 z-50 flex justify-between items-center px-6 py-3 bg-[var(--surface)] rounded-full mt-4 mx-4 max-w-7xl border border-[var(--border)] lg:mx-auto">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-white uppercase tracking-wider">Leadership Journey</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Overall Progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="#b6c4ff"
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - getOverallProgress() / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {getOverallProgress()}%
              </span>
            </div>
          </div>
          {saving && (
            <span className="text-gray-500 text-xs hidden sm:inline">Saving...</span>
          )}
          {!saving && saveError && (
            <span className="text-red-400 text-xs hidden sm:inline max-w-[220px]">{saveError}</span>
          )}
          {!saving && !saveError && conflictNotice && (
            // Visible at every width, not `hidden sm:inline` like the
            // neighbouring indicators: a leader whose tick just silently
            // reverted needs the explanation most on the device class most
            // likely to be the "second device" in a conflict, and that is
            // exactly the narrow viewport this would otherwise hide it on.
            <span className="text-amber-400 text-xs inline-block max-w-[200px] sm:max-w-[260px]">
              {conflictNotice}
            </span>
          )}
          <span className="text-gray-400 text-sm hidden sm:inline">Welcome, {user.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/leaders" className="inline-flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent)] text-sm uppercase tracking-wider mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-4">
            Leadership Journey
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            A five-phase pathway from initial calling to multiplying movements. 
            Complete each phase and debrief with your coach to unlock the next.
          </p>
        </div>

        {/* Collapsible Phase Sidebar - Vertical Tree Layout */}
        <div className="mb-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <span className="text-sm font-semibold uppercase tracking-wider">
              {sidebarOpen ? "Hide Phases" : "Show Phases"}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>

          {sidebarOpen && (
            <div className="w-full">
              {/* Circular orbital layout */}
              <div className="relative flex items-center justify-center" style={{ height: "340px" }}>
                {/* Orbit ring */}
                <div className="absolute w-[280px] h-[280px] rounded-full border-2 border-blue-400/50" />

                {/* Centre label */}
                <div className="absolute flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[var(--accent)]/20 border border-[var(--border-strong)] text-center z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] leading-tight">Leadership<br/>Journey</span>
                </div>

                {/* Phase nodes arranged in a circle (top, top-right, bottom-right, bottom, top-left) */}
                {phases.map((phase, i) => {
                  const progress = getPhaseProgress(phase);
                  const isActive = expandedPhase === phase.id;
                  // Growth and Multiplication are both ongoing rhythms, not
                  // checklists, so neither node ever reads as a percentage:
                  // the ring stays full and a single steady colour, standing
                  // for "always in motion" rather than "this much done".
                  const isOngoing = phase.id === "phase4" || phase.id === "phase5";
                  // Distribute 5 phases evenly: start from top (-90°)
                  const angleDeg = -90 + (360 / phases.length) * i;
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const radius = 140;
                  const x = Math.cos(angleRad) * radius;
                  const y = Math.sin(angleRad) * radius;

                  const r = 28;
                  const circumference = 2 * Math.PI * r;
                  const strokeDashoffset = isOngoing ? 0 : circumference * (1 - progress.percent / 100);
                  const trackColor = "rgba(255,255,255,0.08)";
                  const progressColor = isOngoing
                    ? "var(--accent)"
                    : progress.percent === 100
                      ? "#22c55e"
                      : isActive
                        ? "#60a5fa"
                        : "#3b82f6";

                  return (
                    <button
                      key={phase.id}
                      onClick={() => togglePhase(phase.id)}
                      className="absolute flex flex-col items-center gap-2 group z-10"
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      {/* Circle with SVG progress ring */}
                      <div className={`relative w-14 h-14 transition-all ${isActive ? "scale-110" : ""}`}>
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                          {/* Track */}
                          <circle cx="32" cy="32" r={r} fill="none" stroke={trackColor} strokeWidth="3.5" />
                          {/* Progress arc (full and steady for the ongoing phase) */}
                          <circle
                            cx="32" cy="32" r={r}
                            fill="none"
                            stroke={progressColor}
                            strokeWidth="3.5"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 0.5s ease" }}
                          />
                        </svg>
                        {/* Inner circle */}
                        <div className={`absolute inset-[5px] rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                          isActive
                            ? "bg-[var(--accent)] text-white"
                            : isOngoing
                              ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                              : progress.percent === 100
                                ? "bg-green-600 text-white"
                                : "bg-gray-800 text-gray-300 group-hover:bg-gray-700 group-hover:text-white"
                        }`}>
                          {phase.number}
                        </div>
                      </div>
                      <span className={`text-[11px] text-center max-w-[80px] leading-tight font-medium transition-colors whitespace-nowrap ${
                        isActive ? "text-white font-semibold" : "text-gray-500 group-hover:text-gray-200"
                      }`}>
                        {phase.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Expanded phase detail below */}
              {expandedPhase && (() => {
                const phase = phases.find(p => p.id === expandedPhase);
                if (!phase) return null;
                const progress = getPhaseProgress(phase);
                const color = phase.number <= 3 ? "blue" : "purple";
                const isOngoing = phase.id === "phase4" || phase.id === "phase5";

                return (
                  <div className={`mt-6 p-5 rounded-xl border ${
                    color === "blue"
                      ? "bg-[var(--accent)]/10 border-[var(--border)]"
                      : "bg-purple-600/10 border-purple-500/30"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            color === "blue" ? "text-[var(--accent)]" : "text-purple-400"
                          }`}>
                            Phase {phase.number}
                          </span>
                          <span className="text-xs text-gray-500">{phase.scripture}</span>
                        </div>
                        <h4 className="text-xl font-semibold text-white">{phase.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{phase.subtitle}</p>
                      </div>

                      {isOngoing ? (
                        // Growth and Multiplication are rhythms, not
                        // checklists: no percentage ring, no
                        // modules-complete count. Just a marker that each
                        // phase stays open rather than finishing.
                        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full border border-[var(--border)] bg-[var(--accent)]/10">
                          {phase.id === "phase4" ? (
                            <Heart className="w-6 h-6 text-[var(--accent)]" />
                          ) : (
                            <Users className="w-6 h-6 text-[var(--accent)]" />
                          )}
                        </div>
                      ) : (
                        /* Circular progress */
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                            <circle
                              cx="32" cy="32" r="28" fill="none"
                              stroke={progress.percent === 100 ? "#22c55e" : color === "blue" ? "#3b82f6" : "#a855f7"}
                              strokeWidth="3"
                              strokeDasharray={`${2 * Math.PI * 28}`}
                              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress.percent / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{progress.percent}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {isOngoing ? (
                      <p className="text-xs text-gray-500 mt-2">
                        {phase.id === "phase4"
                          ? checkedInThisWeek
                            ? "Checked in this week: a rhythm, not a checklist to finish."
                            : "A weekly rhythm, not a checklist to finish."
                          // Gated on networkLoaded/networkError the same way
                          // "Your people" below gates itself, so this never
                          // shows the empty-network wording before the
                          // network has actually loaded, or alongside a
                          // failed load with no explanation.
                          : !networkLoaded
                            ? "Loading your network..."
                            : networkError
                              ? "Could not load your network."
                              : sentByViewer.length === 0
                                ? "Not sending anyone out yet: a rhythm to begin, not a checklist to finish."
                                : `Sending ${sentByViewer.length} ${sentByViewer.length === 1 ? "person" : "people"} out: a rhythm, not a checklist to finish.`}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">{progress.completed} of {progress.total} modules complete</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Phase Content */}
        <div className="space-y-6">
          {phases.map((phase) => {
            const progress = getPhaseProgress(phase);
            const isExpanded = expandedPhase === phase.id;

            if (!isExpanded) return null;

            // Growth and Multiplication are both ongoing rhythms, not
            // checklists: phases 4 and 5 each get their own content below
            // instead of the modules grid every other phase uses, and
            // neither ever shows a completion percentage.
            const isGrowthPhase = phase.id === "phase4";
            const isMultiplyPhase = phase.id === "phase5";
            // editingWeekStart, not a fresh mondayOf(new Date()) here: this
            // label is shown right next to the form that edits it, and
            // saveCheckin sends this exact same value, so the two can never
            // disagree about which week is being edited even if the real
            // calendar week has moved on since the page loaded.
            const currentWeekStart = editingWeekStart;
            const currentWeekLabel = new Date(`${currentWeekStart}T00:00:00`).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
            });
            const historyWeeks = recentMondays(CHECKIN_HISTORY_WEEKS, new Date()).slice().reverse();
            const hasCheckedInThisWeek = checkins.some((c) => c.weekStart === currentWeekStart);

            return (
              <div key={phase.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
                {/* Phase Header */}
                <div className="p-6 md:p-8 border-b border-[var(--border)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1 rounded-full">
                          {phase.scripture}
                        </span>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                          {phase.subtitle}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-2">
                        {phase.title}
                      </h2>
                      <p className="text-gray-400">{phase.description}</p>
                    </div>
                    {/* Orbital Progress (Growth and Multiplication show an ongoing marker instead) */}
                    {isGrowthPhase ? (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border border-[var(--border)] bg-[var(--accent)]/10 flex items-center justify-center">
                          <Heart className="w-8 h-8 text-[var(--accent)]" />
                        </div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                          {hasCheckedInThisWeek ? "Checked in this week" : "Not yet this week"}
                        </span>
                      </div>
                    ) : isMultiplyPhase ? (
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border border-[var(--border)] bg-[var(--accent)]/10 flex items-center justify-center">
                          <Users className="w-8 h-8 text-[var(--accent)]" />
                        </div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                          {/* Gated on networkLoaded/networkError, same as
                              "Your people" below, so this doesn't flash
                              "Sending nobody yet" before the network has
                              loaded, or read confidently next to a load
                              failure. */}
                          {!networkLoaded
                            ? "Loading..."
                            : networkError
                              ? "Could not load"
                              : sentByViewer.length === 0
                                ? "Sending nobody yet"
                                : `Sending ${sentByViewer.length} out`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="relative w-20 h-20">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              fill="none"
                              stroke="#b6c4ff"
                              strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 36}`}
                              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress.percent / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-white">{progress.percent}%</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">Complete</span>
                      </div>
                    )}
                  </div>
                </div>

                {isGrowthPhase ? (
                  <Phase4Growth
                    currentWeekLabel={currentWeekLabel}
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
                    createPerson={createPerson}
                    patchPerson={patchPerson}
                  />
                ) : (
                  <PhaseModules
                    phase={phase}
                    progress={progress}
                    toggleModuleComplete={toggleModuleComplete}
                    toggleEpisodeWatched={toggleEpisodeWatched}
                    openVideo={openVideo}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-start gap-4">
            <BookOpen className="w-6 h-6 text-[var(--accent)] flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-white mb-2">About This Journey</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                This five-phase training pathway equips leaders from initial calling through multiplication. 
                Each phase includes video training, assessments, and practical action items. 
                Complete the debrief call with your coach at the end of phases 1-3 to unlock the next phase.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

