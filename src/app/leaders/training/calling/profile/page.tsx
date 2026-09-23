"use client";

import { useState } from "react";
import Link from "next/link";
import PrintButton from "@/components/journey/PrintButton";
import PhaseOpening from "@/components/avenue/PhaseOpening";
import JourneyFooter from "@/components/avenue/JourneyFooter";
import { VERSES } from "../../verses";
import { useLeaderGate } from "@/lib/useLeaderGate";
import { useWorksheet } from "@/lib/useWorksheet";
import { useMyPeople } from "@/lib/useMyPeople";
import { filled, isSpace, layersScore, recordOf, textOf, type CallingData } from "@/lib/journey";
import { APEST_ORDER, topTwoRoles, type RoleKey } from "@/lib/apest";
import {
  APEST_CALLING_TEXT,
  JOURNAL_PROMPTS,
  LAYER_KEY,
  LAYER_LABELS,
  RICE_FIELDS,
  SPACE_CONTENT,
  WILLING_OPTIONS,
} from "../content";

function isRole(value: unknown): value is RoleKey {
  return typeof value === "string" && (APEST_ORDER as string[]).includes(value);
}

function dateAU(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

// The step numbers in the Calling wizard, matched to each profile section's
// "answer this now" link.
const STEP_NUMBER = { layers: 1, callable: 2, shared: 3, apest: 4, seasonal: 5, conversation: 6 } as const;

function EmptyNext({ line, label, step }: { line: string; label: string; step: number }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-[var(--muted)]">{line}</p>
      <Link
        href={`/leaders/training/calling?step=${step}`}
        className="no-print inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
      >
        {label}
      </Link>
    </div>
  );
}

