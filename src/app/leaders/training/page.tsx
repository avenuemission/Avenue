"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import {
  LogOut,
  ArrowLeft,
  Play,
  ChevronDown,
  CheckCircle2,
  Video,
  FileText,
  MessageSquare,
  BookOpen,
  Lightbulb,
} from "lucide-react";

// Phase Types
interface Module {
  id: string;
  title: string;
  type: "video" | "quiz" | "document" | "action";
  description: string;
  duration?: string;
  completed: boolean;
}

interface Phase {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  scripture: string;
  description: string;
  modules: Module[];
  debriefRequired: boolean;
  debriefScheduled: boolean;
  debriefCompleted: boolean;
  locked: boolean;
}

// Initial Phase Data
const INITIAL_PHASES: Phase[] = [
  {
    id: "phase1",
    number: 1,
    title: "Called & Qualified",
    subtitle: "Discernment of Calling",
    scripture: "1 Timothy 3",
    description: "Examine the foundational requirements for leadership through scripture and self-reflection.",
    debriefRequired: true,
    debriefScheduled: false,
    debriefCompleted: false,
    locked: false,
    modules: [
      { id: "p1m1", title: "Discernment of Calling", type: "video", description: "Understanding internal and external calling", duration: "18 min", completed: false },
      { id: "p1m2", title: "APEST Quiz", type: "quiz", description: "Identify your leadership function", completed: false },
      { id: "p1m3", title: "Spiritual Gifts Assessment", type: "quiz", description: "Discover your spiritual gifts", completed: false },
      { id: "p1m4", title: "Strengths & Growth Areas", type: "document", description: "Personal leadership traits analysis", completed: false },
      { id: "p1m5", title: "Avenue DNA", type: "video", description: "Understanding the mission, vision, and strategy", duration: "22 min", completed: false },
      { id: "p1m6", title: "Theology & Character Conversations", type: "action", description: "Meet with board/pastors about core theology and character", completed: false },
    ],
  },
  {
    id: "phase2",
    number: 2,
    title: "Devoted Life",
    subtitle: "Early Church Blueprint",
    scripture: "Acts 2:42-47",
    description: "Establishing the core rhythms of leadership through the blueprint of the early church.",
    debriefRequired: true,
    debriefScheduled: false,
    debriefCompleted: false,
    locked: false,
    modules: [
      { id: "p2m1", title: "The Four Pillars", type: "video", description: "Teaching, fellowship, breaking of bread, and prayer", duration: "25 min", completed: false },
      { id: "p2m2", title: "Pathways Training", type: "video", description: "How to lead and facilitate pathway groups", duration: "30 min", completed: false },
      { id: "p2m3", title: "Intersection Training", type: "video", description: "Running intersection events and gatherings", duration: "28 min", completed: false },
      { id: "p2m4", title: "Streetlights Training", type: "video", description: "Creative and mission initiatives", duration: "24 min", completed: false },
    ],
  },
  {
    id: "phase3",
    number: 3,
    title: "Build & Launch",
    subtitle: "Nehemiah Approach",
    scripture: "Nehemiah",
    description: "Planning meets execution. From prayer to practical steps toward launch.",
    debriefRequired: true,
    debriefScheduled: false,
    debriefCompleted: false,
    locked: false,
    modules: [
      { id: "p3m1", title: "Planning Pathways", type: "document", description: "Fill out planning document (Nehemiah approach)", completed: false },
      { id: "p3m2", title: "Prayer & Fasting", type: "action", description: "Pray and fast about your launch team", completed: false },
      { id: "p3m3", title: "Recruiting 2-4 Launch Team Members", type: "action", description: "Identify and invite your core team", completed: false },
      { id: "p3m4", title: "Regular Launch Team Meetings", type: "video", description: "Meeting for prayer and fasting with team", duration: "15 min", completed: false },
      { id: "p3m5", title: "Identifying Your Mission Group", type: "action", description: "Who are you on mission for?", completed: false },
      { id: "p3m6", title: "Third Space Connection", type: "video", description: "Finding and connecting in neutral grounds", duration: "20 min", completed: false },
      { id: "p3m7", title: "Living Intentionally", type: "video", description: "Putting yourself in position of need-to", duration: "18 min", completed: false },
      { id: "p3m8", title: "Planning Launch Date", type: "action", description: "Set official date to invite friends and family", completed: false },
      { id: "p3m9", title: "Defining Ecclesial Minimums", type: "document", description: "What defines your microchurch?", completed: false },
      { id: "p3m10", title: "Luke 10 Sending", type: "video", description: "Executing plans with boldness", duration: "22 min", completed: false },
      { id: "p3m11", title: "Weekly MicroChurch Practice", type: "action", description: "Practice being a microchurch with launch team", completed: false },
      { id: "p3m12", title: "Inviting Others", type: "video", description: "Meet up and group chat theory", duration: "16 min", completed: false },
      { id: "p3m13", title: "Logistics & Important Dates", type: "document", description: "Track birthdays and key dates", completed: false },
      { id: "p3m14", title: "Shepherding Others", type: "video", description: "Looking out for people when sick or in need", duration: "19 min", completed: false },
    ],
  },
  {
    id: "phase4",
    number: 4,
    title: "Coached & Commissioned",
    subtitle: "Jethro & Moses Model",
    scripture: "Jethro to Moses",
    description: "Ongoing coaching and strategic expansion. Entering the parallel stage.",
    debriefRequired: false,
    debriefScheduled: false,
    debriefCompleted: false,
    locked: false,
    modules: [
      { id: "p4m1", title: "RPMS Weekly Check-in", type: "action", description: "Relational touch point using RPMs (Reminders enabled)", completed: false },
      { id: "p4m2", title: "Monthly Pathways Huddles", type: "video", description: "Leader content released at huddles", duration: "35 min", completed: false },
      { id: "p4m3", title: "Exponential Training Access", type: "document", description: "External training resources", completed: false },
      { id: "p4m4", title: "Internal Sermons & Podcasts", type: "video", description: "Fresh leadership content", duration: "varies", completed: false },
      { id: "p4m5", title: "Leaders Retreat", type: "action", description: "Annual gathering for replenishment and alignment", completed: false },
    ],
  },
  {
    id: "phase5",
    number: 5,
    title: "Multiply & Send",
    subtitle: "Paul & Timothy Legacy",
    scripture: "2 Timothy 2:2",
    description: "Transition from leading movements to overseeing a multiplying ecosystem.",
    debriefRequired: false,
    debriefScheduled: false,
    debriefCompleted: false,
    locked: false,
    modules: [
      { id: "p5m1", title: "Identify an Apprentice", type: "action", description: "Spot potential in future leaders", completed: false },
      { id: "p5m2", title: "ICNU Conversation", type: "video", description: "I See Network Utility conversation guide", duration: "Coming soon", completed: false },
      { id: "p5m3", title: "Apprenticeship Model", type: "video", description: "Running the apprenticeship model", duration: "Coming soon", completed: false },
      { id: "p5m4", title: "Five Phases Plan", type: "document", description: "Begin the plan with your apprentice", completed: false },
      { id: "p5m5", title: "Creating Networks", type: "video", description: "Connecting with other pathway groups for intersection", duration: "Coming soon", completed: false },
      { id: "p5m6", title: "Streetlights Expansion", type: "video", description: "Mission initiatives scaling", duration: "Coming soon", completed: false },
      { id: "p5m7", title: "Discipleship Quiz & Guides", type: "quiz", description: "Personalized apologetics and discipleship guides", completed: false },
      { id: "p5m8", title: "Up/In/Out Assessment", type: "quiz", description: "Quiz with treatment plan output", completed: false },
    ],
  },
];

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
  };

  const scheduleDebrief = (phaseId: string) => {
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId ? { ...phase, debriefScheduled: true } : phase
      )
    );
  };

  const completeDebrief = (phaseId: string) => {
    setPhases((prev) => {
      const updated = prev.map((phase) =>
        phase.id === phaseId ? { ...phase, debriefCompleted: true, locked: false } : phase
      );
      // Unlock next phase
      const currentIndex = updated.findIndex((p) => p.id === phaseId);
      if (currentIndex < updated.length - 1) {
        updated[currentIndex + 1].locked = false;
      }
      return updated;
    });
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

  if (!mounted || !user || !accessChecked || !hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-950/50 to-black animate-gradient-shift" />
        <div className="absolute inset-0 bg-gradient-to-tl from-purple-900/20 via-transparent to-blue-950/30 animate-gradient-shift-reverse" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slower" />
      </div>

      {/* Header */}
      <header className="sticky top-4 z-50 flex justify-between items-center px-6 py-3 bg-black/40 backdrop-blur-xl rounded-full mt-4 mx-4 max-w-7xl border border-white/20 shadow-[0_0_20px_rgba(182,196,255,0.2)] lg:mx-auto">
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
          <span className="text-gray-400 text-sm hidden sm:inline">Welcome, {user.name}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/leaders" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider mb-8">
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
              {/* Horizontal stepper: 1─2─3─4 with fork from 3 down to 5 */}
              <div className="relative">
                {/* Main row: Phases 1-4 with line through center of circles */}
                <div className="relative">
                  {/* Horizontal line - centered on circles */}
                  <div className="absolute top-[24px] left-[12.5%] right-[12.5%] h-[3px] bg-blue-500/40 z-0" />
                  
                  <div className="flex items-start relative">
                    {phases.slice(0, 4).map((phase) => {
                      const progress = getPhaseProgress(phase);
                      const isActive = expandedPhase === phase.id;
                      
                      return (
                        <button
                          key={phase.id}
                          onClick={() => togglePhase(phase.id)}
                          className="relative z-10 flex flex-col items-center gap-3 group flex-1"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            isActive 
                              ? "bg-blue-600 text-white ring-4 ring-blue-500/30 scale-110" 
                              : progress.percent === 100
                                ? "bg-green-600 text-white"
                                : "bg-gray-800 text-gray-300 border-2 border-gray-600 group-hover:border-gray-300"
                          }`}>
                            {phase.number}
                          </div>
                          <span className={`text-xs text-center max-w-[90px] leading-tight transition-colors ${
                            isActive ? "text-white font-semibold" : "text-gray-500 group-hover:text-gray-300"
                          }`}>
                            {phase.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Phase 5 row with L-shape connector */}
                <div className="relative flex items-start" style={{ height: "120px" }}>
                  {/* L-shaped line: vertical from phase 3, then horizontal to phase 5 */}
                  {/* Vertical segment */}
                  <div className="absolute left-[62.5%] top-0 w-[3px] h-[72px] bg-purple-500/50 -translate-x-1/2" />
                  {/* Horizontal segment */}
                  <div className="absolute left-[62.5%] top-[72px] h-[3px] bg-purple-500/50" style={{ width: "calc(87.5% - 62.5%)" }} />
                  
                  {/* Phase 5 circle positioned at 87.5% (same x as phase 4) */}
                  <div className="absolute left-[87.5%] top-[48px] -translate-x-1/2">
                    {(() => {
                      const phase = phases[4];
                      const progress = getPhaseProgress(phase);
                      const isActive = expandedPhase === phase.id;
                      
                      return (
                        <button
                          onClick={() => togglePhase(phase.id)}
                          className="relative z-10 flex flex-col items-center gap-3 group"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            isActive 
                              ? "bg-purple-600 text-white ring-4 ring-purple-500/30 scale-110" 
                              : progress.percent === 100
                                ? "bg-green-600 text-white"
                                : "bg-gray-800 text-gray-300 border-2 border-gray-600 group-hover:border-gray-300"
                          }`}>
                            {phase.number}
                          </div>
                          <span className={`text-xs text-center max-w-[100px] leading-tight transition-colors ${
                            isActive ? "text-white font-semibold" : "text-gray-500 group-hover:text-gray-300"
                          }`}>
                            {phase.title}
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
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
                      ? "bg-blue-600/10 border-blue-500/30" 
                      : "bg-purple-600/10 border-purple-500/30"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            color === "blue" ? "text-blue-400" : "text-purple-400"
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
            const allModulesComplete = progress.completed === progress.total;

            if (!isExpanded) return null;

            return (
              <div key={phase.id} className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {/* Phase Header */}
                <div className="p-6 md:p-8 border-b border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
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
                        <div
                          key={module.id}
                          className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                            module.completed
                              ? "bg-white/5 border-green-500/30"
                              : "bg-white/5 border-white/10 hover:border-white/20"
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
                          {module.type === "video" && (
                            <button className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center hover:bg-blue-600/30 transition-colors">
                              <Play className="w-4 h-4 text-blue-400" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Right: Debrief & Status */}
                    <div className="space-y-6">
                      {phase.debriefRequired && (
                        <div className="p-6 rounded-xl border border-dashed border-white/20 bg-white/5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">Phase Debrief</h4>
                              <p className="text-xs text-gray-400">Required to unlock next phase</p>
                            </div>
                          </div>

                          {!phase.debriefScheduled && !phase.debriefCompleted && (
                            <button
                              onClick={() => scheduleDebrief(phase.id)}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-colors"
                            >
                              Schedule Zoom Call
                            </button>
                          )}

                          {phase.debriefScheduled && !phase.debriefCompleted && (
                            <div className="space-y-3">
                              <div className="p-3 bg-blue-600/10 rounded-lg border border-blue-500/30">
                                <p className="text-sm text-blue-400 text-center">Zoom call scheduled</p>
                              </div>
                              <button
                                onClick={() => completeDebrief(phase.id)}
                                className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded-full font-semibold uppercase text-sm tracking-wider transition-colors"
                              >
                                Mark Debrief Complete
                              </button>
                            </div>
                          )}

                          {phase.debriefCompleted && (
                            <div className="p-3 bg-green-600/10 rounded-lg border border-green-500/30 flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                              <span className="text-green-400 font-semibold">Debrief Complete</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Phase Status */}
                      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-semibold text-white mb-4">Phase Status</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Modules Complete</span>
                            <span className="text-white">{progress.completed}/{progress.total}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          {allModulesComplete && !phase.debriefCompleted && phase.debriefRequired && (
                            <p className="text-sm text-amber-400 text-center">
                              Complete your debrief to unlock the next phase
                            </p>
                          )}
                          {allModulesComplete && phase.debriefCompleted && (
                            <p className="text-sm text-green-400 text-center">
                              Phase complete! Next phase unlocked.
                            </p>
                          )}
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
        <div className="mt-12 p-6 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-start gap-4">
            <BookOpen className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
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

