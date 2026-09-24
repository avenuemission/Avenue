"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { isPlaceholderThumb, nextThumbSize, THUMB_ORDER, thumbUrl, type ThumbSize } from "@/lib/domain/youtubeThumb";

interface CarouselEpisode {
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

// YouTube serves thumbnails straight off img.youtube.com with no API key, so
// they are served as-is (unoptimized): no next/image domain config needed.
// Starts at the 16:9 maxresdefault and steps down on a 404 or on YouTube's
// 120 px grey placeholder (round 3 spec 1). The carousel mounts only on the
// client, after the leader gate, so onError and onLoad always fire here.
function EpisodeThumb({ youtubeId, dimmed }: { youtubeId: string; dimmed: boolean }) {
  const [size, setSize] = useState<ThumbSize>(THUMB_ORDER[0]);
  const fallBack = () => {
    const next = nextThumbSize(size);
    if (next) setSize(next);
    else console.error(`EpisodeCarousel: no thumbnail loaded for YouTube video ${youtubeId}`);
  };
  return (
    <Image
      src={thumbUrl(youtubeId, size)}
      alt=""
      width={1280}
      height={720}
      unoptimized
      onError={fallBack}
      onLoad={(e) => {
        if (isPlaceholderThumb(e.currentTarget.naturalWidth)) fallBack();
      }}
      className={`w-full aspect-video object-cover ${dimmed ? "opacity-50" : ""}`}
    />
  );
}

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
  // no counter): the arrows effect below returns before tracking scroll.
  const isSingle = total <= 1;

  // Re-run when the episode count changes: the scroll width changes with it.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || isSingle) return;
    const updateArrows = () => {
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [total, isSingle]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrowClass =
    "flex-shrink-0 w-11 h-11 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center transition-all hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] disabled:opacity-25 disabled:cursor-not-allowed";

  return (
    <div className="mt-3">
      {/* Progress: watched count + bar. Hidden for single-video modules. */}
      {!isSingle && (
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1.5 flex-1 rounded-full bg-[var(--line-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--lamp)]"
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
                  className="block w-full overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
                >
                  <EpisodeThumb key={ep.youtubeId} youtubeId={ep.youtubeId} dimmed={ep.watched} />
                  <span className="absolute left-2 bottom-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                  </span>
                </button>

                {/* Watched toggle: 44px hit area, 24px visual circle inside */}
                <button
                  type="button"
                  onClick={() => onToggleWatched(ep.id)}
                  aria-label={ep.watched ? `Mark ${ep.title} unwatched` : `Mark ${ep.title} watched`}
                  className="absolute top-0 right-0 h-11 w-11 flex items-center justify-center"
                >
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      ep.watched
                        ? "bg-[var(--lamp)] border-[var(--lamp)]"
                        : "bg-black/60 border-white/60 hover:border-white"
                    }`}
                  >
                    {ep.watched && <Check className="w-3.5 h-3.5 text-black" />}
                  </span>
                </button>
              </div>

              <p
                className={`mt-2 text-xs leading-snug ${
                  ep.watched ? "text-[var(--lamp)]" : "text-gray-300"
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
