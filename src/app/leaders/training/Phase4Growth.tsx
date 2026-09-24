"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import CheckinHistory, { CheckinEntry } from "@/components/ui/CheckinHistory";
import TaggedPeople from "@/components/people/TaggedPeople";
import Glow from "@/components/avenue/Glow";
import Expander from "@/components/avenue/Expander";
import RpmsSlider from "./growth/RpmsSlider";
import { GAUGES } from "@/lib/rpms";
import {
  CHURCH_HEALTH_INTRO,
  churchHealthSummary,
  LEADER_HEALTH_INTRO,
  leaderHealthStartsOpen,
  leaderHealthStatus,
  leaderHealthSummary,
} from "@/lib/phaseSummaries";
import type { Metric, Person } from "@/lib/people";

// How many recent weeks the history shows.
export const CHECKIN_HISTORY_WEEKS = 12;

// The three named metrics, Henry's definitions from HANDOVER.md 3.3,
// verbatim. Three separate lists, not a ladder.
const METRIC_PANELS: { metric: Metric; title: string; definition: string; empty: string }[] = [
  {
    metric: "pathways",
    title: "Pathways",
    definition: "A new person feels like they belong in a Pathway and is comfortable inviting someone else into the community",
    empty: "No one named yet.",
  },
  {
    metric: "intersections",
    title: "Intersections",
    definition: "A person is baptised or makes a decision of faith and is then apprenticed to lead in a Pathway",
    empty: "No one named yet.",
  },
  {
    metric: "streetlights",
    title: "Streetlights",
    definition: "A disciple responds to the Holy Spirit by stepping out to plant, lead or serve in a new Pathways or Streetlights initiative",
    empty: "No one named yet.",
  },
];

// The week's RPMS scores plus the one-sentence reflection, as held by
// useCheckins while the leader edits them.
export interface CheckinForm {
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
  reflection: string;
}

interface Phase4GrowthProps {
  currentWeekLabel: string;
  currentWeekStart: string; // the Monday the form edits (useCheckins' editingWeekStart)
  historyWeeks: string[];
  checkins: CheckinEntry[];
  checkinsLoaded: boolean;
  setCheckinsLoaded: Dispatch<SetStateAction<boolean>>;
  checkinLoadError: string | null;
  setCheckinLoadAttempt: Dispatch<SetStateAction<number>>;
  checkinForm: CheckinForm;
  setCheckinForm: Dispatch<SetStateAction<CheckinForm>>;
  checkinSaving: boolean;
  checkinSaveError: string | null;
  checkinSaved: boolean;
  saveCheckin: () => Promise<void>;
  people: Person[];
  peopleLoaded: boolean;
  peopleError: string | null;
  onPersonChange: (person: Person) => void;
}

