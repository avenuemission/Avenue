"use client";

import { useState } from "react";
import Link from "next/link";
import EpisodeCarousel from "@/components/leaders/training/EpisodeCarousel";
import Glow from "@/components/leaders/avenue/Glow";
import StepDot from "@/components/leaders/avenue/StepDot";
import { DOT_SR_TEXT, moduleStatus } from "@/lib/domain/stepStatus";
import { CheckCircle2, Video, FileText, Lightbulb, BookOpen, ChevronRight } from "lucide-react";
import { Module, Phase } from "@/content/training/phases";
import { MISSION_GUIDE_HREF } from "@/content/training/missionGuide";
import { useTrainingContent } from "@/hooks/useTrainingContent";
import { FOUNDATIONS_PROMPT_KEYS, type VideoQuestion } from "@/lib/domain/trainingContent";
import DiscussionCard from "@/components/leaders/training/DiscussionCard";
import VideoQuestionDialog from "@/components/leaders/training/VideoQuestionDialog";

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

interface PhaseModulesProps {
  phase: Phase;
  toggleModuleComplete: (phaseId: string, moduleId: string) => void;
  toggleEpisodeWatched: (phaseId: string, moduleId: string, episodeId: string) => void;
  openVideo: (youtubeId: string, title: string) => void;
  // The video whose player was just closed, so its tick can nudge.
  nudgeYoutubeId?: string | null;
}

interface Asking {
  moduleId: string;
  episodeId: string;
  title: string;
  question: VideoQuestion;
}

// The modules list used by Foundations, as a clean list on the night ground
// (spec 4.1). Progress state and the tick handlers come from
// useTrainingProgress via the page. A ticked module's dot is lit; a module
// with an episode watched but not ticked pulses (round 3 spec 4).
export default function PhaseModules({
  phase,
  toggleModuleComplete,
  toggleEpisodeWatched,
  openVideo,
  nudgeYoutubeId = null,
}: PhaseModulesProps) {
  const content = useTrainingContent(true);
  const [asking, setAsking] = useState<Asking | null>(null);

  // Ticking an unticked video asks its question first (Done ticks it);
  // unticking, or a video with no question, toggles straight away.
  const toggleEpisode = (module: Module, episodeId: string) => {
    const episode = module.episodes?.find((e) => e.id === episodeId);
    const question = episode && !episode.watched ? content.question(episode.youtubeId) : null;
    if (episode && question) setAsking({ moduleId: module.id, episodeId, title: episode.title, question });
    else toggleEpisodeWatched(phase.id, module.id, episodeId);
  };

  return (
    <div>
      {asking && (
        <VideoQuestionDialog
          key={asking.episodeId}
          videoTitle={asking.title}
          question={asking.question}
          onDone={() => {
            toggleEpisodeWatched(phase.id, asking.moduleId, asking.episodeId);
            setAsking(null);
          }}
          onClose={() => setAsking(null)}
        />
      )}
      <h3 className="night-h2 mb-4">Training modules</h3>
      <ul className="border-t border-[var(--line)]">
        {phase.modules.map((module) => (
          <li key={module.id} className="border-b border-[var(--line)] py-5">
            {module.sectionHeader && <p className="night-label mb-3">{module.sectionHeader}</p>}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleModuleComplete(phase.id, module.id)}
                aria-pressed={module.completed}
                aria-label={
                  module.completed
                    ? `${module.title}: done. Tap to untick.`
                    : `${module.title}${DOT_SR_TEXT[moduleStatus(module)]}: mark done`
                }
                className="-ml-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
              >
                <Glow trigger={module.completed ? "lit" : null}>
                  <StepDot status={moduleStatus(module)} />
                </Glow>
              </button>
              <div className="min-w-0 flex-1 pt-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className={module.completed ? "text-[var(--lamp)]" : "text-[var(--muted)]"}>
                    <ModuleTypeIcon type={module.type} />
                  </span>
                  <h4 className="font-sans font-bold uppercase tracking-tight text-lg text-[var(--ink)] md:text-xl">{module.title}</h4>
                </div>
                <p className="text-sm text-[var(--muted)]">{module.description}</p>
                {module.duration && <span className="night-label mt-2 inline-block">{module.duration}</span>}
              </div>
            </div>
            {/* Episode carousel: thumbnails with watched progress */}
            {module.episodes && (
              <EpisodeCarousel
                episodes={module.episodes}
                onPlay={openVideo}
                onToggleWatched={(episodeId) => toggleEpisode(module, episodeId)}
                nudgeYoutubeId={nudgeYoutubeId}
              />
            )}
            {FOUNDATIONS_PROMPT_KEYS[module.id] && (
              <DiscussionCard prompt={content.prompt(FOUNDATIONS_PROMPT_KEYS[module.id])} className="mt-4" />
            )}
          </li>
        ))}
      </ul>

      {/* Reading, not a tickable module: it never changes the Foundations count. */}
      <h3 className="night-h2 mb-4 mt-10">Reading</h3>
      <Link
        href={MISSION_GUIDE_HREF}
        className="night-card group flex items-center gap-4 p-5 transition-colors hover:border-[var(--lamp)]"
      >
        <BookOpen className="h-5 w-5 flex-shrink-0 text-[var(--lamp)]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-lg font-bold uppercase tracking-tight text-[var(--ink)] md:text-xl">
            Avenue Mission Guide
          </span>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            Our mission, DNA, metrics of success, leadership guidelines and board structure.
          </span>
        </span>
        <ChevronRight
          className="h-5 w-5 flex-shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-white"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
