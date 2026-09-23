import type { Dispatch, SetStateAction } from "react";
import CheckinHistory, { CheckinEntry } from "@/components/ui/CheckinHistory";
import TaggedPeople from "@/components/people/TaggedPeople";
import type { Metric, Person } from "@/lib/people";

// The four RPMS gauges from Ferguson's Multiplier, in the fixed order the
// weekly check-in form uses.
const RPMS_GAUGES: { key: "relational" | "physical" | "mental" | "spiritual"; label: string }[] = [
  { key: "relational", label: "Relational" },
  { key: "physical", label: "Physical" },
  { key: "mental", label: "Mental" },
  { key: "spiritual", label: "Spiritual" },
];

// How many recent weeks the history strip shows.
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

// One gauge's 1-to-10 picker: ten small buttons, one tap sets the score.
// This is the whole "four taps" the check-in is meant to cost, times four
// gauges. No slider, no text field, nothing that needs explaining.
function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-white">{label}</span>
        <span className="text-sm font-semibold text-[var(--accent)] tabular-nums">{value}/10</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n} out of 10`}
            aria-pressed={value === n}
            className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
              n <= value
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-hover)] text-[var(--muted)] hover:bg-[var(--border-strong)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

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

// Phase 4 (Growth) content, shown instead of the modules grid. State and
// handlers for the check-in come from useCheckins via the page, and the
// three metric lists read and write My People via useMyPeople.
export default function Phase4Growth({
  currentWeekLabel,
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
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* The weekly check-in */}
      <div className="panel p-6">
        <span className="eyebrow">This week</span>
        <h3 className="text-lg font-semibold text-white mt-1 mb-2">Week of {currentWeekLabel}</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Four gauges from Dave Ferguson&rsquo;s Multiplier: Relational, Physical, Mental and Spiritual.
        </p>
        {!checkinsLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your check-in...</p>
        ) : checkinLoadError ? (
          // No form is rendered here on purpose. Rendering it
          // at its 5/5/5/5 defaults with Save enabled would
          // let a leader whose real scores simply failed to
          // load overwrite them with defaults they never saw.
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
            <p className="text-sm text-white mb-1">This week&rsquo;s check-in could not be loaded.</p>
            <p className="text-sm text-[var(--muted)] mb-4">{checkinLoadError}</p>
            <button
              type="button"
              onClick={() => {
                setCheckinsLoaded(false);
                setCheckinLoadAttempt((n) => n + 1);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-white text-sm font-semibold transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-5">
              {RPMS_GAUGES.map(({ key, label }) => (
                <ScoreRow
                  key={key}
                  label={label}
                  value={checkinForm[key]}
                  onChange={(next) => setCheckinForm((prev) => ({ ...prev, [key]: next }))}
                />
              ))}
            </div>
            <div className="mb-4">
              <label htmlFor="checkin-reflection" className="text-sm text-white mb-1.5 block">
                One sentence
              </label>
              <textarea
                id="checkin-reflection"
                value={checkinForm.reflection}
                onChange={(e) => setCheckinForm((prev) => ({ ...prev, reflection: e.target.value }))}
                maxLength={2000}
                rows={2}
                placeholder="How this week actually went."
                className="w-full rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] p-3 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveCheckin}
                disabled={checkinSaving}
                className="px-5 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {checkinSaving ? "Saving..." : "Save check-in"}
              </button>
              {checkinSaved && !checkinSaving && (
                <span className="text-xs text-[var(--accent)]">Saved.</span>
              )}
              {checkinSaveError && (
                <span className="text-xs text-red-400">{checkinSaveError}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Your three metrics */}
      <div className="panel p-6">
        <span className="eyebrow">Your three metrics</span>
        <p className="text-sm text-[var(--muted)] mt-1 mb-4">
          Three separate lists, not a ladder. Anyone can sit in more than one.
        </p>
        {!peopleLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your people...</p>
        ) : peopleError ? (
          <p className="text-sm text-red-400">{peopleError}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {METRIC_PANELS.map(({ metric, title, definition, empty }) => {
              const count = people.filter((p) => p.metrics.includes(metric)).length;
              return (
                <div key={metric} className="panel p-5">
                  <h4 className="text-base font-semibold text-white mb-1">{title}</h4>
                  <p className="text-xs text-[var(--muted)] mb-3">{definition}</p>
                  <p className="text-2xl font-bold tabular-nums text-white mb-3">
                    {count} named
                  </p>
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
      </div>

      {/* The history */}
      <div className="panel p-6">
        <span className="eyebrow">History</span>
        <h3 className="text-lg font-semibold text-white mt-1 mb-4">Recent weeks</h3>
        <CheckinHistory weeks={historyWeeks} checkins={checkins} />
      </div>
    </div>
  );
}