// Phase 2's printable one-pager (spec 4.2). Private: never visible to a
// leader's sender or the admins. Journal answers stay on screen only,
// behind a toggle, and are never inside the printed output (Ruling C3).
export default function CallingProfilePage() {
  const { ready, error: gateError } = useLeaderGate();
  const { data, loaded, error } = useWorksheet<CallingData>("calling", ready);
  const { people, peopleLoaded, peopleError } = useMyPeople(ready);
  const [showJournal, setShowJournal] = useState(false);

  if (gateError) {
    return (
      <div className="avenue-night">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="panel p-5 md:p-8">
            <p className="text-amber-400">{gateError}</p>
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
          </div>
        </div>
      </div>
    );
  }

  // Every stored read below is shape-checked: a value of an unexpected
  // shape reads as not answered yet rather than throwing.
  const placements = recordOf(recordOf(data.layers).placements);
  const hasLayers = Object.keys(placements).length > 0;

  const callable = recordOf(data.callable);
  const willing = textOf(callable.willing);
  const hasWilling = willing.length > 0;
  const willingOption = WILLING_OPTIONS.find((o) => o.value === willing);

  const shared = data.shared;
  const hasShared = shared?.yes === true;
  const sharedDate = dateAU(shared?.date);

  const apest = data.apest;
  const savedTop = apest?.top;
  const hasApest =
    !!apest?.results && Array.isArray(savedTop) && savedTop.length >= 2 && isRole(savedTop[0]) && isRole(savedTop[1]);
  const top: RoleKey[] = hasApest && apest?.results ? [savedTop![0] as RoleKey, savedTop![1] as RoleKey] : [];
  const topFallback = hasApest && apest?.results && top.length < 2 ? topTwoRoles(apest.results) : null;
  const gifts = top.length >= 2 ? top : topFallback ?? [];

  const seasonal = recordOf(data.seasonal);
  const peopleGroup = filled(seasonal.peopleGroup) ? (seasonal.peopleGroup as string) : null;
  const hostingSpace = isSpace(seasonal.hostingSpace) ? seasonal.hostingSpace : null;
  const hasSeasonal = !!peopleGroup || !!hostingSpace;
  const rice = recordOf(seasonal.rice);
  const riceDecision = filled(rice.decision) ? (rice.decision as string) : null;
  const riceFields = RICE_FIELDS.filter((f) => filled(rice[f.key]));
  const hasRice = riceFields.length > 0;

  const conversation = data.conversation;
  const hasConversation = conversation?.booked === true;
  const conversationDate = dateAU(conversation?.date);

  return (
    <div className="avenue-night">
    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-8 print:space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href="/leaders/training/calling" className="min-h-[44px] inline-flex items-center text-sm text-[var(--muted)] hover:text-white">
          Back to Calling
        </Link>
        <PrintButton />
      </div>

      {/* Print keeps the original title block; the screen shows the phase opening. */}
      <div className="hidden print:block">
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Calling Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Private to you. Your sender and the admins cannot see it.
        </p>
      </div>
      <div className="no-print">
        <PhaseOpening
          size="small"
          headingLevel={1}
          stop={2}
          name="My Calling Profile"
          reference={VERSES.phase2.reference}
          short={VERSES.phase2.short}
          verse={VERSES.phase2.text}
        >
          <p className="text-sm text-[var(--muted)]">Private to you. Your sender and the admins cannot see it.</p>
        </PhaseOpening>
      </div>

      {/* My three layers */}
      <section className="panel night-section p-5">
        <h2 className="night-h2">My three layers</h2>
        {hasLayers ? (
          <div className="mt-2 space-y-2">
            <p className="text-white font-semibold">{layersScore(placements, LAYER_KEY)} of 9 in the right layer</p>
            {(["shared", "specific", "seasonal"] as const).map((layer) => (
              <p key={layer} className="text-sm text-gray-300">
                <span className="text-white font-semibold">{LAYER_LABELS[layer].name}: </span>
                {LAYER_LABELS[layer].line}
              </p>
            ))}
          </div>
        ) : (
          <EmptyNext line="You haven't sorted the layers yet." label="Sort the layers" step={STEP_NUMBER.layers} />
        )}
      </section>

      {/* My availability */}
      <section className="panel night-section p-5">
        <h2 className="night-h2">My availability</h2>
        {hasWilling ? (
          <div className="mt-2 space-y-2">
            <p className="text-white font-semibold">
              Willing and available: {willingOption?.label ?? willing}
            </p>
            <button
              type="button"
              onClick={() => setShowJournal((v) => !v)}
              className="no-print min-h-[44px] text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
            >
              {showJournal ? "Hide my journal" : "Show my journal"}
            </button>
            {showJournal && (
              <div className="no-print space-y-3 mt-2">
                {JOURNAL_PROMPTS.map((p) => (
                  <div key={p.key}>
                    <p className="text-sm text-[var(--muted)]">{p.label}</p>
                    <p className="mt-1 text-sm text-white">{textOf(callable[p.key]) || "(not answered)"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyNext line="You haven't answered yet." label="Answer the question" step={STEP_NUMBER.callable} />
        )}
      </section>

      {/* My yes to the Shared Call */}
      <section className="panel night-section p-5">
        <h2 className="night-h2">My yes to the Shared Call</h2>
        {hasShared ? (
          <p className="mt-2 text-white font-semibold">
            Said yes {sharedDate ? `on ${sharedDate}` : ""}
          </p>
        ) : (
          <EmptyNext line="You haven't said yes yet." label="Save my yes" step={STEP_NUMBER.shared} />
        )}
      </section>

      {/* My gifts */}
      <section className="panel night-section p-5">
        <h2 className="night-h2">My gifts</h2>
        {hasApest && gifts.length >= 2 ? (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {gifts.map((role) => {
              const text = APEST_CALLING_TEXT[role];
              return (
                <div key={role}>
                  <p className="text-white font-semibold">{text.name}</p>
                  <p className="mt-1 text-sm text-gray-300">{text.equips}</p>
                  <p className="mt-1 text-sm text-gray-300">
                    <span className="font-semibold text-white">Watch for: </span>
                    {text.immature}
                  </p>
                </div>
              );
            })}
            {typeof apest?.reflection === "string" && apest.reflection.trim() ? (
              <div className="md:col-span-2 space-y-2 border-t border-[var(--border)] pt-3">
                <p className="text-white font-semibold">A personal reflection</p>
                {apest.reflection
                  .split(/\n\s*\n/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="text-sm text-gray-300">
                      {para}
                    </p>
                  ))}
                <p className="text-xs text-[var(--muted)]">Written by AI from your results.</p>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyNext line="You haven't taken the APEST quiz yet." label="Take the quiz" step={STEP_NUMBER.apest} />
        )}
      </section>

      {/* My mission field */}
      <section className="panel night-section p-5">
        <h2 className="night-h2">My mission field</h2>
        {hasSeasonal ? (
          <div className="mt-2 space-y-2">
            {peopleError ? (
              <p className="text-sm text-amber-400">We couldn&rsquo;t load your people. Reload to try again.</p>
            ) : !peopleLoaded ? (
              <p className="text-sm text-[var(--muted)]">Loading your people...</p>
            ) : (
              (["first", "second", "third"] as const).map((s) => {
                const n = people.filter((p) => Array.isArray(p.spaces) && p.spaces.includes(s)).length;
                return (
                  <p key={s} className="text-sm text-gray-300">
                    {SPACE_CONTENT[s].name} ({SPACE_CONTENT[s].short}): {n} people
                  </p>
                );
              })
            )}
            {peopleGroup ? (
              <p className="text-sm text-gray-300">People group: &ldquo;{peopleGroup}&rdquo;</p>
            ) : null}
            {hostingSpace ? (
              <p className="text-sm text-gray-300">
                Hosting space: {SPACE_CONTENT[hostingSpace].name}: {SPACE_CONTENT[hostingSpace].pro}
              </p>
            ) : null}
            {riceDecision ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Decision: </span>
                {riceDecision}
              </p>
            ) : null}
            {hasRice && (
              <div className="space-y-1">
                {riceFields.map((f) => (
                  <p key={f.key} className="text-sm text-gray-300">
                    <span className="font-semibold text-white">
                      {f.letter} ({f.label}):{" "}
                    </span>
                    {textOf(rice[f.key])}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyNext
            line="You haven't mapped your mission field yet."
            label="Map my mission field"
            step={STEP_NUMBER.seasonal}
          />
        )}
      </section>

      {/* My conversation */}
      <section className="panel night-section p-5">
        <h2 className="night-h2">My conversation</h2>
        {hasConversation ? (
          <p className="mt-2 text-white font-semibold">{conversationDate ? `Booked for ${conversationDate}` : "Booked"}</p>
        ) : (
          <EmptyNext line="Not booked yet." label="Book the conversation" step={STEP_NUMBER.conversation} />
        )}
      </section>

      <JourneyFooter />
    </div>
    </div>
  );
}
