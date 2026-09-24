import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { allow, RATE } from "@/lib/server/rateLimit";
import { clientIp } from "@/lib/server/clientIp";
import { jsonError, serverError, tooMany } from "@/lib/server/http";

const CODE_MAX = 64;

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
  // allow() throws if the limiter itself is down: a JSON 500, never a
  // bodyless one and never an unlimited check.
  try {
    if (!(await allow(RATE.workshopCode, clientIp(request)))) return tooMany();
  } catch (error) {
    return serverError("workshops/validate-code rate limit", error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid request");
  }

  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code !== "string" || !code.trim() || code.length > CODE_MAX) {
    return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();
  const db = getSupabaseAdmin();

  // Exact match first
  const { data: exact, error: exactError } = await db
    .from("workshop_sessions")
    .select("code, status, include_life_3")
    .eq("code", normalized)
    .single();

  if (exactError && exactError.code !== "PGRST116") {
    return serverError("workshops/validate-code POST (exact)", exactError);
  }

  if (exact) {
    return NextResponse.json({ valid: true, code: exact.code, include_life_3: exact.include_life_3 });
  }

  // Fuzzy match: find the closest active session code
  const { data: allSessions, error: sessionsError } = await db
    .from("workshop_sessions")
    .select("code")
    .eq("status", "active");

  if (sessionsError) {
    return serverError("workshops/validate-code POST (fuzzy)", sessionsError);
  }

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
