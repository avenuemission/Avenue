"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import EpisodeCarousel from "@/components/ui/EpisodeCarousel";
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
} from "lucide-react";

// Phase Types
interface Episode {
  id: string;
  title: string;
  youtubeId: string;
  watched: boolean;
}

interface Module {
  id: string;
  title: string;
  type: "video" | "quiz" | "document" | "action";
  description: string;
  duration?: string;
  completed: boolean;
  sectionHeader?: string;
  episodes?: Episode[];
}

interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  scripture: string;
  description: string;
  modules: Module[];
  locked: boolean;
}

// Initial Phase Data
const INITIAL_PHASES: Phase[] = [
  {
    id: "phase1",
    number: 1,
    title: "Foundations",
    subtitle: "Acts 2:42-47",
    scripture: "Acts 2:42-47",
    description: "In the early church, the framework laid out for what the church is was simple. After Pentecost, people journeyed as disciples of Jesus from household to household. They read the word together, prayed, fellowshipped, and ate together (Acts 2:42). Together, the church praised God, enjoyed each other's company as the Lord added people who were being saved (Acts 2:47). At the heart of what makes up the DNA of a church is 3 things: worship, community and mission. These 3 expressions are what we define as a minimum ecclesiology. Whenever Jesus is Lord, people feel a part of a family and have a mission for their world; church exists. We have set up our church around these 3 essential aspects of church.",
    locked: false,
    modules: [
      {
        id: "p1m0",
        title: "Avenue DNA",
        type: "video",
        description: "Understanding the mission, vision, and strategy of Avenue",
        duration: "5 episodes",
        completed: false,
        episodes: [
          { id: "p1m0e1", title: "1. The Mission", youtubeId: "-yjMDB8OXsg", watched: false },
          { id: "p1m0e2", title: "2. The Vision", youtubeId: "etpNJoyRNZ0", watched: false },
          { id: "p1m0e3", title: "3. The Values", youtubeId: "Lkx09wZpFmw", watched: false },
          { id: "p1m0e4", title: "4. What is a Microchurch?", youtubeId: "0EE9n_LEMtw", watched: false },
          { id: "p1m0e5", title: "5. Living as a Healthy Family", youtubeId: "uod2tVf0M6E", watched: false },
        ],
      },
      {
        id: "p1m1",
        title: "Pathways",
        type: "video",
        description: "Core training module: leading and facilitating pathway groups",
        duration: "3 parts",
        completed: false,
        episodes: [
          { id: "p1m1e1", title: "1. How do I start my leadership journey?", youtubeId: "CDyxXOcMIJw", watched: false },
          { id: "p1m1e2", title: "2. What is required of me as a leader?", youtubeId: "rYxLb_jBdiU", watched: false },
          { id: "p1m1e3", title: "3. Leading a Bible Discussion", youtubeId: "dQTBIhpfpq4", watched: false },
        ],
      },
      {
        id: "p1m2",
        title: "Intersection",
        type: "video",
        description: "Core training module: running intersection events and gatherings",
        duration: "1 video",
        completed: false,
        episodes: [
          { id: "p1m2e1", title: "1. Gathering for Worship", youtubeId: "-TEHae7KRx4", watched: false },
        ],
      },
      {
        id: "p1m3",
        title: "Streetlights",
        type: "video",
        description: "Core training module: creative and mission initiatives",
        duration: "5 parts",
        completed: false,
        episodes: [
          { id: "p1m3e1", title: "1. An Overview of Streetlights", youtubeId: "-Aj49FeIiT8", watched: false },
          { id: "p1m3e2", title: "2. The Core Mission", youtubeId: "LDbaw6ipOmM", watched: false },
          { id: "p1m3e3", title: "3. Defining Your Mission Field", youtubeId: "rJjcWIlndb4", watched: false },
          { id: "p1m3e4", title: "4. The BLESS Model for Evangelism", youtubeId: "qJ6PAfMmACY", watched: false },
          { id: "p1m3e5", title: "5. Personal and Financial Support for Initiatives", youtubeId: "Va4WjPK1U8M", watched: false },
        ],
      },
    ],
  },
  {
    id: "phase2",
    number: 2,
    title: "Calling",
    subtitle: "Ephesians 4",
    scripture: "Ephesians 4",
    description: "We are all one body with many parts (Ephesians 4). Each person is uniquely gifted and called by God to serve in a specific way. Just as Pentecost unleashed a diverse community of Spirit-filled people, this phase helps you discern your calling, understand your gifts, and align your leadership with Avenue's mission and theology.",
    locked: false,
    modules: [
      { id: "p2m1", title: "Discernment of Calling", type: "video", description: "Understanding internal and external calling", duration: "18 min", completed: false },
      { id: "p2m2", title: "APEST Quiz", type: "quiz", description: "Identify your leadership function", completed: false },
      { id: "p2m3", title: "Spiritual Gifts Assessment", type: "quiz", description: "Discover your spiritual gifts", completed: false },
      { id: "p2m4", title: "Strengths & Growth Areas", type: "document", description: "Personal leadership traits analysis", completed: false },
      { id: "p2m6", title: "Theology & Character Conversations", type: "action", description: "Conversations with board or pastors about core theology and character", completed: false },
    ],
  },
  {
    id: "phase3",
    number: 3,
    title: "Launch",
    subtitle: "Nehemiah Approach",
    scripture: "Nehemiah 1–2",
    description: "Nehemiah had the responsibility of rebuilding the walls of Jerusalem, when embarking on a new ministry endeavour, here are some leadership principles we see. When Nehemiah heard the state of his city and the walls fallen down, he starts by brings his sorrow to prayer and fasting (Neh. 1). When he arrives in Jerusalem, he creates a core team, taking a few men with him and doesn't tell anyone what God had laid on his heart (Neh. 2:11-15). He then establishes a strong 'why' and emphasises the importance of his project and from there they get to work (Neh. 2:17-18). Even with opposition, Nehemiah is reminded of the calling God had placed on his life and does the work faithfully (2:19-20).",
    locked: false,
    modules: [
      { id: "p3m1", title: "Planning Pathways", type: "document", description: "Fill out a planning document (Nehemiah approach)", completed: false },
      { id: "p3m2", title: "Praying & Fasting About the Launch Team", type: "action", description: "Bring your launch vision to God in prayer and fasting", completed: false },
      { id: "p3m3", title: "Recruiting 2–4 Launch Team Members", type: "action", description: "Identify and invite your core team", completed: false },
      { id: "p3m4", title: "Regular Launch Team Meetings", type: "action", description: "Meeting regularly with the launch team for prayer and fasting", completed: false },
      { id: "p3m5", title: "Identifying a Mission Group", type: "action", description: "Identifying a group to be 'on mission for'", completed: false },
      { id: "p3m6", title: "Finding a Third Space", type: "action", description: "Identifying a third space to connect with your mission group", completed: false },
      { id: "p3m7", title: "Living Intentionally", type: "action", description: "Living intentionally with those you're on mission for", completed: false },
      { id: "p3m8", title: "Putting Yourself in a Position of Need", type: "action", description: "Putting yourself in a position of 'need to'", completed: false },
      { id: "p3m9", title: "Planning an Official Launch Date", type: "action", description: "Planning an official launch date to be invitational to friends and family", completed: false },
      { id: "p3m12", title: "Weekly MicroChurch Practice", type: "action", description: "Meeting weekly with the launch team to practice being a MicroChurch together", sectionHeader: "Executing Plans (Sending out Luke 10, boldness 2 Corinthians 2)", completed: false },
      { id: "p3m13", title: "Inviting Others", type: "action", description: "Meet up and group chat theory", completed: false },
      { id: "p3m14", title: "Logistics", type: "document", description: "Track important dates (birthdays) and logistics", completed: false },
      { id: "p3m15", title: "Shepherding", type: "action", description: "Looking out for people when they are sick, in need, etc.", completed: false },
    ],
  },
  {
    id: "phase4",
    number: 4,
    title: "Growth",
    subtitle: "Jethro & Moses Model",
    scripture: "Exodus 18",
    description: "Ongoing coaching is essential to the longevity and success of a leader. When Jethro visits Moses, he praises God for the mighty things he's done through Moses (Ex. 18:8) and spends time eating with Moses and the leaders (Ex. 18:12). Then he offers Moses some gentle but crucial advice saying that his current system of managing the people is inefficient, advising Moses to delegate responsibility to other leaders. (Ex. 18:13-23) Moses listens to the wisdom of a counsellor he trusts and is better off for it in the long run (Ex. 18:25-26).",
    locked: false,
    modules: [
      { id: "p4m1", title: "Weekly Check-in / Touch Point (RPMS)", type: "action", description: "Relational weekly touch point using RPMS", completed: false },
      { id: "p4m2", title: "Monthly Pathways Huddles", type: "video", description: "Leader content freshly released at the start of each huddle", duration: "35 min", completed: false },
      { id: "p4m3", title: "Trainings", type: "document", description: "Exponential, internal sermons and podcasts", completed: false },
      { id: "p4m4", title: "Leaders Retreat", type: "action", description: "Annual gathering for replenishment and alignment", completed: false },
    ],
  },
  {
    id: "phase5",
    number: 5,
    title: "Multiply",
    subtitle: "Paul & Timothy Legacy",
    scripture: "2 Timothy 2:2",
    description: "The gospel multiplied through intentional apprenticeship in the New Testament. Barnabus saw something in Saul who became Paul, even when everyone else was afraid of him (Acts 9:26-27). Paul then released many other leaders such as a younger Timothy who he encouraged that things that he had heard from Paul would be passed on to others, who would be able to teach others also (2 Tim. 2:2). Great leaders intentionally reproduce who they are in others, with the fruit of their ministry growing on other people's trees.",
    locked: false,
    modules: [
      { id: "p5m1", title: "Identify an Apprentice", type: "action", description: "Spot potential in future leaders", completed: false },
      { id: "p5m2", title: "ICNU Conversation", type: "video", description: "Have an ICNU conversation with your apprentice", duration: "Coming soon", completed: false },
      { id: "p5m3", title: "Run the Apprenticeship Model", type: "video", description: "Running the apprenticeship model with your apprentice", duration: "Coming soon", completed: false },
      { id: "p5m4", title: "Begin the Five Phases Plan", type: "document", description: "Begin the Five Phases Plan with your apprentice", completed: false },
    ],
  },
];

