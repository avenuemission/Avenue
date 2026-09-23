"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WizardShell from "@/components/journey/WizardShell";
import {
  CALLING_TOTAL,
  callingCompleteCount,
  callingSectionComplete,
  type CallingData,
  type CallingSectionId,
} from "@/lib/journey";
import { CALLING_LAMP_LABELS } from "@/lib/avenue";
import { useMoment } from "@/components/avenue/useMoment";
import Moment from "@/components/avenue/Moment";
import { useLeaderGate } from "@/lib/useLeaderGate";
import { useWorksheet } from "@/lib/useWorksheet";
import { useMyPeople } from "@/lib/useMyPeople";
import { firstIncompleteIndex, stepFromParam, type WizardStepMeta } from "@/lib/wizard";
import { CALLING_SECTIONS } from "./content";
import SectionVideo from "./SectionVideo";
import LayersSort from "./LayersSort";
import CallableJournal from "./CallableJournal";
import SharedCall from "./SharedCall";
import ApestStep from "./ApestStep";
import SeasonalMap from "./SeasonalMap";
import ConversationStep from "./ConversationStep";

// Phase 2: the Calling wizard. Six sections, each a short video (or its
// summary until recorded) and one activity, saved to the leader's private
// "calling" worksheet.
export default function CallingPage() {
  const router = useRouter();
  const { ready, error: gateError } = useLeaderGate();
  const { data, loaded, error, saveSection, flushSection, savingSection, saveError } = useWorksheet<CallingData>(
    "calling",
    ready
  );
  const { people, peopleLoaded, peopleError, upsertPerson } = useMyPeople(ready);

  const steps: WizardStepMeta[] = CALLING_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    minutes: s.minutes,
    complete: callingSectionComplete(s.id, data),
  }));

  const [stepParam] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("step")
  );
  const [chosen, setChosen] = useState<number | null>(null);
  const current = chosen ?? (loaded ? (stepFromParam(stepParam, steps.length) ?? firstIncompleteIndex(steps)) : 0);
  const goTo = (i: number) => {
    setChosen(i);
    window.scrollTo({ top: 0 });
  };

  // Moments that happen in this wizard (spec 3): yes to the Shared Call,
  // booking the pastor conversation, and Calling walked (all six sections).
  // Empty until the worksheet has loaded, so loading never plays one.
  const momentFlags: Record<string, boolean> =
    loaded && !error
      ? {
          sharedYes: data.shared?.yes === true,
          conversationBooked: data.conversation?.booked === true,
          "walked:phase2": callingCompleteCount(data) === CALLING_TOTAL,
        }
      : {};
  const { moment, dismiss } = useMoment(momentFlags);

  if (gateError) {
    return (
      <div className="avenue-night">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="panel p-5 md:p-8">
            <p className="text-amber-400">{gateError}</p>
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

  if (!ready || !loaded) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="avenue-night">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="panel p-5 md:p-8">
            <p className="text-amber-400">{error}</p>
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

  const section = CALLING_SECTIONS[current];
  const lastIndex = CALLING_SECTIONS.length - 1;
  const finishFor = (id: CallingSectionId, i: number) => async () => {
    await flushSection(id);
    if (i < lastIndex) goTo(i + 1);
    else router.push("/leaders/training/calling/profile");
  };
  const finish = finishFor(section.id, current);

  let activity: React.ReactNode;
  switch (section.id) {
    case "layers":
      activity = <LayersSort value={data.layers} save={(v) => saveSection("layers", v)} finish={finish} />;
      break;
    case "callable":
      activity = <CallableJournal value={data.callable} save={(v) => saveSection("callable", v)} finish={finish} />;
      break;
    case "shared":
      activity = <SharedCall value={data.shared} save={(v) => saveSection("shared", v)} finish={finish} />;
      break;
    case "apest":
      activity = <ApestStep value={data.apest} save={(v) => saveSection("apest", v)} finish={finish} />;
      break;
    case "seasonal":
      activity = (
        <SeasonalMap
          value={data.seasonal}
          save={(v) => saveSection("seasonal", v)}
          finish={finish}
          people={people}
          peopleLoaded={peopleLoaded}
          peopleError={peopleError}
          onPersonChange={upsertPerson}
        />
      );
      break;
    case "conversation":
      activity = (
        <ConversationStep value={data.conversation} save={(v) => saveSection("conversation", v)} finish={finish} />
      );
      break;
  }

  return (
    <>
      <WizardShell
        phaseId="phase2"
        name="Calling"
        title="Discover your calling"
        steps={steps}
        lampLabels={CALLING_LAMP_LABELS}
        current={current}
        onSelect={goTo}
        saving={savingSection !== null}
        saveError={saveError}
      >
        <div className="space-y-6">
          <h2 className="text-[var(--ink)]">
            Section {section.number}: {section.title}
          </h2>
          <SectionVideo section={section} />
          {/* key resets local step state (selection, typed text) when the section changes */}
          <div key={section.id}>{activity}</div>
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
