"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WizardShell from "@/components/journey/WizardShell";
import { callingSectionComplete, type CallingData, type CallingSectionId } from "@/lib/journey";
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

  if (gateError) {
    return (
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
    );
  }

  if (!ready || !loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
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
    <WizardShell
      eyebrow="Calling"
      title="Discover your calling"
      steps={steps}
      current={current}
      onSelect={goTo}
      saving={savingSection !== null}
      saveError={saveError}
    >
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-white">
          Section {section.number}: {section.title}
        </h2>
        <SectionVideo section={section} />
        {/* key resets local step state (selection, typed text) when the section changes */}
        <div key={section.id}>{activity}</div>
      </div>
    </WizardShell>
  );
}
