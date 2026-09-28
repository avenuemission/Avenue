"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { Lightbulb, Trophy } from "lucide-react";
import {
  COLS,
  MIN_HOP_MS,
  START_COL,
  ensureRows,
  hitAt,
  hitMessage,
  hop,
  newWorld,
  streetlightsLit,
  type Hit,
  type Player,
  type World,
} from "@/lib/domain/crossing/world";
import { normaliseInitials, qualifies, type LeaderboardEntry } from "@/lib/domain/crossing/scores";
import { drawScene } from "./crossingDraw";

// Cross the Avenue: loaded only after a visitor presses Play on /vision.
// The rules are in lib/domain/crossing; this component runs the clock,
// reads the controls, draws each frame and talks to /api/crossing-scores.

const HOP_ANIM_MS = 90;
const SWIPE_PX = 24;
const BEST_KEY = "avenue_crossing_best";
const SCORES_API = "/api/crossing-scores";

type Status = "playing" | "paused" | "over";

interface Game {
  world: World;
  player: Player;
  from: Player;
  furthest: number;
  // Playing time in ms. It stops while paused, so traffic freezes too.
  elapsed: number;
  lastHop: number;
  hops: number;
  cam: number;
}

function freshGame(): Game {
  const start = { col: START_COL, row: 0 };
  return { world: newWorld(Date.now()), player: start, from: start, furthest: 0, elapsed: 0, lastHop: 0, hops: 0, cam: 0 };
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(best: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private windows can refuse storage; the best score just won't stick.
  }
}

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, 1],
  w: [0, 1],
  W: [0, 1],
  ArrowDown: [0, -1],
  s: [0, -1],
  S: [0, -1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  A: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
  D: [1, 0],
};