// Phase 4 (Growth), round 2 spec 3: two expanders. Leader health holds the
// weekly RPMS check-in and its history; Church health holds the three named
// lists. State and handlers come from useCheckins and useMyPeople via the
// page; saving is exactly as before (same form fields, same saveCheckin).
export default function Phase4Growth({
  currentWeekLabel,
  currentWeekStart,
  historyWeeks,
  checkins,
  checkinsLoaded,
  setCheckinsLoaded,
  checkinLoadError,
  setCheckinLoadAttempt,
  checkinForm,
  setCheckinForm,
  checkinSaving,
  checkinSaveError,
  checkinSaved,
  saveCheckin,
  people,
  peopleLoaded,
  peopleError,
  onPersonChange,
}: Phase4GrowthProps) {
  // null until check-ins first load, then decided once: open while this
  // week's check-in is unsaved, or when it failed to load so the retry
  // shows. Saving afterwards does not close it.
  const [leaderOpen, setLeaderOpen] = useState<boolean | null>(null);
  const [churchOpen, setChurchOpen] = useState(false);
  if (leaderOpen === null && checkinsLoaded) {
    setLeaderOpen(checkinLoadError !== null || leaderHealthStartsOpen(checkins, currentWeekStart));
  }
  const leaderIsOpen = leaderOpen ?? false;

  // A save in flight or a failed save wins (pre-flight F4): the closed
  // expander hides the Save button's own state, so it must say so here.
  const leaderSummary = !checkinsLoaded
    ? "Loading..."
    : checkinLoadError
      ? "Could not load"
      : leaderHealthStatus(leaderHealthSummary(checkins, currentWeekStart), checkinSaving, checkinSaveError);
  const churchSummary = !peopleLoaded ? "Loading..." : peopleError ? "Could not load" : churchHealthSummary(people);

  return (
    <div>
      <Expander
        id="growth-leader"
        title="Leader health"
        intro={LEADER_HEALTH_INTRO}
        summary={leaderSummary}
        open={leaderIsOpen}
        onToggle={() => setLeaderOpen(!leaderIsOpen)}
      >
        {/* The weekly check-in: a raised card because it takes input */}
        <div className="night-card p-6">
          <span className="eyebrow">This week</span>
          <h4 className="mt-1 mb-4 font-serif text-2xl text-[var(--ink)]">Week of {currentWeekLabel}</h4>
          {!checkinsLoaded ? (
            <p className="text-sm text-[var(--muted)]">Loading your check-in...</p>
          ) : checkinLoadError ? (
            // No form is rendered here on purpose. Rendering it
            // at its 5/5/5/5 defaults with Save enabled would
            // let a leader whose real scores simply failed to
            // load overwrite them with defaults they never saw.
            <div className="rounded-xl border border-dashed border-[var(--line-2)] p-6 text-center">
              <p className="text-sm text-[var(--ink)] mb-1">This week&rsquo;s check-in could not be loaded.</p>
              <p className="text-sm text-[var(--muted)] mb-4">{checkinLoadError}</p>
              <button
                type="button"
                onClick={() => {
                  setCheckinsLoaded(false);
                  setCheckinLoadAttempt((n) => n + 1);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-full border border-[var(--line-2)] text-[var(--ink)] text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-6 mb-6">
                {GAUGES.map((gauge) => (
                  <RpmsSlider
                    key={gauge.key}
                    gauge={gauge}
                    value={checkinForm[gauge.key]}
                    onChange={(next) => setCheckinForm((prev) => ({ ...prev, [gauge.key]: next }))}
                  />
                ))}
              </div>
              <div className="mb-4">
                <label htmlFor="checkin-reflection" className="text-sm text-[var(--ink)] mb-1.5 block">
                  One sentence
                </label>
                <textarea
                  id="checkin-reflection"
                  value={checkinForm.reflection}
                  onChange={(e) => setCheckinForm((prev) => ({ ...prev, reflection: e.target.value }))}
                  maxLength={2000}
                  rows={2}
                  placeholder="How this week actually went."
                  className="w-full rounded-lg bg-[var(--night)] border border-[var(--line-2)] p-3 text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveCheckin}
                  disabled={checkinSaving}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {checkinSaving ? "Saving..." : "Save check-in"}
                </button>
                {checkinSaved && !checkinSaving && <span className="text-xs text-[var(--lamp)]">Saved.</span>}
                {checkinSaveError && <span className="text-xs text-red-400">{checkinSaveError}</span>}
              </div>
            </>
          )}
        </div>

        {/* The history */}
        <div className="mt-10">
          <h4 className="night-h2 mb-4">Recent weeks</h4>
          <CheckinHistory weeks={historyWeeks} checkins={checkins} />
        </div>
      </Expander>

      <div className="border-b border-[var(--line)]">
        <Expander
          id="growth-church"
          title="Church health"
          intro={CHURCH_HEALTH_INTRO}
          summary={churchSummary}
          open={churchOpen}
          onToggle={() => setChurchOpen((o) => !o)}
        >
          <p className="text-sm text-[var(--muted)] mb-6">
            Three separate lists, not a ladder. Anyone can sit in more than one.
          </p>
          {!peopleLoaded ? (
            <p className="text-sm text-[var(--muted)]">Loading your people...</p>
          ) : peopleError ? (
            <p className="text-sm text-red-400">{peopleError}</p>
          ) : (
            <div className="grid grid-cols-1 border-t border-[var(--line)] md:grid-cols-3 md:divide-x md:divide-[var(--line)]">
              {METRIC_PANELS.map(({ metric, title, definition, empty }) => {
                const count = people.filter((p) => p.metrics.includes(metric)).length;
                return (
                  <div
                    key={metric}
                    className="border-b border-[var(--line)] py-6 md:border-b-0 md:px-5 md:first:pl-0 md:last:pr-0"
                  >
                    <h4 className="font-serif text-xl text-[var(--ink)]">{title}</h4>
                    <p className="mt-1 mb-3 text-xs text-[var(--muted)]">{definition}</p>
                    <Glow as="div" trigger={count} className="-mx-2 mb-3 inline-block rounded-lg px-2">
                      <p className="tabular-nums">
                        <span
                          className={`font-serif text-4xl ${count > 0 ? "text-[var(--lamp)]" : "text-[var(--dim)]"}`}
                        >
                          {count}
                        </span>
                        <span className="ml-2 text-sm text-[var(--muted)]">named</span>
                      </p>
                    </Glow>
                    <TaggedPeople
                      tag={{ kind: "metric", value: metric }}
                      people={people}
                      onChange={onPersonChange}
                      emptyText={empty}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Expander>
      </div>
    </div>
  );
}
