"use client";

import { useRef, useState } from "react";
import type { StepProps } from "@/components/leaders/journey/WizardShell";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import { callingSectionComplete, type CallingData } from "@/lib/domain/journey";
import { APEST_ORDER, QUESTIONS, SCALE_OPTIONS, scoreApest, topTwoRoles, type RoleKey } from "@/lib/domain/apest";
import { APEST_CALLING_TEXT } from "@/content/calling";

type Apest = NonNullable<CallingData["apest"]>;

// Saved data arrives as JSON, so only a whole number 1 to 5 counts as answered.
function isAnswer(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

// Always 20 long, 0 where a question is unanswered.
function fullAnswers(saved: unknown): number[] {
  const list = Array.isArray(saved) ? saved : [];
  return QUESTIONS.map((_, i) => (isAnswer(list[i]) ? list[i] : 0));
}

function isRole(value: unknown): value is RoleKey {
  return typeof value === "string" && (APEST_ORDER as string[]).includes(value);
}

// Asks the same OpenAI route the public quiz uses for a personal reflection
// on these results. Costs one gpt-4o call, so it runs once per result set:
// automatically when the quiz is scored, or when the leader asks after a
// failure. Throws with a readable message on any failure.
async function fetchReflection(results: Apest["results"]): Promise<string> {
  const res = await fetch("/api/apest-results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.response !== "string" || !data.response.trim()) {
    throw new Error(typeof data.error === "string" ? data.error : `Reflection request failed (${res.status})`);
  }
  return data.response.trim();
}

// Section 4: the APEST quiz, scored on the device. The result cards are
// Henry's own words from content.ts. Henry switched on (24 Sep) the same
// personal AI reflection the public quiz page shows, saved with the
// results so it is written once, not on every visit.
export default function ApestStep({ value, save, finish }: StepProps<Apest>) {
  const [index, setIndex] = useState(() => {
    const first = fullAnswers(value?.answers).findIndex((a) => a === 0);
    return first === -1 ? QUESTIONS.length : first;
  });
  const [reflecting, setReflecting] = useState(false);
  const [reflectError, setReflectError] = useState<string | null>(null);
  // Bumped on every new request and on retake, so a reflection that comes
  // back after the leader retook the quiz is dropped, not saved over it.
  const requestIdRef = useRef(0);

  const requestReflection = async (base: Apest) => {
    const id = ++requestIdRef.current;
    setReflecting(true);
    setReflectError(null);
    try {
      const reflection = await fetchReflection(base.results);
      if (id === requestIdRef.current) save({ ...base, reflection });
    } catch (e) {
      console.error("APEST reflection failed", e);
      if (id === requestIdRef.current) {
        setReflectError("We couldn't write your personal reflection just now. Your results are saved. Try again below.");
      }
    } finally {
      if (id === requestIdRef.current) setReflecting(false);
    }
  };

  const hasResults = callingSectionComplete("apest", { apest: value });

  if (hasResults && value?.results) {
    const results = value.results;
    const savedTop = value.top;
    const top: RoleKey[] =
      Array.isArray(savedTop) && savedTop.length >= 2 && isRole(savedTop[0]) && isRole(savedTop[1])
        ? [savedTop[0], savedTop[1]]
        : topTwoRoles(results);

    const retake = () => {
      requestIdRef.current++;
      setReflecting(false);
      setReflectError(null);
      save({ answers: [] });
      setIndex(0);
    };

    return (
      <div className="space-y-6">
        <div className="panel p-4 md:p-5 space-y-3">
          <p className="eyebrow">Your results</p>
          {APEST_ORDER.map((role) => {
            const pct = Math.max(0, Math.min(100, results[role]));
            return (
              <div key={role}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{APEST_CALLING_TEXT[role].name}</span>
                  <span className="tabular-nums text-[var(--muted)]">{pct}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full border border-[var(--border)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {top.map((role) => {
            const text = APEST_CALLING_TEXT[role];
            return (
              <div key={role} className="panel p-4 md:p-5">
                <p className="eyebrow">Your gift</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{text.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{text.calling}</p>
                <p className="mt-2 text-sm leading-relaxed text-white">{text.equips}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{text.seesChurch}</p>
                <p className="mt-3 text-sm leading-relaxed text-amber-400">
                  <span className="font-semibold">Watch for: </span>
                  {text.immature}
                </p>
              </div>
            );
          })}
        </div>

        <div className="panel p-4 md:p-5">
          <p className="eyebrow">A personal reflection</p>
          {typeof value.reflection === "string" && value.reflection ? (
            <>
              <div className="mt-2 space-y-3">
                {value.reflection
                  .split(/\n\s*\n/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-gray-300">
                      {para}
                    </p>
                  ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">Written by AI from your results. Talk it over with your coach.</p>
            </>
          ) : reflecting ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Writing your personal reflection...</p>
          ) : (
            <>
              {reflectError ? <p className="mt-2 text-sm text-amber-400">{reflectError}</p> : null}
              <button
                type="button"
                onClick={() => requestReflection(value)}
                className="mt-3 min-h-[44px] rounded-full border border-[var(--border)] px-5 text-sm font-semibold text-white"
              >
                Write my personal reflection
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={retake}
          className="min-h-[44px] text-sm font-semibold text-[var(--muted)] underline underline-offset-4"
        >
          Retake the quiz
        </button>

        <OutcomeButton label="Keep my gifts" onClick={finish} />
      </div>
    );
  }

  // Quiz view. If all 20 are saved but no results (an interrupted save),
  // stay on the last question so one tap scores it.
  const at = Math.min(index, QUESTIONS.length - 1);
  const answers = fullAnswers(value?.answers);
  const question = QUESTIONS[at];
  const isLast = at === QUESTIONS.length - 1;

  const answer = (option: number) => {
    const next = [...answers];
    next[at] = option;
    if (!isLast) {
      save({ answers: next });
      setIndex(at + 1);
    } else {
      const results = scoreApest(next);
      const scored: Apest = { answers: next, results, top: topTwoRoles(results) };
      save(scored);
      void requestReflection(scored);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">
          Question {at + 1} of {QUESTIONS.length}
        </p>
        <div
          className="mt-2 h-1.5 w-full rounded-full border border-[var(--border)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={at}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${(at / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white leading-relaxed">{question.text}</h3>

      <div className="space-y-2">
        {SCALE_OPTIONS.map((option) => {
          const pressed = answers[at] === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => answer(option.value)}
              className={`min-h-[44px] w-full text-left rounded-lg border px-4 py-2 text-sm font-semibold text-white ${
                pressed ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {at > 0 ? (
        <button
          type="button"
          onClick={() => setIndex(at - 1)}
          className="min-h-[44px] text-sm font-semibold text-[var(--muted)] underline underline-offset-4"
        >
          Back
        </button>
      ) : null}
    </div>
  );
}