export default function CrossingGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(freshGame());
  const statusRef = useRef<Status>("playing");
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const [status, setStatusState] = useState<Status>("playing");
  const [score, setScore] = useState(0);
  const [lit, setLit] = useState(0);
  const [hit, setHit] = useState<Hit | null>(null);
  const [best, setBest] = useState(readBest);
  const [duration, setDuration] = useState(0);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [boardError, setBoardError] = useState(false);
  const [initials, setInitials] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ initials: string; score: number } | null>(null);

  const setStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const loadBoard = useCallback(() => {
    fetch(SCORES_API)
      .then(async (res) => {
        if (!res.ok) throw new Error(`leaderboard ${res.status}`);
        const body = (await res.json()) as { top: LeaderboardEntry[] };
        setBoard(body.top);
        setBoardError(false);
      })
      .catch((e: unknown) => {
        console.error("crossing: leaderboard load failed", e);
        setBoardError(true);
      });
  }, []);

  useEffect(() => {
    loadBoard();
    wrapRef.current?.focus({ preventScroll: true });
  }, [loadBoard]);

  const die = useCallback(
    (by: Hit) => {
      const game = gameRef.current;
      setStatus("over");
      setHit(by);
      setDuration(Math.round(game.elapsed));
      const previous = readBest();
      if (game.furthest > previous) saveBest(game.furthest);
      setBest(Math.max(previous, game.furthest));
    },
    [setStatus]
  );

  const move = useCallback(
    (dCol: number, dRow: number) => {
      const game = gameRef.current;
      if (statusRef.current !== "playing") return;
      if (game.hops > 0 && game.elapsed - game.lastHop < MIN_HOP_MS) return;
      const next = hop(game.world, game.player, dCol, dRow);
      if (next === game.player) return;
      game.from = game.player;
      game.player = next;
      game.lastHop = game.elapsed;
      game.hops += 1;
      if (next.row > game.furthest) {
        game.furthest = next.row;
        ensureRows(game.world, next.row + 40);
        setScore(next.row);
        setLit(streetlightsLit(game.world, next.row));
      }
      const struck = hitAt(game.world, next, game.elapsed / 1000);
      if (struck) die(struck);
    },
    [die]
  );

  const restart = useCallback(() => {
    gameRef.current = freshGame();
    setScore(0);
    setLit(0);
    setHit(null);
    setInitials("");
    setSubmitError(null);
    setSubmitted(null);
    setStatus("playing");
    wrapRef.current?.focus({ preventScroll: true });
  }, [setStatus]);

  // Pause when the game scrolls out of view or the tab is hidden, so no
  // one comes back to a crash they never saw.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const pause = () => {
      if (statusRef.current === "playing") setStatus("paused");
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) pause();
    });
    observer.observe(wrap);
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [setStatus]);

  // The frame loop: advance the clock, check for a hit, move the camera,
  // draw. The canvas matches its box, which the section sizes by aspect.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const game = gameRef.current;

      if (statusRef.current === "playing") {
        game.elapsed += dt;
        const struck = hitAt(game.world, game.player, game.elapsed / 1000);
        if (struck) die(struck);
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const tile = width / COLS;
      const rows = height / tile;
      const target = Math.max(0, game.player.row - rows * 0.3);
      game.cam = reduceMotion ? target : game.cam + (target - game.cam) * Math.min(1, dt / 140);

      const t = Math.min(1, (game.elapsed - game.lastHop) / HOP_ANIM_MS);
      const x = game.from.col + (game.player.col - game.from.col) * t;
      const y = game.from.row + (game.player.row - game.from.row) * t;
      drawScene(ctx, { width, height, tile, camRow: game.cam }, {
        world: game.world,
        seconds: game.elapsed / 1000,
        furthestRow: game.furthest,
        x,
        y,
        lift: reduceMotion ? 0 : Math.sin(t * Math.PI),
        dead: statusRef.current === "over",
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [die]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "BUTTON") return;
    if (statusRef.current === "paused") {
      e.preventDefault();
      setStatus("playing");
      return;
    }
    if (statusRef.current === "over" && e.key === " ") {
      e.preventDefault();
      restart();
      return;
    }
    const step = KEYS[e.key];
    if (!step) return;
    e.preventDefault();
    move(step[0], step[1]);
  };

  // A tap hops forward; a swipe hops that way.
  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    pointerRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start) return;
    if (statusRef.current === "paused") {
      setStatus("playing");
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) move(0, 1);
    else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
    else move(0, dy < 0 ? 1 : -1);
  };

  const canSubmit =
    status === "over" && submitted === null && duration >= 1000 && board !== null && qualifies(score, board);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = normaliseInitials(initials);
    if (!clean) {
      setSubmitError("Please enter three letters.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(SCORES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initials: clean, score, durationMs: duration }),
      });
      const body = (await res.json().catch(() => null)) as { top?: LeaderboardEntry[]; error?: string } | null;
      if (!res.ok || !body?.top) {
        setSubmitError(body?.error ? `${body.error}.` : "Could not save your score. Please try again.");
        return;
      }
      setBoard(body.top);
      setSubmitted({ initials: clean, score });
    } catch {
      setSubmitError("Could not save your score. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const mine = submitted ? board?.findIndex((r) => r.initials === submitted.initials && r.score === submitted.score) ?? -1 : -1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] items-start">
      <div
        ref={wrapRef}
        tabIndex={0}
        role="group"
        aria-label="Cross the Avenue game"
        aria-describedby="crossing-help"
        onKeyDown={onKeyDown}
        className="relative aspect-[4/5] sm:aspect-[8/5] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--night)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="absolute inset-0 h-full w-full touch-none select-none"
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col rounded-xl bg-black/55 px-3 py-2">
          <span className="text-4xl font-extrabold leading-none text-white tabular-nums">{score}</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Best {Math.max(best, score)}</span>
        </div>
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-[var(--lamp)]/30 bg-[var(--lamp-soft)] px-3 py-1.5">
          <Lightbulb className="h-4 w-4 text-[var(--lamp)]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[var(--lamp-2)] tabular-nums">{lit} lit</span>
        </div>

        {status === "paused" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <button
              type="button"
              onClick={() => {
                setStatus("playing");
                wrapRef.current?.focus({ preventScroll: true });
              }}
              className="min-h-[44px] rounded-full bg-white px-7 text-sm font-bold uppercase tracking-wider text-black"
            >
              Resume
            </button>
          </div>
        )}

        {status === "over" && hit && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-4">
            <div className="w-full max-w-xs rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{hitMessage(hit)}</p>
              <p className="mt-2 text-6xl font-extrabold leading-none text-white tabular-nums">{score}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {score === 1 ? "street" : "streets"} crossed · best {best}
              </p>
              {lit > 0 && <p className="mt-1 text-sm text-[var(--lamp-2)]">You lit {lit} streetlights</p>}

              {canSubmit && (
                <form onSubmit={submit} className="mt-5 flex flex-col items-center gap-2">
                  <label htmlFor="crossing-initials" className="text-sm font-semibold text-white">
                    You made the top 10! Your initials:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="crossing-initials"
                      value={initials}
                      onChange={(e) => setInitials(e.target.value.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase())}
                      maxLength={3}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="w-24 rounded-lg border border-[var(--border-strong)] bg-black/40 px-3 py-2 text-center text-lg font-bold tracking-[0.3em] text-white focus:border-[var(--accent)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submitting || initials.length !== 3}
                      className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {submitting ? "Saving" : "Save"}
                    </button>
                  </div>
                  {submitError && (
                    <p role="alert" className="text-sm text-red-400">
                      {submitError}
                    </p>
                  )}
                </form>
              )}
              {submitted && <p className="mt-4 text-sm font-semibold text-[var(--lamp-2)]">Saved to the leaderboard.</p>}

              <button
                type="button"
                onClick={restart}
                className="mt-5 min-h-[44px] rounded-full bg-white px-7 text-sm font-bold uppercase tracking-wider text-black"
              >
                Play again
              </button>
            </div>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {status === "over" && hit ? `${hitMessage(hit)}. You crossed ${score} streets.` : ""}
        </p>
      </div>

      <aside aria-labelledby="crossing-board" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 id="crossing-board" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-white">
          <Trophy className="h-4 w-4 text-[var(--lamp)]" aria-hidden="true" />
          Top 10
        </h3>
        {boardError ? (
          <p className="mt-4 text-sm text-[var(--muted)]">The leaderboard is unavailable right now.</p>
        ) : board === null ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>
        ) : board.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No scores yet. Be the first.</p>
        ) : (
          <ol className="mt-4 space-y-1.5">
            {board.map((row, i) => (
              <li
                key={`${row.initials}-${row.score}-${row.created_at}`}
                className={`flex items-center gap-3 rounded-lg px-2 py-1 text-sm tabular-nums ${
                  i === mine ? "bg-[var(--lamp-soft)] text-[var(--lamp-2)]" : "text-[var(--ink-2)]"
                }`}
              >
                <span className="w-5 text-right text-[var(--dim)]">{i + 1}</span>
                <span className="font-mono font-semibold tracking-[0.2em]">{row.initials}</span>
                <span className="ml-auto font-semibold">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
