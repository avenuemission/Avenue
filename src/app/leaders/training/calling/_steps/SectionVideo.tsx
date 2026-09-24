import type { CallingSectionContent } from "@/content/calling";

// The section's video, or a placeholder with the script summary until the
// video is recorded. Set youtubeId in content.ts to switch it on.
export default function SectionVideo({ section }: { section: CallingSectionContent }) {
  if (!section.hasVideo) return null;

  if (section.youtubeId) {
    return (
      <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-[var(--border)]">
        <iframe
          src={`https://www.youtube.com/embed/${section.youtubeId}`}
          title={section.title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="panel p-4 md:p-5 border-dashed">
      <p className="eyebrow">Video coming</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">{section.summary}</p>
    </div>
  );
}
