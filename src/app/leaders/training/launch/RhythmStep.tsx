"use client";

import { useState } from "react";
import { OutcomeButton, type StepProps } from "@/components/journey/WizardShell";
import { launchStepComplete, WEEKDAYS, type LaunchData, type Weekday } from "@/lib/journey";
import { gatheringsInFirstSixMonths, weeksUntil } from "@/lib/launch";
import { StepIntro, text } from "./LaunchFields";

type Rhythm = NonNullable<LaunchData["rhythm"]>;

const INPUT =
  "mt-2 w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-white";

function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && (WEEKDAYS as readonly string[]).includes(value);
}

function capitalise(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

// Step 6 (p3m9, p3m12): the official launch date and the weekly team
// rhythm, with two live tiles once all three are set.
export default function RhythmStep({ value, save, finish }: StepProps<Rhythm>) {
  const [launchDate, setLaunchDate] = useState(() => text(value?.launchDate));
  const [weeklyDay, setWeeklyDay] = useState<Weekday | "">(() => {
    const saved = value?.weeklyDay;
    return isWeekday(saved) ? saved : "";
  });
  const [weeklyTime, setWeeklyTime] = useState(() => text(value?.weeklyTime));

  const onDate = (next: string) => {
    setLaunchDate(next);
    save({ ...value, launchDate: next });
  };
  const onDay = (next: string) => {
    const day = isWeekday(next) ? next : undefined;
    setWeeklyDay(day ?? "");
    save({ ...value, weeklyDay: day });
  };
  const onTime = (next: string) => {
    setWeeklyTime(next);
    save({ ...value, weeklyTime: next });
  };

  const local: Rhythm = { launchDate, weeklyDay: weeklyDay || undefined, weeklyTime };
  const complete = launchStepComplete("rhythm", { rhythm: local });
  const weeks = complete ? weeksUntil(launchDate, new Date()) : null;
  const gatherings = complete && weeklyDay ? gatheringsInFirstSixMonths(launchDate, weeklyDay) : null;

  return (
    <div className="space-y-6">
      <StepIntro>
        Plan an official launch date to be invitational to friends and family, and meet weekly with the launch team to
        practice being a MicroChurch together.
      </StepIntro>

      <div>
        <label htmlFor="launch-date" className="block text-sm font-semibold text-white">
          Launch date
        </label>
        <input id="launch-date" type="date" value={launchDate} onChange={(e) => onDate(e.target.value)} className={INPUT} />
      </div>

      <div>
        <label htmlFor="launch-weekly-day" className="block text-sm font-semibold text-white">
          Weekly night
        </label>
        <select id="launch-weekly-day" value={weeklyDay} onChange={(e) => onDay(e.target.value)} className={INPUT}>
          <option value="">Choose a night</option>
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {capitalise(d)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="launch-weekly-time" className="block text-sm font-semibold text-white">
          Time
        </label>
        <input
          id="launch-weekly-time"
          type="time"
          value={weeklyTime}
          onChange={(e) => onTime(e.target.value)}
          className={INPUT}
        />
      </div>

      {weeks !== null && gatherings !== null ? (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div className="panel p-4">
              <p className="eyebrow">Weeks until launch</p>
              <p className="mt-2 text-3xl font-semibold text-white">{weeks}</p>
            </div>
            <div className="panel p-4">
              <p className="eyebrow">Gatherings in the first six months</p>
              <p className="mt-2 text-3xl font-semibold text-white">{gatherings}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-300">
            That is {gatherings} gatherings before your first six months are up.
          </p>
        </div>
      ) : null}

      <OutcomeButton
        label="Set my launch date"
        onClick={finish}
        disabled={!complete}
        hint="Pick a date, a night and a time to continue."
      />
    </div>
  );
}
