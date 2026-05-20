import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Levenshtein distance for typo detection
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  if (!code) {
    return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();

  // Exact match first
  const { data: exact } = await supabase
    .from("workshop_sessions")
    .select("code, status")
    .eq("code", normalized)
    .single();

  if (exact) {
    return NextResponse.json({ valid: true, code: exact.code });
  }

  // Fuzzy match — find closest active session code
  const { data: allSessions } = await supabase
    .from("workshop_sessions")
    .select("code")
    .eq("status", "active");

  if (!allSessions || allSessions.length === 0) {
    return NextResponse.json({ valid: false, error: "No active sessions found" });
  }

  let closest = allSessions[0].code;
  let minDist = levenshtein(normalized, closest);
  for (const s of allSessions) {
    const d = levenshtein(normalized, s.code);
    if (d < minDist) { minDist = d; closest = s.code; }
  }

  // Within 2 edits = likely typo
  if (minDist <= 2) {
    return NextResponse.json({
      valid: false,
      suggestion: closest,
      error: `Did you mean "${closest}"?`,
    });
  }

  return NextResponse.json({ valid: false, error: "Session code not found" });
}
