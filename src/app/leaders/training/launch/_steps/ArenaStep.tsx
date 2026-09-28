"use client";

import { useState } from "react";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import LampSteps from "@/components/leaders/avenue/LampSteps";
import {
  ARENA_SCORE_INTRO,
  bitesFor,
  COUNTER_KEYS,
  COUNTER_MEANINGS,
  detectGaps,
  GAP_TEXT,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type ArenaState,
  type CounterKey,
} from "@/lib/domain/arena";
import { arenaMonthStatus } from "@/lib/domain/stepStatus";
import type { LaunchData } from "@/lib/domain/journey";
import { CURVEBALLS, DEFAULT_ORDER } from "@/content/arena";

type Arena = NonNullable<LaunchData["arena"]>;

interface ArenaStepProps {
  plan: ArenaPlan;
  value: Arena | undefined;
  save: (value: Arena) => void;
  onShowPlan: () => void;
}

const COUNTER_NAMES: Record<CounterKey, string> = {
  pathways: "Pathways",
  intersections: "Intersections",
  streetlights: "Streetlights",
};

const MONTHS = DEFAULT_ORDER.length;

// The six months as a row of dots: done once played, the month in play
// pulsing mid-run, its label underlined. Display only.
function MonthStreet({ state }: { state: ArenaState }) {
  const steps = DEFAULT_ORDER.map((id, i) => ({
    id: `month-${i + 1}-${id}`,
    label: `Month ${i + 1}`,
    status: arenaMonthStatus(i, state),
  }));
  return (
    <LampSteps
      dense
      steps={steps}
      currentIndex={state.finished ? null : state.month}
      label={`The Arena: ${state.month} of ${MONTHS} months played`}
    />
  );
}

// The three counters as warm numerals (dim at zero).
function CountersBar({ state }: { state: ArenaState }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 border-y border-[var(--line)] py-4">
        {COUNTER_KEYS.map((k) => (
          <div key={k} className="text-center">
            <p
              className={`font-sans text-4xl font-bold tabular-nums ${
                state.counters[k] > 0 ? "text-[var(--lamp)]" : "text-[var(--dim)]"
              }`}
            >
              {state.counters[k]}
            </p>
            <p className="night-label mt-1">{COUNTER_NAMES[k]}</p>
            <p className="mt-1 text-xs leading-snug text-[var(--muted)]">{COUNTER_MEANINGS[k]}</p>
          </div>
        ))}
      </div>
      {state.capacity ? <p className="mt-2 text-sm text-gray-300">Leader capacity: {state.capacity}</p> : null}
    </div>
  );
}

