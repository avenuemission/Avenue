import { jsonBody } from "@/lib/client/jsonBody";
import type { SurveyAnswers } from "@/lib/domain/workshops/survey";

// The server's own 429 text (lib/server/http.ts tooMany), repeated here
// because that file is server-only.
export const TOO_MANY_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

export type CodeCheck =
  | { kind: "valid"; code: string; includeLife3: boolean }
  | { kind: "invalid"; error: string; suggestion?: string }
  // Not a verdict on the code: rate limited, server down or offline.
  | { kind: "unavailable"; error: string };

const CHECK_UNAVAILABLE = "We couldn't check the code just now. Please try again.";

// Checks a workshop session code. Never throws and always settles, so the
// Check button can never stay stuck.
export async function checkSessionCode(code: string, fetchFn: typeof fetch = fetch): Promise<CodeCheck> {
  let res: Response;
  try {
    res = await fetchFn("/api/workshops/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { kind: "unavailable", error: CHECK_UNAVAILABLE };
  }
  if (res.status === 429) return { kind: "unavailable", error: TOO_MANY_MESSAGE };
  const data = await jsonBody(res);
  if (res.ok && data?.valid === true && typeof data.code === "string") {
    return { kind: "valid", code: data.code, includeLife3: data.include_life_3 !== false };
  }
  if ((res.ok || res.status === 400) && data?.valid === false) {
    const error = typeof data.error === "string" && data.error ? data.error : "Invalid code";
    return typeof data.suggestion === "string" && data.suggestion
      ? { kind: "invalid", error, suggestion: data.suggestion }
      : { kind: "invalid", error };
  }
  return { kind: "unavailable", error: CHECK_UNAVAILABLE };
}

// What Submit does: post with a confirmed code; ask for the code when one
// was typed but never confirmed (a failed check clears it), rather than
// dropping the answers and showing "submitted"; skip the post only when the
// person is taking the survey on their own (no code typed).
export function planSubmit(sessionCode: string, sessionCodeInput: string): "post" | "skip" | "needCode" {
  if (sessionCode) return "post";
  return sessionCodeInput.trim() ? "needCode" : "skip";
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

// Saves one survey response. Ok only when the server confirms the save.
// Never throws, so Submitting... always ends.
export async function submitSurvey(sessionCode: string, surveyData: SurveyAnswers, fetchFn: typeof fetch = fetch): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetchFn("/api/workshops/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, surveyData }),
    });
  } catch {
    return { ok: false, error: "Your answers were not saved: we couldn't reach the server. Check your connection and try again." };
  }
  if (res.status === 429) return { ok: false, error: `Your answers were not saved. ${TOO_MANY_MESSAGE}` };
  const data = await jsonBody(res);
  if (res.ok && data?.success === true) return { ok: true };
  return { ok: false, error: "Your answers were not saved. Please try again." };
}
