// Cross the Avenue leaderboard rules: what a score submission must look like
// and which initials are refused. Pure; the route and the game both use it.
import { MAX_HOPS_PER_SECOND } from "./world";

export const LEADERBOARD_SIZE = 10;
const MAX_SCORE = 9999;
const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 2 * 60 * 60 * 1000;

// Three-letter combinations that read as rude or hateful. Initials are the
// only text a player can enter, so this list is the whole filter. Admins
// can still delete anything that slips through.
const BLOCKED = new Set([
  "ASS", "CUM", "CNT", "COK", "DIC", "DIK", "DIX", "FAG", "FCK", "FKU", "FUC",
  "FUK", "FUX", "FXK", "HOE", "JIZ", "KKK", "KYS", "NGR", "NIG", "NUT",
  "PEE", "PIS", "POO", "PUS", "SEX", "SHT", "SXY", "TIT", "VAG", "WTF", "XXX",
]);

interface ScoreSubmission {
  initials: string;
  score: number;
  durationMs: number;
}

export interface LeaderboardEntry {
  initials: string;
  score: number;
  created_at: string;
}

type Parsed = { ok: true; value: ScoreSubmission } | { ok: false; error: string };

// Upper-cases and trims typed initials. Anything but exactly three letters
// A to Z is null.
export function normaliseInitials(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const initials = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(initials) ? initials : null;
}

export function initialsAllowed(initials: string): boolean {
  return !BLOCKED.has(initials);
}

// The most streets anyone could cross in `durationMs` at the fastest hop
// rate, plus one for the hop that starts the clock.
export function maxPossibleScore(durationMs: number): number {
  return Math.floor((durationMs / 1000) * MAX_HOPS_PER_SECOND) + 1;
}

function isWhole(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function parseScoreSubmission(body: unknown): Parsed {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: "Invalid score" };
  const { initials: rawInitials, score, durationMs } = body as Record<string, unknown>;

  const initials = normaliseInitials(rawInitials);
  if (initials === null) return { ok: false, error: "Initials must be three letters" };
  if (!initialsAllowed(initials)) return { ok: false, error: "Please choose different initials" };
  if (!isWhole(score, 1, MAX_SCORE)) return { ok: false, error: "Invalid score" };
  if (!isWhole(durationMs, MIN_DURATION_MS, MAX_DURATION_MS)) return { ok: false, error: "Invalid game length" };
  if (score > maxPossibleScore(durationMs)) return { ok: false, error: "That score doesn't look right" };

  return { ok: true, value: { initials, score, durationMs } };
}

// Whether a score would make the board. Ties go to whoever got there first,
// so an equal score only qualifies while the board has room.
export function qualifies(score: number, board: readonly { score: number }[]): boolean {
  if (score < 1) return false;
  if (board.length < LEADERBOARD_SIZE) return true;
  return score > board[board.length - 1].score;
}

// The leaderboard shows each set of initials once, at its best score, so one
// player can't fill the board. `rows` must already be sorted best first
// (score high to low, then earliest first), so the first row seen for a set
// of initials is its best, and an earlier score wins a tie.
export function bestPerInitials<T extends { initials: string }>(rows: readonly T[], size: number = LEADERBOARD_SIZE): T[] {
  const seen = new Set<string>();
  const board: T[] = [];
  for (const row of rows) {
    if (seen.has(row.initials)) continue;
    seen.add(row.initials);
    board.push(row);
    if (board.length === size) break;
  }
  return board;
}