// Before Month 1 (round 2 spec 4): what the three counters mean, in plain
// words, so a leader knows what their choices move.
function ScoreKey() {
  return (
    <div className="border-y border-[var(--line)] py-5">
      <h4 className="font-sans font-bold uppercase tracking-tight text-lg text-[var(--ink)] md:text-xl">How the Arena keeps score</h4>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{ARENA_SCORE_INTRO}</p>
      <dl className="mt-4 space-y-3">
        {COUNTER_KEYS.map((k) => (
          <div key={k}>
            <dt className="text-sm font-semibold text-[var(--ink)]">{COUNTER_NAMES[k]}</dt>
            <dd className="text-sm text-[var(--muted)]">{COUNTER_MEANINGS[k]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// Step 8 (spec 5.1): the Arena. Six months played against the leader's own
// plan, one curveball a month. Picks are saved and replayed from zero, so
// the counters are never stored. No score, grade or ranking anywhere.
export default function ArenaStep({ plan, value, save, onShowPlan }: ArenaStepProps) {
  const picks = value?.picks ?? [];
  const [entered, setEntered] = useState(picks.length > 0);
  const [resultMonth, setResultMonth] = useState<number | null>(null);

  const gaps = detectGaps(plan);
  let state: ArenaState;
  try {
    state = playArena(CURVEBALLS, DEFAULT_ORDER, picks);
  } catch {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-300">Your saved Arena run no longer matches the current months.</p>
        <OutcomeButton label="Start the Arena again" onClick={() => save({ picks: [], done: false })} />
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">The Arena</p>
          <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">Six months, before you commit</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            Six months of rehearsal, played against your own plan. Each month brings a curveball and four choices. No
            grade at the end: just the principles you learned and where your plan is thinnest.
          </p>
        </div>
        <ScoreKey />
        <MonthStreet state={state} />
        <OutcomeButton label="Enter the Arena" onClick={() => setEntered(true)} />
      </div>
    );
  }

  const byId = new Map(CURVEBALLS.map((c) => [c.id, c]));

  // A result: the month just played.
  if (resultMonth !== null) {
    const pick = picks[resultMonth];
    const chosen = pick ? byId.get(pick.curveball)?.choices[pick.choice] : undefined;
    return (
      <div className="space-y-6">
        <MonthStreet state={state} />
        <CountersBar state={state} />
        {chosen ? (
          <div>
            <p className="font-sans text-2xl font-semibold leading-snug text-[var(--ink)]">{chosen.verdict}</p>
            <p className="mt-3 text-sm text-gray-300">Effect: {chosen.counters}</p>
            <p className="eyebrow mt-5">Principle</p>
            <p className="mt-2 text-base font-semibold leading-relaxed text-[var(--ink)]">{chosen.principle}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{chosen.anchor}</p>
          </div>
        ) : null}
        <OutcomeButton
          label={resultMonth < MONTHS - 1 ? `On to month ${resultMonth + 2}` : "See what I learned"}
          onClick={() => {
            setResultMonth(null);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  // The ending: a lit street, each principle beneath its month, then where
  // the plan is thinnest.
  if (state.finished) {
    const spots = thinSpots(CURVEBALLS, DEFAULT_ORDER, gaps);
    return (
      <div className="space-y-8">
        <MonthStreet state={state} />
        <CountersBar state={state} />
        <div>
          <h3 className="text-2xl leading-tight text-[var(--ink)]">The principles you learned</h3>
          <ol className="mt-5">
            {state.earned.map((e, i) => (
              <li key={e.month} className="relative pb-6 pl-10">
                {i < state.earned.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[11px] top-[9px] -bottom-[9px] w-[2px] bg-[var(--lamp)]"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute left-[5px] top-[2px] h-[14px] w-[14px] rounded-full bg-[var(--lamp)] shadow-[0_0_16px_4px_rgba(255,197,107,0.5)]"
                />
                <p className="night-label">Month {e.month}</p>
                <p className="mt-1 font-sans text-xl font-semibold leading-snug text-[var(--ink)]">{e.principle}</p>
                <p className="mt-1 text-sm text-gray-300">{e.choiceLabel}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{e.anchor}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-[var(--line)] pt-6">
          <h3 className="text-2xl leading-tight text-[var(--ink)]">Where your plan is thinnest</h3>
          {spots.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-300">Nothing in your plan stood out as thin. Keep it that way.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {spots.map((s) => (
                <li key={s.gap}>
                  <p className="text-sm leading-relaxed text-[var(--ink)]">{thinSentence(s)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-300">Next: {GAP_TEXT[s.gap].action}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <OutcomeButton label="Show my launch plan" onClick={onShowPlan} />
        <button
          type="button"
          onClick={() => {
            save({ picks: [], done: false });
            setEntered(false);
          }}
          className="min-h-[44px] px-2 text-sm font-semibold text-[var(--accent)]"
        >
          Play it again
        </button>
      </div>
    );
  }

  // A month: the next curveball in the order.
  const curveball = byId.get(DEFAULT_ORDER[state.month]);
  if (!curveball) throw new Error(`Unknown curveball ${DEFAULT_ORDER[state.month]}`);
  const bites = bitesFor(curveball, gaps);

  return (
    <div className="space-y-6">
      <MonthStreet state={state} />
      <CountersBar state={state} />
      <div>
        <p className="night-label">
          Month {state.month + 1} of {MONTHS}
        </p>
        <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">{curveball.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">{curveball.situation}</p>
        {bites.length > 0 ? (
          <div className="mt-4 rounded-lg border border-[var(--accent)] p-3">
            <p className="text-sm font-semibold text-white">Bites harder because:</p>
            <ul className="mt-2 space-y-1">
              {bites.map((g) => (
                <li key={g} className="text-sm leading-relaxed text-gray-300">
                  {GAP_TEXT[g].bites}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3">
        {curveball.choices.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              save({ picks: [...picks, { curveball: curveball.id, choice: i }], done: picks.length + 1 === MONTHS });
              setResultMonth(state.month);
              window.scrollTo({ top: 0 });
            }}
            className="min-h-[44px] w-full text-left rounded-lg border border-[var(--line-2)] bg-[var(--night)] px-4 py-3 text-sm font-semibold text-white"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
