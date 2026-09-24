"use client";

import { useState } from "react";
import type { StepProps } from "@/components/leaders/journey/WizardShell";
import { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import TaggedPeople from "@/components/leaders/people/TaggedPeople";
import { callingSectionComplete, type CallingData } from "@/lib/domain/journey";
import { SPACES, type Person } from "@/lib/domain/people";
import { RICE_FIELDS, SEASONAL_QUESTIONS, SPACE_CONTENT } from "@/content/calling";

type Seasonal = NonNullable<CallingData["seasonal"]>;
type Rice = NonNullable<Seasonal["rice"]>;
type RiceKey = keyof Rice;

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// Section 5: the three spaces people map, a people group, where a Pathway
// would be hosted this season, and a RICE worksheet for one decision.
export default function SeasonalMap({
  value,
  save,
  finish,
  people,
  peopleLoaded,
  peopleError,
  onPersonChange,
}: StepProps<Seasonal> & {
  people: Person[];
  peopleLoaded: boolean;
  peopleError: string | null;
  onPersonChange: (p: Person) => void;
}) {
  // Local copies so typing is instant; every change also saves.
  const [peopleGroup, setPeopleGroup] = useState(() => text(value?.peopleGroup));
  const [rice, setRice] = useState<Record<RiceKey, string>>(() => ({
    decision: text(value?.rice?.decision),
    reason: text(value?.rice?.reason),
    intuition: text(value?.rice?.intuition),
    counsel: text(value?.rice?.counsel),
    experience: text(value?.rice?.experience),
  }));

  const onPeopleGroup = (next: string) => {
    setPeopleGroup(next);
    save({ ...value, peopleGroup: next });
  };

  const onRice = (key: RiceKey, next: string) => {
    setRice((prev) => ({ ...prev, [key]: next }));
    save({ ...value, rice: { ...value?.rice, [key]: next } });
  };

  const complete = callingSectionComplete("seasonal", { seasonal: value });

  return (
    <div className="space-y-6">
      {!peopleLoaded ? (
        <p className="text-sm text-[var(--muted)]">Loading your people...</p>
      ) : peopleError ? (
        <p className="text-sm text-red-400">{peopleError}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPACES.map((s) => {
            const space = SPACE_CONTENT[s];
            return (
              <div key={s} className="panel p-4">
                <h3 className="text-base font-semibold text-white">
                  {space.name}: {space.short}
                </h3>
                <p className="mt-1 mb-3 text-xs leading-relaxed text-[var(--muted)]">{space.line}</p>
                <TaggedPeople
                  tag={{ kind: "space", value: s }}
                  people={people}
                  onChange={onPersonChange}
                  emptyText="No one here yet."
                />
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label htmlFor="seasonal-people-group" className="block text-sm font-semibold text-white leading-relaxed">
          {SEASONAL_QUESTIONS.peopleGroup}
        </label>
        <textarea
          id="seasonal-people-group"
          rows={2}
          maxLength={500}
          value={peopleGroup}
          onChange={(e) => onPeopleGroup(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base text-white"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">{SEASONAL_QUESTIONS.hosting}</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          {SPACES.map((s) => {
            const space = SPACE_CONTENT[s];
            const pressed = value?.hostingSpace === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={pressed}
                onClick={() => save({ ...value, hostingSpace: s })}
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-left ${
                  pressed ? "border-[var(--accent)]" : "border-[var(--border)]"
                }`}
              >
                <span className="block text-sm font-semibold text-white">
                  {space.name}: {space.short}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-300">{space.pro}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{SEASONAL_QUESTIONS.hostingNote}</p>
      </div>

      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-300">{SEASONAL_QUESTIONS.riceIntro}</p>
        <div>
          <label htmlFor="seasonal-rice-decision" className="block text-sm font-semibold text-white">
            {SEASONAL_QUESTIONS.riceDecision}
          </label>
          <input
            id="seasonal-rice-decision"
            type="text"
            maxLength={500}
            value={rice.decision}
            onChange={(e) => onRice("decision", e.target.value)}
            className="mt-2 w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base text-white"
          />
        </div>
        {RICE_FIELDS.map((field) => {
          const id = `seasonal-rice-${field.key}`;
          return (
            <div key={field.key}>
              <label htmlFor={id} className="block text-sm font-semibold text-white">
                {field.letter}: {field.label}
              </label>
              <textarea
                id={id}
                rows={2}
                maxLength={1000}
                placeholder={field.prompt}
                value={rice[field.key]}
                onChange={(e) => onRice(field.key, e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base text-white"
              />
            </div>
          );
        })}
      </div>

      <OutcomeButton
        label="Map my mission field"
        onClick={finish}
        disabled={!complete}
        hint="Name a people group and choose a space to continue."
      />
    </div>
  );
}
