// Leader Training questions and discussion cards. The text lives in the
// training_video_questions and training_module_prompts tables (editable in
// the Supabase Table Editor); this file shapes rows for the pages. Pure.

export interface VideoQuestion {
  youtubeId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ModulePrompt {
  module: string;
  discussionQuestion: string | null;
  hint: string | null;
  passage: string | null;
}

export interface TrainingContent {
  questions: VideoQuestion[];
  prompts: ModulePrompt[];
}

// The prompt key for each Foundations module, by the module id in
// content/training/phases.ts.
export const FOUNDATIONS_PROMPT_KEYS: Record<string, string> = {
  p1m0: "avenue-dna",
  p1m1: "pathways",
  p1m2: "intersection",
  p1m3: "streetlights",
};

// One discussion card per Calling section 1 to 5 (section 6 has none).
export function callingSectionPromptKey(sectionIndex: number): string | null {
  return sectionIndex >= 0 && sectionIndex < 5 ? `calling-${sectionIndex + 1}` : null;
}

// The five questions taught in the "Leading a Bible Discussion" video.
export const DISCOVERY_QUESTIONS = [
  "What is new about this passage?",
  "What surprises you?",
  "Is there anything you don't understand?",
  "What will you apply?",
  "What will you share with someone this week?",
] as const;

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// A database row, or null when it can't make a sensible question (fewer
// than two options, or a correct_index outside them).
export function toVideoQuestion(row: Record<string, unknown>): VideoQuestion | null {
  const youtubeId = text(row.youtube_id);
  const question = text(row.question);
  const options = Array.isArray(row.options) ? row.options.map(text) : [];
  const correctIndex = row.correct_index;
  if (!youtubeId || !question || options.length < 2 || options.some((o) => o === null)) return null;
  if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return null;
  }
  return { youtubeId, question, options: options as string[], correctIndex, explanation: text(row.explanation) ?? "" };
}

export function toModulePrompt(row: Record<string, unknown>): ModulePrompt | null {
  const key = text(row.module);
  if (!key) return null;
  return {
    module: key,
    discussionQuestion: text(row.discussion_question),
    hint: text(row.hint),
    passage: text(row.passage),
  };
}

// The options in a fresh random order (Fisher-Yates), each marking whether
// it is the right one. `random` is swappable for tests.
export function shuffledOptions(q: VideoQuestion, random: () => number = Math.random): { text: string; correct: boolean }[] {
  const out = q.options.map((option, i) => ({ text: option, correct: i === q.correctIndex }));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
