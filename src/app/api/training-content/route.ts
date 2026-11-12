import { NextRequest, NextResponse } from "next/server";
import { requireLeader } from "@/lib/server/requireLeader";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { serverError } from "@/lib/server/http";
import { toModulePrompt, toVideoQuestion, type ModulePrompt, type VideoQuestion } from "@/lib/domain/trainingContent";

// GET /api/training-content: the Foundations video questions and the
// discussion cards, for any leader (pending or full). Edited in the
// Supabase Table Editor, so a change shows on the next page load.
export async function GET(request: NextRequest) {
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const db = getSupabaseAdmin();
  const [q, p] = await Promise.all([
    db.from("training_video_questions").select("youtube_id, question, options, correct_index, explanation").order("sort_order", { ascending: true }),
    db.from("training_module_prompts").select("module, discussion_question, hint, passage"),
  ]);
  if (q.error) return serverError("training-content questions", q.error);
  if (p.error) return serverError("training-content prompts", p.error);

  const questions = ((q.data ?? []) as Record<string, unknown>[]).map(toVideoQuestion).filter((x): x is VideoQuestion => x !== null);
  const prompts = ((p.data ?? []) as Record<string, unknown>[]).map(toModulePrompt).filter((x): x is ModulePrompt => x !== null);
  return NextResponse.json({ questions, prompts });
}
