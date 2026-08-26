"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Check, ChevronLeft, ChevronRight } from "lucide-react";

export interface CarouselEpisode {
  id: string;
  title: string;
  youtubeId: string;
  watched: boolean;
}

interface EpisodeCarouselProps {
  episodes: CarouselEpisode[];
  onPlay: (youtubeId: string, title: string) => void;
  onToggleWatched: (episodeId: string) => void;
}

// YouTube serves thumbnails straight off img.youtube.com — no API key and no
// next/image domain config needed, so a plain <img> is the right call here.
const thumbUrl = (youtubeId: string) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

export default function EpisodeCarousel({
  episodes,
  onPlay,
  onToggleWatched,
}: EpisodeCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const watchedCount = episodes.filter((e) => e.watched).length;
  const total = episodes.length;
  const remaining = total - watchedCount;
  const pct = total > 0 ? (watchedCount / total) * 100 : 0;

  // A single video has nothing to page through, so it renders bare (no arrows,
  // no counter) — see updateArrows staying false.
  const isSingle = total <= 1;

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el || isSingle) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrowClass =
    "flex-shrink-0 w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center transition-all hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] disabled:opacity-25 disabled:cursor-not-allowed";

  return (
    <div className="mt-3">
      {/* Progress: watched count + bar. Hidden for single-video modules. */}
      {!isSingle && (
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1.5 flex-1 rounded-full bg-[var(--surface-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="flex-shrink-0 text-xs text-[var(--muted)] tabular-nums">
            {watchedCount} of {total} watched
            {remaining > 0 && ` · ${remaining} left`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* A single video has nothing to page through, so the arrows go
            invisible rather than unmounting. Keeping their slot in the row
            means the tile computes the same width as a tile inside a real
            carousel, instead of stretching into the space they vacated. */}
        <button
          type="button"
          aria-label="Previous videos"
          onClick={() => scrollByCards(-1)}
          disabled={isSingle || !canScrollLeft}
          aria-hidden={isSingle}
          tabIndex={isSingle ? -1 : 0}
          className={`${arrowClass} ${isSingle ? "invisible" : ""}`}
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory flex-1"
        >
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="snap-start flex-shrink-0 w-[78%] sm:w-[48%] lg:w-[31.5%]"
            >
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => onPlay(ep.youtubeId, ep.title)}
                  aria-label={`Play ${ep.title}`}
                  className="block w-full overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(ep.youtubeId)}
                    alt=""
                    loading="lazy"
                    className={`w-full aspect-video object-cover transition-all duration-300 group-hover:scale-105 ${
                      ep.watched ? "opacity-50" : ""
                    }`}
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </span>
                  </span>
                </button>

                {/* Watched toggle */}
                <button
                  type="button"
                  onClick={() => onToggleWatched(ep.id)}
                  aria-label={ep.watched ? `Mark ${ep.title} unwatched` : `Mark ${ep.title} watched`}
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    ep.watched
                      ? "bg-green-500 border-green-500"
                      : "bg-black/60 border-white/60 hover:border-white"
                  }`}
                >
                  {ep.watched && <Check className="w-3.5 h-3.5 text-black" />}
                </button>
              </div>

              <p
                className={`mt-2 text-xs leading-snug ${
                  ep.watched ? "text-green-400" : "text-gray-300"
                }`}
              >
                {ep.title}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="More videos"
          onClick={() => scrollByCards(1)}
          disabled={isSingle || !canScrollRight}
          aria-hidden={isSingle}
          tabIndex={isSingle ? -1 : 0}
          className={`${arrowClass} ${isSingle ? "invisible" : ""}`}
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