type CheckpointStatus = "none" | "requested" | "complete";

// Reconciles saved progress (id lists from the database) into a fresh copy of
// INITIAL_PHASES. Ids saved that no longer exist in the content are ignored;
// content with no matching saved id simply stays false.
function reconcilePhases(
  watchedEpisodes: string[],
  completedModules: string[]
): Phase[] {
  const watchedSet = new Set(watchedEpisodes);
  const completedSet = new Set(completedModules);
  return INITIAL_PHASES.map((phase) => ({
    ...phase,
    modules: phase.modules.map((m) => ({
      ...m,
      completed: completedSet.has(m.id),
      episodes: m.episodes?.map((e) => ({ ...e, watched: watchedSet.has(e.id) })),
    })),
  }));
}

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
  const [phases, setPhases] = useState<Phase[]>(INITIAL_PHASES);
  const [expandedPhase, setExpandedPhase] = useState<string | null>("phase1");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videoModal, setVideoModal] = useState<{ youtubeId: string; title: string } | null>(null);

  // Progress load state. Task 5 consumes checkpointStatus to lock phase 3
  // and render the Calling checkpoint; this task only fetches it and holds
  // it, so it is intentionally unread here.
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read by Task 5
  const [checkpointStatus, setCheckpointStatus] = useState<CheckpointStatus | null>(null);

  // Debounced save state.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const phasesRef = useRef<Phase[]>(phases);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phasesRef.current = phases;
  }, [phases]);

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

  // Load saved progress once the session and access checks have both passed.
  // Until this resolves the page keeps showing its loading treatment: a
  // returning leader must never see an empty journey flash before their
  // watched episodes and completed modules land.
  useEffect(() => {
    if (!accessChecked || !hasAccess || !user) return;
    let cancelled = false;
    fetch(`/api/leader-training?email=${encodeURIComponent(user.email)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load progress (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const progress = data.progress ?? {};
        setPhases(
          reconcilePhases(progress.watchedEpisodes ?? [], progress.completedModules ?? [])
        );
        setCheckpointStatus((progress.checkpointStatus as CheckpointStatus) ?? "none");
        setProgressLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Could not load your training progress. Please refresh the page to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [accessChecked, hasAccess, user]);

  // Collects the current watched episode ids and completed module ids from
  // state and PUTs them. Reads from phasesRef rather than closing over
  // `phases`, since this fires up to 800ms after the tick that scheduled it.
  const saveProgress = useCallback(async () => {
    if (!user) return;
    const currentPhases = phasesRef.current;
    const watchedEpisodes = currentPhases.flatMap((phase) =>
      phase.modules.flatMap((m) => (m.episodes ?? []).filter((e) => e.watched).map((e) => e.id))
    );
    const completedModules = currentPhases.flatMap((phase) =>
      phase.modules.filter((m) => m.completed).map((m) => m.id)
    );
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/leader-training", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, watchedEpisodes, completedModules }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
    } catch {
      // Never revert a leader's tick because the network failed. Local
      // state is left exactly as it is; only the error banner changes.
      setSaveError("Could not save your progress. It is kept on this page, try again shortly.");
    } finally {
      setSaving(false);
    }
  }, [user]);

  // Every tick clears the pending timeout and schedules a new one 800ms out,
  // so rapid ticking sends one request rather than one per click.
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveProgress();
    }, 800);
  }, [saveProgress]);

  // Clear the pending timeout on unmount so a save cannot fire after the
  // component is gone.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const togglePhase = (id: string) => {
    setExpandedPhase(expandedPhase === id ? null : id);
  };

  const toggleModuleComplete = (phaseId: string, moduleId: string) => {
    setPhases((prev) =>
      prev.map((phase) => {
        if (phase.id === phaseId) {
          return {
            ...phase,
            modules: phase.modules.map((m) =>
              m.id === moduleId ? { ...m, completed: !m.completed } : m
            ),
          };
        }
        return phase;
      })
    );
    scheduleSave();
  };

  const toggleEpisodeWatched = (phaseId: string, moduleId: string, episodeId: string) => {
    setPhases((prev) =>
      prev.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const updatedModules = phase.modules.map((m) => {
          if (m.id !== moduleId || !m.episodes) return m;
          const updatedEpisodes = m.episodes.map((e) =>
            e.id === episodeId ? { ...e, watched: !e.watched } : e
          );
          const allWatched = updatedEpisodes.every((e) => e.watched);
          return { ...m, episodes: updatedEpisodes, completed: allWatched };
        });
        return { ...phase, modules: updatedModules };
      })
    );
    scheduleSave();
  };

  const getPhaseProgress = (phase: Phase) => {
    const completed = phase.modules.filter((m) => m.completed).length;
    return { completed, total: phase.modules.length, percent: Math.round((completed / phase.modules.length) * 100) };
  };

  const getOverallProgress = () => {
    const allModules = phases.flatMap((p) => p.modules);
    const completed = allModules.filter((m) => m.completed).length;
    return Math.round((completed / allModules.length) * 100);
  };

  const openVideo = (youtubeId: string, title: string) => {
    setVideoModal({ youtubeId, title });
  };

  const closeVideo = () => {
    setVideoModal(null);
  };

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
                  // Distribute 5 phases evenly: start from top (-90°)
                  const angleDeg = -90 + (360 / phases.length) * i;
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const radius = 140;
                  const x = Math.cos(angleRad) * radius;
                  const y = Math.sin(angleRad) * radius;

                  const r = 28;
                  const circumference = 2 * Math.PI * r;
                  const strokeDashoffset = circumference * (1 - progress.percent / 100);
                  const trackColor = "rgba(255,255,255,0.08)";
                  const progressColor = progress.percent === 100
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
                          {/* Progress arc */}
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
                      
                      {/* Circular progress */}
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
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{progress.completed} of {progress.total} modules complete</p>
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
                    {/* Orbital Progress */}
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
                  </div>
                </div>

                {/* Modules List */}
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
                        {/* Episode carousel — thumbnails with watched progress */}
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

                      {/* Coming Soon Notice */}
                      {(phase.id === "phase5") && (
                        <div className="p-4 rounded-xl bg-purple-600/10 border border-purple-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-semibold text-purple-400">Coming Soon</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Discipleship quizzes and apprenticeship videos will be available soon.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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

