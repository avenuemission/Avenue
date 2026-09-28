"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";

// The Vision page's closing novelty. Until Play is pressed this is a still
// street drawn in markup, so the page downloads no game code and runs no
// animation for visitors who never play.
const CrossingGame = dynamic(() => import("./CrossingGame"), { ssr: false, loading: () => <Street busy /> });

// Bottom to top, as the game draws them.
const LANES = ["path", "road", "road", "path", "tram", "park", "road", "path"] as const;
const LANE_BG: Record<(typeof LANES)[number], string> = {
  path: "bg-[#0e131c]",
  road: "bg-[#080b11]",
  tram: "bg-[#080b11]",
  park: "bg-[#07120d]",
};

// Parked traffic for the still picture: [lane from the bottom, left %, width %, colour].
const CARS: [number, number, number, string][] = [
  [1, 12, 11, "bg-[#4f7cff]"],
  [1, 66, 11, "bg-[#d9dde6]"],
  [2, 38, 14, "bg-[#b8483a]"],
  [6, 20, 11, "bg-[#2b4a8f]"],
  [6, 74, 11, "bg-[#3a4150]"],
];

function Street({ busy = false, onPlay }: { busy?: boolean; onPlay?: () => void }) {
  const lane = 100 / LANES.length;
  return (
    <div className="relative aspect-[4/5] sm:aspect-[8/5] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--night)]">
      <div className="absolute inset-0 flex flex-col-reverse" aria-hidden="true">
        {LANES.map((kind, i) => (
          <div key={i} className={`relative flex-1 ${LANE_BG[kind]}`}>
            {kind === "path" &&
              [10, 50, 90].map((left) => (
                <span
                  key={left}
                  className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
                    i === 0 ? "bg-[var(--lamp)] shadow-[0_0_24px_10px_rgba(255,197,107,0.28)]" : "bg-[var(--line-2)]"
                  }`}
                  style={{ left: `${left}%` }}
                />
              ))}
            {kind === "tram" && (
              <span className="absolute inset-y-[18%] left-[48%] w-[36%] rounded-md bg-[#e9ece4] shadow-[inset_0_-6px_0_#a9b0a0]" />
            )}
            {kind === "park" &&
              [8, 36, 80].map((left) => (
                <span
                  key={left}
                  className="absolute inset-y-[14%] aspect-square rounded-md bg-[#1c4a33] shadow-[inset_0_-5px_0_#123524]"
                  style={{ left: `${left}%` }}
                />
              ))}
          </div>
        ))}
        {CARS.map(([row, left, width, colour]) => (
          <span
            key={`${row}-${left}`}
            className={`absolute rounded-md ${colour} shadow-[inset_0_-6px_0_rgba(0,0,0,0.35)]`}
            style={{ bottom: `${row * lane + lane * 0.18}%`, height: `${lane * 0.64}%`, left: `${left}%`, width: `${width}%` }}
          />
        ))}
        <span
          className="absolute aspect-square rounded-md bg-[#eef1f7] shadow-[inset_0_-6px_0_#aeb6c6]"
          style={{ bottom: `${lane * 0.2}%`, height: `${lane * 0.6}%`, left: "46.5%" }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
        {onPlay ? (
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-8 text-sm font-bold uppercase tracking-wider text-black transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Play
          </button>
        ) : (
          busy && <span className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Loading...</span>
        )}
      </div>
    </div>
  );
}

export default function CrossTheAvenue() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mx-auto max-w-5xl">
      {playing ? (
        <CrossingGame />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] items-start">
          <Street onPlay={() => setPlaying(true)} />
          <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Top 10</h3>
            <p className="mt-4 text-sm text-[var(--muted)]">Can you make the leaderboard? Press Play to see it.</p>
          </aside>
        </div>
      )}
      <p id="crossing-help" className="mt-5 text-center text-sm text-[var(--muted)]">
        Arrow keys or WASD to hop. On a phone, tap to hop forward and swipe to dodge.
      </p>
    </div>
  );
}
