"use client";

import { useEffect, useState } from "react";
import { dedupedLeaderJson } from "@/lib/client/dedupeFetch";
import type { ModulePrompt, TrainingContent, VideoQuestion } from "@/lib/domain/trainingContent";

// The Foundations video questions and the discussion cards, read once per
// page load from /api/training-content (shared between callers). A failed
// read leaves both empty and sets `error`: the cards then don't show, and
// ticking a video ticks it straight away (the question is a bonus, never a
// gate).
export function useTrainingContent(ready: boolean): {
  question: (youtubeId: string) => VideoQuestion | null;
  prompt: (key: string) => ModulePrompt | null;
  error: boolean;
} {
  const [content, setContent] = useState<TrainingContent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    dedupedLeaderJson<TrainingContent>("/api/training-content", 60_000).then(
      (data) => {
        if (!cancelled) setContent(data);
      },
      (e: unknown) => {
        console.error("useTrainingContent: could not load the training questions", e);
        if (!cancelled) setError(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return {
    question: (youtubeId) => content?.questions.find((q) => q.youtubeId === youtubeId) ?? null,
    prompt: (key) => content?.prompts.find((p) => p.module === key) ?? null,
    error,
  };
}
