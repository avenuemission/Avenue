"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { shuffledOptions, type VideoQuestion } from "@/lib/domain/trainingContent";

interface VideoQuestionDialogProps {
  videoTitle: string;
  question: VideoQuestion;
  // Done: tick the video. Close (X, Escape, the backdrop): leave it unticked.
  onDone: () => void;
  onClose: () => void;
}

// The comprehension pop-up when a leader ticks a Foundations video: one
// question, three options in a fresh order. Any tap reveals the right
// answer and why. No score and no wrong state; nothing is saved but the tick.
export default function VideoQuestionDialog({ videoTitle, question, onDone, onClose }: VideoQuestionDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [options] = useState(() => shuffledOptions(question));
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="av-dialog"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the backdrop lands on the dialog element itself.
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="night-label pt-1">{videoTitle}</p>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close without ticking"
          className="-mr-3 -mt-3 flex h-11 w-11 flex-none items-center justify-center text-[var(--muted)] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <h2 id={titleId} className="mt-1 font-sans text-lg font-semibold leading-snug text-[var(--ink)]">
        {question.question}
      </h2>

      <ul className="mt-4 space-y-2">
        {options.map((option, i) => {
          const showRight = answered && option.correct;
          const showPicked = answered && i === picked && !option.correct;
          return (
            <li key={option.text}>
              <button
                type="button"
                onClick={() => setPicked(i)}
                disabled={answered}
                aria-pressed={i === picked}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors ${
                  showRight
                    ? "border-[var(--lamp)] bg-[var(--lamp-soft)] text-[var(--ink)]"
                    : showPicked
                      ? "border-[var(--line-2)] text-[var(--muted)]"
                      : answered
                        ? "border-[var(--line)] text-[var(--muted)]"
                        : "border-[var(--line-2)] text-[var(--ink)] hover:border-[var(--lamp)]"
                }`}
              >
                <span className="flex-1">{option.text}</span>
                {showRight && <Check className="h-5 w-5 flex-none text-[var(--lamp)]" aria-label="Right answer" />}
              </button>
            </li>
          );
        })}
      </ul>

      {answered ? (
        <div aria-live="polite">
          {question.explanation && <p className="mt-4 text-sm text-[var(--ink-2)]">{question.explanation}</p>}
          <button
            type="button"
            onClick={onDone}
            autoFocus
            className="btn-lamp mt-5 min-h-[48px] w-full text-sm"
          >
            Done
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">Tap an answer to see the right one.</p>
      )}
    </dialog>
  );
}
