"use client";

import { useState } from "react";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import LampSteps from "@/components/leaders/avenue/LampSteps";
import {
  ARENA_SCORE_INTRO,
  bitesFor,
  COUNTER_KEYS,
  COUNTER_MEANINGS,
  COUNTER_NAMES,
  detectGaps,
  GAP_TEXT,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type ArenaState,
} from "@/lib/domain/arena";
import { arenaMonthStatus } from "@/lib/domain/stepStatus";
import type { LaunchData } from "@/lib/domain/journey";
import { CURVEBALLS, DEFAULT_ORDER } from "@/content/arena";
import MetricList from "@/app/leaders/training/launch/_steps/MetricList";

type Arena = NonNullable<LaunchData["arena"]>;

interface ArenaStepProps {
  plan: ArenaPlan;
  value: Arena | undefined;
  save: (value: Arena) => void;
  onShowPlan: () => void;
}

const SCENARIOS = DEFAULT_ORDER.length;

// The six scenarios as a row of dots: done once played, the scenario in
// play pulsing mid-run, its label underlined. Display only.
function ScenarioStreet({ state }: { state: ArenaState }) {
  const steps = DEFAULT_ORDER.map((id, i) => ({
    id: `scenario-${i + 1}-${id}`,
    label: `Scenario ${i + 1}`,
    status: arenaMonthStatus(i, state),
  }));
  return (
    <LampSteps
      dense
      steps={steps}
      currentIndex={state.finished ? null : state.month}
      label={`Scenarios: ${state.month} of ${SCENARIOS} played`}
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

// Before the first scenario (round 2 spec 4): what the three metrics mean,
// in plain words, so a leader knows what their choices move.
function ScoreKey() {
  return (
    <div className="border-y border-[var(--line)] py-5">
      <h4 className="font-sans font-bold uppercase tracking-tight text-lg text-[var(--ink)] md:text-xl">
        How the scenarios move your metrics
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{ARENA_SCORE_INTRO}</p>
      <MetricList />
    </div>
  );
}

// Step 9 (spec 5.1): the scenarios (the Arena in code). Six curveballs
// played against the leader's own plan. Picks are saved and replayed from
// zero, so the counters are never stored. No score, grade or ranking
// anywhere.
export default function ArenaStep({ plan, value, save, onShowPlan }: ArenaStepProps) {
  const picks = value?.picks ?? [];
  const [entered, setEntered] = useState(picks.length > 0);
  const [resultScenario, setResultScenario] = useState<number | null>(null);

  const gaps = detectGaps(plan);
  let state: ArenaState;
  try {
    state = playArena(CURVEBALLS, DEFAULT_ORDER, picks);
  } catch {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-300">Your saved scenarios no longer match the current set.</p>
        <OutcomeButton label="Start the scenarios again" onClick={() => save({ picks: [], done: false })} />
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">Scenarios</p>
          <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">Rehearse your plan</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            Six scenarios, played against your own plan. Each one brings a curveball and four choices. No grade at the
            end: just the principles you learned and where your plan is thinnest.
          </p>
        </div>
        <ScoreKey />
        <ScenarioStreet state={state} />
        <OutcomeButton label="Start the scenarios" onClick={() => setEntered(true)} />
      </div>
    );
  }

  const byId = new Map(CURVEBALLS.map((c) => [c.id, c]));

  // A result: the scenario just played.
  if (resultScenario !== null) {
    const pick = picks[resultScenario];
    const chosen = pick ? byId.get(pick.curveball)?.choices[pick.choice] : undefined;
    return (
      <div className="space-y-6">
        <ScenarioStreet state={state} />
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
          label={resultScenario < SCENARIOS - 1 ? `On to scenario ${resultScenario + 2}` : "See what I learned"}
          onClick={() => {
            setResultScenario(null);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  // The ending: a lit street, each principle beneath its scenario, then where
  // the plan is thinnest.
  if (state.finished) {
    const spots = thinSpots(CURVEBALLS, DEFAULT_ORDER, gaps);
    return (
      <div className="space-y-8">
        <ScenarioStreet state={state} />
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
                <p className="night-label">Scenario {e.month}</p>
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

  // A scenario: the next curveball in the order.
  const curveball = byId.get(DEFAULT_ORDER[state.month]);
  if (!curveball) throw new Error(`Unknown curveball ${DEFAULT_ORDER[state.month]}`);
  const bites = bitesFor(curveball, gaps);

  return (
    <div className="space-y-6">
      <ScenarioStreet state={state} />
      <CountersBar state={state} />
      <div>
        <p className="night-label">
          Scenario {state.month + 1} of {SCENARIOS}
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
              save({ picks: [...picks, { curveball: curveball.id, choice: i }], done: picks.length + 1 === SCENARIOS });
              setResultScenario(state.month);
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
