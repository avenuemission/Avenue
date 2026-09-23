import EpisodeCarousel from "@/components/ui/EpisodeCarousel";
import Glow from "@/components/avenue/Glow";
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

// The modules list used by Foundations, as a clean list on the night ground
// (spec 4.1). Progress state and the tick handlers come from
// useTrainingProgress via the page. A ticked module's lamp is lit.
export default function PhaseModules({
  phase,
  toggleModuleComplete,
  toggleEpisodeWatched,
  openVideo,
}: PhaseModulesProps) {
  return (
    <div>
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
                aria-label={module.completed ? `${module.title}: done. Tap to untick.` : `${module.title}: mark done`}
                className="-ml-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
              >
                <Glow trigger={module.completed ? "lit" : null}>
                  <span
                    aria-hidden="true"
                    className={`block h-[14px] w-[14px] rounded-full border ${
                      module.completed
                        ? "border-[var(--lamp)] bg-[var(--lamp)] shadow-[0_0_18px_4px_rgba(255,197,107,0.45)]"
                        : "border-[var(--line-2)] bg-[#131926]"
                    }`}
                  />
                </Glow>
              </button>
              <div className="min-w-0 flex-1 pt-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className={module.completed ? "text-[var(--lamp)]" : "text-[var(--muted)]"}>
                    <ModuleTypeIcon type={module.type} />
                  </span>
                  <h4 className="font-serif text-xl text-[var(--ink)]">{module.title}</h4>
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
                onToggleWatched={(episodeId) => toggleEpisodeWatched(phase.id, module.id, episodeId)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
