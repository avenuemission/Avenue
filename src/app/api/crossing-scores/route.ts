import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, serverError, tooMany } from "@/lib/server/http";
import { bestPerInitials, parseScoreSubmission, type LeaderboardEntry } from "@/lib/domain/crossing/scores";

// The Cross the Avenue leaderboard on /vision. Public: anyone can read the
// top 10 and post a score. The score rules live in lib/domain/crossing.
// Every score is kept (the admin Game scores tab lists them all); the board
// shows each set of initials once, at its best.

// Enough best-first rows to find 10 different initials even when a few
// players have hundreds of games each.
const SCAN_ROWS = 1000;

async function topScores(): Promise<{ top: LeaderboardEntry[] } | { error: unknown }> {
  const { data, error } = await getSupabaseAdmin()
    .from("crossing_scores")
    .select("initials, score, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(SCAN_ROWS);
  if (error) return { error };
  return { top: bestPerInitials((data ?? []) as LeaderboardEntry[]) };
}

// GET /api/crossing-scores: the top 10, highest first
export async function GET() {
  const board = await topScores();
  if ("error" in board) return serverError("crossing-scores GET", board.error);
  return NextResponse.json({ top: board.top });
}

// POST /api/crossing-scores: { initials, score, durationMs }, answers with
// the new top 10
export async function POST(request: NextRequest) {
  try {
    const parsed = parseScoreSubmission(await request.json().catch(() => null));
    if (!parsed.ok) return jsonError(400, parsed.error);

    if (!(await allow(RATE.crossingScore, clientIp(request)))) return tooMany();

    const { initials, score, durationMs } = parsed.value;
    const { error } = await getSupabaseAdmin()
      .from("crossing_scores")
      .insert({ initials, score, duration_ms: durationMs });
    if (error) return serverError("crossing-scores insert", error);

    const board = await topScores();
    if ("error" in board) return serverError("crossing-scores POST read", board.error);
    return NextResponse.json({ ok: true, top: board.top });
  } catch (error) {
    return serverError("crossing-scores POST", error);
  }
}
