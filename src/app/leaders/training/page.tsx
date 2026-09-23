"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import EpisodeCarousel from "@/components/ui/EpisodeCarousel";
import CheckinHistory from "@/components/ui/CheckinHistory";
import { recentMondays } from "@/lib/weeks";
import {
  LogOut,
  ArrowLeft,
  Play,
  ChevronDown,
  CheckCircle2,
  Video,
  FileText,
  BookOpen,
  Lightbulb,
  X,
  Heart,
  Users,
  MessageCircle,
} from "lucide-react";

import { Module, Phase } from "./phases";
import { RPMS_GAUGES, CHECKIN_HISTORY_WEEKS, ScoreRow } from "./Phase4Growth";
import { HERO_MAKER_PRACTICES, apprenticeStepLabel } from "./Phase5Multiply";
import { useTrainingProgress } from "./useTrainingProgress";
import { useCheckins } from "./useCheckins";
import { useNetworkView } from "./useNetworkView";

// No separate component needed - inline in the layout below

// Module Type Icons
const ModuleTypeIcon = ({ type }: { type: Module["type"] }) => {
  switch (type) {
    case "video":
      return <Video className="w-4 h-4" />;
    case "quiz":
      return <Lightbulb className="w-4 h-4" />;
    case "document":
      return <FileText className="w-4 h-4" />;
    case "action":
      return <CheckCircle2 className="w-4 h-4" />;
  }
};


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

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
      fetch(`/api/leader-access?email=${encodeURIComponent(currentUser.email)}`)
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
                  <div className="p-6 md:p-8 space-y-6">
                    {/* Healthy leader: a recommendation, not a module */}
                    <div className="panel p-6">
                      <span className="eyebrow">Healthy leader</span>
                      <h3 className="text-lg font-semibold text-white mt-1 mb-2">Multiplier, by Dave Ferguson</h3>
                      <p className="text-sm text-[var(--muted)] leading-relaxed mb-5">
                        Ferguson&rsquo;s case is that a leader reproduces who they are, not what they teach, so
                        health comes before technique. He tracks that health across four gauges: Relational,
                        Physical, Mental and Spiritual, RPMS for short. The weekly check-in below uses the same
                        four.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {RPMS_GAUGES.map(({ key, label }) => (
                          <div key={key} className="rounded-lg border border-dashed border-[var(--border)] p-3 text-center">
                            <span className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</span>
                            <p className="text-[11px] text-[var(--muted)] mt-2 italic">
                              Crash course notes coming soon
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* The weekly check-in */}
                    <div className="panel p-6">
                      <span className="eyebrow">This week&rsquo;s check-in</span>
                      <h3 className="text-lg font-semibold text-white mt-1 mb-4">Week of {currentWeekLabel}</h3>
                      {!checkinsLoaded ? (
                        <p className="text-sm text-[var(--muted)]">Loading your check-in...</p>
                      ) : checkinLoadError ? (
                        // No form is rendered here on purpose. Rendering it
                        // at its 5/5/5/5 defaults with Save enabled would
                        // let a leader whose real scores simply failed to
                        // load overwrite them with defaults they never saw.
                        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                          <p className="text-sm text-white mb-1">This week&rsquo;s check-in could not be loaded.</p>
                          <p className="text-sm text-[var(--muted)] mb-4">{checkinLoadError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setCheckinsLoaded(false);
                              setCheckinLoadAttempt((n) => n + 1);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-white text-sm font-semibold transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            Try again
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4 mb-5">
                            {RPMS_GAUGES.map(({ key, label }) => (
                              <ScoreRow
                                key={key}
                                label={label}
                                value={checkinForm[key]}
                                onChange={(next) => setCheckinForm((prev) => ({ ...prev, [key]: next }))}
                              />
                            ))}
                          </div>
                          <div className="mb-4">
                            <label htmlFor="checkin-reflection" className="text-sm text-white mb-1.5 block">
                              One sentence
                            </label>
                            <textarea
                              id="checkin-reflection"
                              value={checkinForm.reflection}
                              onChange={(e) => setCheckinForm((prev) => ({ ...prev, reflection: e.target.value }))}
                              maxLength={2000}
                              rows={2}
                              placeholder="How this week actually went."
                              className="w-full rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] p-3 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={saveCheckin}
                              disabled={checkinSaving}
                              className="px-5 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {checkinSaving ? "Saving..." : "Save check-in"}
                            </button>
                            {checkinSaved && !checkinSaving && (
                              <span className="text-xs text-[var(--accent)]">Saved.</span>
                            )}
                            {checkinSaveError && (
                              <span className="text-xs text-red-400">{checkinSaveError}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* The history */}
                    <div className="panel p-6">
                      <span className="eyebrow">History</span>
                      <h3 className="text-lg font-semibold text-white mt-1 mb-4">Recent weeks</h3>
                      <CheckinHistory weeks={historyWeeks} checkins={checkins} />
                    </div>

                    {/* Two coming soon cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="panel p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-[var(--accent)]" />
                          <span className="eyebrow">Coming soon</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2">Healthy group</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          A monthly check on how your pathway group is going, taken at or before the pathway
                          huddle. Part of the monthly rhythm, not built yet.
                        </p>
                      </div>
                      <div className="panel p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-[var(--accent)]" />
                          <span className="eyebrow">Coming soon</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2">Prayer requests</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          Raise a prayer request here, and later share it with other leaders. Not stored yet.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isMultiplyPhase ? (
                  <div className="p-6 md:p-8 space-y-6">
                    {/* Hero Maker crash course: a clearly marked placeholder,
                        laid out for the five practices, not the five
                        apprenticeship steps (those are already shown, per
                        person, in "Your people" below). No invented
                        teaching goes here. */}
                    <div className="panel p-6">
                      <span className="eyebrow">Placeholder</span>
                      <h3 className="text-lg font-semibold text-white mt-1 mb-2">Hero Maker, by Dave Ferguson</h3>
                      <p className="text-sm text-[var(--muted)] leading-relaxed mb-5">
                        Ferguson&rsquo;s case is that multiplication is not a course you finish, it is five
                        practices you build as habits. The crash course on each practice goes here.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {HERO_MAKER_PRACTICES.map((practice) => (
                          <div key={practice} className="rounded-lg border border-dashed border-[var(--border)] p-3 text-center">
                            <span className="text-xs uppercase tracking-wider text-[var(--muted)]">{practice}</span>
                            <p className="text-[11px] text-[var(--muted)] mt-2 italic">
                              Crash course notes coming soon
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Your people: the core of the phase */}
                    <div className="panel p-6">
                      <span className="eyebrow">Your people</span>
                      <h3 className="text-lg font-semibold text-white mt-1 mb-4">Who you&rsquo;re sending out</h3>
                      {!networkLoaded ? (
                        <p className="text-sm text-[var(--muted)]">Loading your network...</p>
                      ) : networkError ? (
                        <p className="text-sm text-red-400">{networkError}</p>
                      ) : sentByViewer.length === 0 ? (
                        // The common case, not a broken screen: most leaders
                        // are sending nobody out yet, and that is a
                        // beginning with an obvious next step, not an error.
                        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                          <Users className="w-6 h-6 text-[var(--accent)] mx-auto mb-3" />
                          <p className="text-sm text-white mb-1">You&rsquo;re not sending anyone out yet.</p>
                          <p className="text-sm text-[var(--muted)] mb-4">
                            That&rsquo;s the starting line, not a gap. Add the first person you&rsquo;re sending
                            out and the apprenticeship steps below start to mean something.
                          </p>
                          <Link
                            href="/leaders/network"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90"
                          >
                            Add someone to your network
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sentByViewer.map((person) => {
                            const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
                            const isUpdating = stepUpdatingId === person.id;
                            return (
                              <div
                                key={person.id}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border border-[var(--border)]"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{name}</p>
                                  <p className="text-sm text-[var(--accent)] mt-0.5">
                                    {apprenticeStepLabel(person.apprenticeStep)}
                                  </p>
                                  {stepError?.id === person.id && (
                                    <p className="text-xs text-red-400 mt-1">{stepError.message}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setApprenticeStep(person.id, person.apprenticeStep - 1)}
                                    disabled={isUpdating || person.apprenticeStep <= 0}
                                    aria-label={`Lower ${name}'s apprenticeship step`}
                                    className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-semibold text-white transition-colors hover:border-[var(--border-strong)] disabled:opacity-30"
                                  >
                                    Back
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setApprenticeStep(person.id, person.apprenticeStep + 1)}
                                    disabled={isUpdating || person.apprenticeStep >= 5}
                                    aria-label={`Advance ${name}'s apprenticeship step`}
                                    className="px-3 py-1.5 rounded-full bg-[var(--accent)] text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                  >
                                    {isUpdating ? "Saving..." : "Advance"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Multiplication depth: Ferguson's Kingdom Building
                        measure. Counts kingdom advance, not a score, and a
                        zero reads as a beginning rather than a failure. */}
                    <div className="panel p-6 text-center">
                      <span className="eyebrow">Kingdom advance</span>
                      {/* Gated on networkLoaded/networkError, same as "Your
                          people" above: without this, a leader with a real
                          network briefly saw "This is the beginning" before
                          it corrected, and on a failed load saw a red error
                          right next to a confident "This is the
                          beginning" with no indication the count was
                          unknown rather than genuinely zero. */}
                      {!networkLoaded ? (
                        <p className="text-sm text-[var(--muted)] mt-2">Loading your network...</p>
                      ) : networkError ? (
                        <p className="text-sm text-red-400 mt-2">{networkError}</p>
                      ) : networkDepth.people === 0 ? (
                        <>
                          <p className="text-3xl font-bold text-white mt-2">This is the beginning</p>
                          <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">
                            Nobody is multiplying below you yet. The first person you send out is where a
                            multiplication depth starts counting.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-4xl font-bold text-white mt-2 tabular-nums">{networkDepth.people}</p>
                          <p className="text-sm text-[var(--muted)] mt-2">
                            {networkDepth.people === 1 ? "person" : "people"} multiplying through{" "}
                            {networkDepth.generations} {networkDepth.generations === 1 ? "generation" : "generations"}{" "}
                            below you
                          </p>
                        </>
                      )}
                    </div>

                    {/* The family tree link, and an ICNU nudge */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Link
                        href="/leaders/network"
                        className="panel p-6 flex flex-col justify-between transition-colors hover:border-[var(--border-strong)]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-[var(--accent)]" />
                          <span className="eyebrow">Family tree</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2">See the whole network</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed">
                          The same steps, seen as a chart: everyone sent out, and everyone they have sent
                          out in turn.
                        </p>
                      </Link>
                      <div className="panel p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-[var(--accent)]" />
                          <span className="eyebrow">ICNU</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2">Permission Giving</h3>
                        <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
                          Ferguson&rsquo;s ICNU tool: name one person, then finish the sentence, &ldquo;I see
                          in you...&rdquo; That&rsquo;s the whole conversation. Nothing here is saved or
                          logged, so have it, then add them.
                        </p>
                        <Link
                          href="/leaders/network"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-white text-sm font-semibold transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                        >
                          Add them to your network
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Modules */}
                    <div className="lg:col-span-2 space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                        Training Modules
                      </h3>
                      {phase.modules.map((module) => (
                        <div key={module.id}>
                          {module.sectionHeader && (
                            <div className="flex items-center gap-3 mt-4 mb-2">
                              <div className="h-px flex-1 bg-[var(--surface-hover)]" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] whitespace-nowrap">
                                {module.sectionHeader}
                              </span>
                              <div className="h-px flex-1 bg-[var(--surface-hover)]" />
                            </div>
                          )}
                        <div
                          className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                            module.completed
                              ? "bg-[var(--surface)] border-green-500/30"
                              : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          <button
                            onClick={() => toggleModuleComplete(phase.id, module.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              module.completed
                                ? "bg-green-500 border-green-500"
                                : "border-gray-500 hover:border-blue-400"
                            }`}
                          >
                            {module.completed && <CheckCircle2 className="w-4 h-4 text-black" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-gray-400 ${module.completed ? "text-green-400" : ""}`}>
                                <ModuleTypeIcon type={module.type} />
                              </span>
                              <h4 className={`font-semibold ${module.completed ? "text-green-400 line-through" : "text-white"}`}>
                                {module.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-400">{module.description}</p>
                            {module.duration && (
                              <span className="text-xs text-gray-500 mt-1 inline-block">{module.duration}</span>
                            )}
                          </div>
                          {module.type === "video" && !module.episodes && (
                            <button className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center hover:brightness-110/30 transition-colors">
                              <Play className="w-4 h-4 text-[var(--accent)]" />
                            </button>
                          )}
                        </div>
                        {/* Episode carousel: thumbnails with watched progress */}
                        {module.episodes && (
                          <EpisodeCarousel
                            episodes={module.episodes}
                            onPlay={openVideo}
                            onToggleWatched={(episodeId) =>
                              toggleEpisodeWatched(phase.id, module.id, episodeId)
                            }
                          />
                        )}
                        </div>
                      ))}
                    </div>

                    {/* Right: Status */}
                    <div className="space-y-6">
                      {/* Phase Status */}
                      <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                        <h4 className="font-semibold text-white mb-4">Phase Status</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Modules Complete</span>
                            <span className="text-white">{progress.completed}/{progress.total}</span>
                          </div>
                          <div className="h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
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

