"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import Portal from "@/components/ui/Portal";

// "Watch · Meet Avenue" on /vision. Each card is a still thumbnail until
// tapped; only then does the YouTube player load, in a pop-up like the
// leader training videos, so the page stays fast.
const VIDEOS = [
  {
    youtubeId: "76foX8j-Sd4",
    title: "What is Avenue?",
    length: "2:08",
    description: "Two minutes on how we do church: socials, Pathways and Prayer and Praise.",
  },
  {
    youtubeId: "6JB7nxD4nCI",
    title: "The Avenue Story",
    length: "4:21",
    description: "From a Friday night ministry at school to a network of house churches across Melbourne.",
  },
] as const;

type Video = (typeof VIDEOS)[number];

export default function WatchVideos() {
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlaying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {VIDEOS.map((v) => (
          <div key={v.youtubeId}>
            <button
              type="button"
              onClick={() => setPlaying(v)}
              aria-label={`Play ${v.title} (${v.length})`}
              className="group relative block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a YouTube still, served as is from img.youtube.com */}
              <img
                src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                alt=""
                width={480}
                height={360}
                loading="lazy"
                className="aspect-video w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 ring-1 ring-white/30 transition-transform group-hover:scale-105">
                  <Play className="ml-1 h-7 w-7 fill-white text-white" aria-hidden="true" />
                </span>
              </span>
              <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
                {v.length}
              </span>
            </button>
            <h3 className="mt-4 text-xl font-bold text-white">{v.title}</h3>
            <p className="mt-1 text-[var(--muted)] leading-relaxed">{v.description}</p>
          </div>
        ))}
      </div>

      {playing && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPlaying(null)}
            role="dialog"
            aria-modal="true"
            aria-label={playing.title}
          >
            <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{playing.title}</h3>
                <button
                  type="button"
                  onClick={() => setPlaying(null)}
                  aria-label="Close video"
                  autoFocus
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--muted)] hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 h-full w-full rounded-xl"
                  src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&rel=0`}
                  title={playing.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
