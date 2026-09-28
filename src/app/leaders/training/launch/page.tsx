"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WizardShell, { OutcomeButton } from "@/components/leaders/journey/WizardShell";
import {
  filled,
  isIsoDate,
  launchCompleteCount,
  LAUNCH_TOTAL,
  type CallingData,
  type LaunchData,
  type LaunchStepId,
  type LaunchWizardStepId,
} from "@/lib/domain/journey";
import { LAUNCH_LAMP_LABELS } from "@/lib/domain/avenue";
import { launchWizardStepStatus } from "@/lib/domain/stepStatus";
import { useMoment } from "@/hooks/useMoment";
import Moment from "@/components/leaders/avenue/Moment";
import { SPACES, type Space } from "@/lib/domain/people";
import { useLeaderGate } from "@/hooks/useLeaderGate";
import { useWorksheet } from "@/hooks/useWorksheet";
import { useMyPeople } from "@/hooks/useMyPeople";
import { firstIncompleteIndex, stepFromParam, type WizardStepMeta } from "@/lib/domain/wizard";
import PrayerStep from "@/app/leaders/training/launch/_steps/PrayerStep";
import MissionStep from "@/app/leaders/training/launch/_steps/MissionStep";
import SpaceStep from "@/app/leaders/training/launch/_steps/SpaceStep";
import TeamStep from "@/app/leaders/training/launch/_steps/TeamStep";
import IntentionalStep from "@/app/leaders/training/launch/_steps/IntentionalStep";
import RhythmStep from "@/app/leaders/training/launch/_steps/RhythmStep";
import InviteStep from "@/app/leaders/training/launch/_steps/InviteStep";
import MetricsStep from "@/app/leaders/training/launch/_steps/MetricsStep";
import ArenaStep from "@/app/leaders/training/launch/_steps/ArenaStep";
import { ARENA_ENABLED } from "@/content/arena";
import { arenaPlanFrom } from "@/lib/domain/arena";
import { useNetworkView } from "@/hooks/useNetworkView";

// In LAUNCH_WIZARD_STEP_IDS order (journey.ts); the indexes below follow it.
const LAUNCH_STEPS: readonly { id: LaunchWizardStepId; title: string; minutes: number }[] = [
  { id: "prayer", title: "Pray first", minutes: 4 },
  { id: "mission", title: "Your mission group", minutes: 4 },
  { id: "space", title: "Your space", minutes: 5 },
  { id: "team", title: "Your launch team", minutes: 4 },
  { id: "intentional", title: "Live intentionally", minutes: 4 },
  { id: "rhythm", title: "Rhythm and launch date", minutes: 3 },
  { id: "invite", title: "Invite and care", minutes: 5 },
  { id: "metrics", title: "Metrics", minutes: 2 },
  { id: "arena", title: "Scenarios", minutes: 12 },
  { id: "plan", title: "Your Launch Plan", minutes: 2 },
];
const ARENA_INDEX = LAUNCH_STEPS.findIndex((s) => s.id === "arena");
const PLAN_INDEX = LAUNCH_STEPS.findIndex((s) => s.id === "plan");

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="avenue-night">
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
    </div>
  );
}

// Phase 3: the Launch wizard. Seven planning steps built from the phase 3
// modules (Nehemiah 1 and 2), then Metrics, the scenarios (the Arena in
// code) and the printable plan. Saved
// to the leader's private "launch" worksheet; the Calling worksheet is read
// only, to carry the people group and hosting space forward.
export default function LaunchPage() {
  const router = useRouter();
  const { user, ready, error: gateError } = useLeaderGate();
  const launch = useWorksheet<LaunchData>("launch", ready);
  const calling = useWorksheet<CallingData>("calling", ready);
  const { people, peopleLoaded, peopleError, upsertPerson } = useMyPeople(ready);
  // The scenarios' "no apprentice" gap: people this leader sent out who are on
  // at least the first apprenticeship rung. Null (gap not claimed) until the
  // network loads, or when it fails.
  const network = useNetworkView(user, ready, ready);
  const apprenticeCount =
    !network.networkLoaded || network.networkError
      ? null
      : network.networkPeople.filter((p) => p.sentOutBy === network.networkViewerId && p.apprenticeStep >= 1).length;
  const data = launch.data;

  const stepStatus = Object.fromEntries(
    LAUNCH_STEPS.map((s) => [s.id, launchWizardStepStatus(s.id, data, ARENA_ENABLED)])
  );
  // A step is complete when its lamp is lit: the planning steps by their
  // own rule, Metrics once read (or the scenarios already played), the
  // scenarios once finished (or switched off). The plan is never complete.
  const steps: WizardStepMeta[] = LAUNCH_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    minutes: s.minutes,
    complete: stepStatus[s.id] === "done",
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

  // Moments that happen in this wizard (spec 3): setting a launch date, and
  // Launch walked (all seven planning steps). Empty until loaded.
  // RhythmStep saves on every change, and typing a year into a date input
  // passes through values like "0002-10-03", which are valid ISO dates. Only
  // a date in this year or later counts as set (F5), so the moment waits for
  // the real year.
  const launchDate = data.rhythm?.launchDate;
  const launchDateSet = isIsoDate(launchDate) && Number(launchDate.slice(0, 4)) >= new Date().getFullYear();
  const momentFlags: Record<string, boolean> =
    loaded && !launch.error
      ? {
          launchDate: launchDateSet,
          "walked:phase3": launchCompleteCount(data) === LAUNCH_TOTAL,
        }
      : {};
  const { moment, dismiss } = useMoment(momentFlags, launchDateSet ? launchDate : undefined);

  if (gateError) return <ErrorPanel message={gateError} />;

  if (!ready || !loaded) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
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
    case "metrics":
      activity = (
        <MetricsStep
          finish={async () => {
            launch.saveSection("metrics", { read: true });
            await launch.flushSection("metrics");
            goTo(ARENA_INDEX);
          }}
        />
      );
      break;
    case "arena":
      activity = ARENA_ENABLED ? (
        <ArenaStep
          plan={arenaPlanFrom(data, apprenticeCount)}
          value={data.arena}
          save={(v) => launch.saveSection("arena", v)}
          onShowPlan={async () => {
            await launch.flushSection("arena");
            goTo(PLAN_INDEX);
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="panel p-4">
            <p className="text-sm leading-relaxed text-gray-300">
              Scenarios: a rehearsal of your plan, coming soon
            </p>
          </div>
          <OutcomeButton label="Show my launch plan" onClick={() => goTo(PLAN_INDEX)} />
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
    <>
      <WizardShell
        phaseId="phase3"
        user={user}
        name="Launch"
        title="Plan your launch"
        steps={steps}
        lampLabels={LAUNCH_LAMP_LABELS}
        stepStatus={stepStatus}
        current={current}
        onSelect={goTo}
        saving={launch.savingSection !== null}
        saveError={launch.saveError}
      >
        <div className="space-y-6">
          <h2 className="text-[var(--ink)]">{step.title}</h2>
          {/* key resets local step state (typed text, choices) when the step changes */}
          <div key={step.id}>{activity}</div>
        </div>
      </WizardShell>
      <Moment
        play={moment !== null}
        playKey={moment?.n}
        title={moment?.title ?? ""}
        caption={moment?.caption ?? ""}
        onDismiss={dismiss}
      />
    </>
  );
}
