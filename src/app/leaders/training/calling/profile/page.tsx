"use client";

import { useState } from "react";
import Link from "next/link";
import PrintButton from "@/components/journey/PrintButton";
import { useLeaderGate } from "@/lib/useLeaderGate";
import { useWorksheet } from "@/lib/useWorksheet";
import { useMyPeople } from "@/lib/useMyPeople";
import { layersScore, type CallingData } from "@/lib/journey";
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
  const { people, peopleLoaded } = useMyPeople(ready);
  const [showJournal, setShowJournal] = useState(false);

  if (gateError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="panel p-5 md:p-8">
          <p className="text-amber-400">{gateError}</p>
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
        </div>
      </div>
    );
  }

  const layers = data.layers;
  const placements = (layers?.placements ?? {}) as Record<string, string>;
  const hasLayers = Object.keys(placements).length > 0;

  const callable = data.callable;
  const hasWilling = !!callable?.willing;
  const willingOption = WILLING_OPTIONS.find((o) => o.value === callable?.willing);

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

  const seasonal = data.seasonal;
  const hasSeasonal = !!seasonal && (!!seasonal.peopleGroup || !!seasonal.hostingSpace);
  const rice = seasonal?.rice;
  const hasRice = !!rice && Object.values(rice).some((v) => typeof v === "string" && v.trim().length > 0);

  const conversation = data.conversation;
  const hasConversation = conversation?.booked === true;
  const conversationDate = dateAU(conversation?.date);

  return (
    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href="/leaders/training/calling" className="min-h-[44px] inline-flex items-center text-sm text-[var(--muted)] hover:text-white">
          Back to Calling
        </Link>
        <PrintButton />
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Calling Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Private to you. Your sender and the admins cannot see it.
        </p>
      </div>

      {/* My three layers */}
      <section className="panel p-5">
        <p className="eyebrow">My three layers</p>
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
      <section className="panel p-5">
        <p className="eyebrow">My availability</p>
        {hasWilling ? (
          <div className="mt-2 space-y-2">
            <p className="text-white font-semibold">
              Willing and available: {willingOption?.label ?? callable?.willing}
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
                    <p className="mt-1 text-sm text-white">{callable?.[p.key] || "(not answered)"}</p>
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
      <section className="panel p-5">
        <p className="eyebrow">My yes to the Shared Call</p>
        {hasShared ? (
          <p className="mt-2 text-white font-semibold">
            Said yes {sharedDate ? `on ${sharedDate}` : ""}
          </p>
        ) : (
          <EmptyNext line="You haven't said yes yet." label="Save my yes" step={STEP_NUMBER.shared} />
        )}
      </section>

      {/* My gifts */}
      <section className="panel p-5">
        <p className="eyebrow">My gifts</p>
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
          </div>
        ) : (
          <EmptyNext line="You haven't taken the APEST quiz yet." label="Take the quiz" step={STEP_NUMBER.apest} />
        )}
      </section>

      {/* My mission field */}
      <section className="panel p-5">
        <p className="eyebrow">My mission field</p>
        {hasSeasonal ? (
          <div className="mt-2 space-y-2">
            {peopleLoaded &&
              (["first", "second", "third"] as const).map((s) => {
                const n = people.filter((p) => p.spaces.includes(s)).length;
                return (
                  <p key={s} className="text-sm text-gray-300">
                    {SPACE_CONTENT[s].name} ({SPACE_CONTENT[s].short}): {n} people
                  </p>
                );
              })}
            {seasonal?.peopleGroup ? (
              <p className="text-sm text-gray-300">People group: &ldquo;{seasonal.peopleGroup}&rdquo;</p>
            ) : null}
            {seasonal?.hostingSpace ? (
              <p className="text-sm text-gray-300">
                Hosting space: {SPACE_CONTENT[seasonal.hostingSpace].name}: {SPACE_CONTENT[seasonal.hostingSpace].pro}
              </p>
            ) : null}
            {rice?.decision ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Decision: </span>
                {rice.decision}
              </p>
            ) : null}
            {hasRice && (
              <div className="space-y-1">
                {RICE_FIELDS.filter((f) => rice?.[f.key]).map((f) => (
                  <p key={f.key} className="text-sm text-gray-300">
                    <span className="font-semibold text-white">
                      {f.letter} ({f.label}):{" "}
                    </span>
                    {rice?.[f.key]}
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
      <section className="panel p-5">
        <p className="eyebrow">My conversation</p>
        {hasConversation ? (
          <p className="mt-2 text-white font-semibold">{conversationDate ? `Booked for ${conversationDate}` : "Booked"}</p>
        ) : (
          <EmptyNext line="Not booked yet." label="Book the conversation" step={STEP_NUMBER.conversation} />
        )}
      </section>
    </div>
  );
}
