import EpisodeCarousel from "@/components/ui/EpisodeCarousel";
import { CheckCircle2, Video, FileText, Lightbulb } from "lucide-react";
import { Module, Phase } from "./phases";

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
}

// The modules list used by Foundations. Progress state and the tick
// handlers come from useTrainingProgress via the page. The phase header
// already shows progress, so there is no separate status panel.
export default function PhaseModules({
  phase,
  toggleModuleComplete,
  toggleEpisodeWatched,
  openVideo,
}: PhaseModulesProps) {
  return (
    <div className="p-6 md:p-8">
      <div>
        <div className="space-y-3">
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
      </div>
    </div>
  );
}
