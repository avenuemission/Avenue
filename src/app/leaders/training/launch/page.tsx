"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WizardShell, { OutcomeButton } from "@/components/journey/WizardShell";
import {
  filled,
  launchStepComplete,
  LAUNCH_STEP_IDS,
  type CallingData,
  type LaunchData,
  type LaunchStepId,
} from "@/lib/journey";
import { SPACES, type Space } from "@/lib/people";
import { useLeaderGate } from "@/lib/useLeaderGate";
import { useWorksheet } from "@/lib/useWorksheet";
import { useMyPeople } from "@/lib/useMyPeople";
import { firstIncompleteIndex, stepFromParam, type WizardStepMeta } from "@/lib/wizard";
import PrayerStep from "./PrayerStep";
import MissionStep from "./MissionStep";
import SpaceStep from "./SpaceStep";
import TeamStep from "./TeamStep";
import IntentionalStep from "./IntentionalStep";
import RhythmStep from "./RhythmStep";
import InviteStep from "./InviteStep";

const LAUNCH_STEPS = [
  { id: "prayer", title: "Pray first", minutes: 4 },
  { id: "mission", title: "Your mission group", minutes: 4 },
  { id: "space", title: "Your space", minutes: 5 },
  { id: "team", title: "Your launch team", minutes: 4 },
  { id: "intentional", title: "Live intentionally", minutes: 4 },
  { id: "rhythm", title: "Rhythm and launch date", minutes: 3 },
  { id: "invite", title: "Invite and care", minutes: 5 },
  { id: "arena", title: "The Arena", minutes: 12 },
  { id: "plan", title: "Your Launch Plan", minutes: 2 },
] as const;

function isLaunchStepId(id: string): id is LaunchStepId {
  return (LAUNCH_STEP_IDS as readonly string[]).includes(id);
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="panel p-5 md:p-8">
        <p className="text-amber-400">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 min-h-[44px] px-5 rounded-full border border-[var(--border)] text-white text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// Phase 3: the Launch wizard. Seven planning steps built from the phase 3
// modules (Nehemiah 1 and 2), then the Arena and the printable plan. Saved
// to the leader's private "launch" worksheet; the Calling worksheet is read
// only, to carry the people group and hosting space forward.
export default function LaunchPage() {
  const router = useRouter();
  const { ready, error: gateError } = useLeaderGate();
  const launch = useWorksheet<LaunchData>("launch", ready);
  const calling = useWorksheet<CallingData>("calling", ready);
  const { people, peopleLoaded, peopleError, upsertPerson } = useMyPeople(ready);
  const data = launch.data;

  const steps: WizardStepMeta[] = LAUNCH_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    minutes: s.minutes,
    complete: isLaunchStepId(s.id) ? launchStepComplete(s.id, data) : false,
  }));

  const loaded = launch.loaded && calling.loaded;
  const [stepParam] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("step")
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const current = chosen ?? (loaded ? (stepFromParam(stepParam, steps.length) ?? firstIncompleteIndex(steps)) : 0);
  const goTo = (i: number) => {
    setChosen(i);
    window.scrollTo({ top: 0 });
  };

  if (gateError) return <ErrorPanel message={gateError} />;

  if (!ready || !loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (launch.error) return <ErrorPanel message={launch.error} />;
  if (calling.error) return <ErrorPanel message={calling.error} />;

  // Calling answers carried into steps 2 and 3, when they exist.
  const seasonal = calling.data.seasonal;
  const callingPeopleGroup = filled(seasonal?.peopleGroup) ? seasonal?.peopleGroup : undefined;
  const hosting = seasonal?.hostingSpace;
  const callingHosting: Space | undefined =
    typeof hosting === "string" && (SPACES as readonly string[]).includes(hosting) ? hosting : undefined;

  const step = LAUNCH_STEPS[current];
  const finishFor = (id: LaunchStepId, i: number) => async () => {
    await launch.flushSection(id);
    goTo(i + 1);
  };

  let activity: React.ReactNode;
  switch (step.id) {
    case "prayer":
      activity = (
        <PrayerStep
          value={data.prayer}
          save={(v) => launch.saveSection("prayer", v)}
          finish={finishFor("prayer", current)}
        />
      );
      break;
    case "mission":
      activity = (
        <MissionStep
          value={data.mission}
          save={(v) => launch.saveSection("mission", v)}
          finish={finishFor("mission", current)}
          callingPeopleGroup={callingPeopleGroup}
        />
      );
      break;
    case "space":
      activity = (
        <SpaceStep
          value={data.space}
          save={(v) => launch.saveSection("space", v)}
          finish={finishFor("space", current)}
          callingHosting={callingHosting}
        />
      );
      break;
    case "team":
      activity = (
        <TeamStep
          value={data.team}
          save={(v) => launch.saveSection("team", v)}
          finish={finishFor("team", current)}
          people={people}
          peopleLoaded={peopleLoaded}
          peopleError={peopleError}
          onPersonChange={upsertPerson}
        />
      );
      break;
    case "intentional":
      activity = (
        <IntentionalStep
          value={data.intentional}
          save={(v) => launch.saveSection("intentional", v)}
          finish={finishFor("intentional", current)}
        />
      );
      break;
    case "rhythm":
      activity = (
        <RhythmStep
          value={data.rhythm}
          save={(v) => launch.saveSection("rhythm", v)}
          finish={finishFor("rhythm", current)}
        />
      );
      break;
    case "invite":
      activity = (
        <InviteStep
          value={data.invite}
          save={(v) => launch.saveSection("invite", v)}
          finish={finishFor("invite", current)}
          people={people}
          peopleLoaded={peopleLoaded}
          peopleError={peopleError}
          onPersonChange={upsertPerson}
        />
      );
      break;
    case "arena":
      // Task 10 replaces this with the Arena (behind ARENA_ENABLED).
      activity = (
        <div className="space-y-6">
          <div className="panel p-4">
            <p className="text-sm leading-relaxed text-gray-300">
              The Arena: a six-month rehearsal of your plan, coming soon
            </p>
          </div>
          <OutcomeButton label="Show my launch plan" onClick={() => goTo(8)} />
        </div>
      );
      break;
    case "plan":
      activity = (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-gray-300">Everything you wrote, on one page you can print.</p>
          <OutcomeButton label="Show my launch plan" onClick={() => router.push("/leaders/training/launch/plan")} />
        </div>
      );
      break;
  }

  return (
    <WizardShell
      eyebrow="Launch"
      title="Plan your launch"
      steps={steps}
      current={current}
      onSelect={goTo}
      saving={launch.savingSection !== null}
      saveError={launch.saveError}
    >
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-white">{step.title}</h2>
        {/* key resets local step state (typed text, choices) when the step changes */}
        <div key={step.id}>{activity}</div>
      </div>
    </WizardShell>
  );
}
