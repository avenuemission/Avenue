"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { rungAfterTap } from "@/lib/apprentice";
import type { Person } from "@/lib/people";
import IcnuEditor from "./IcnuEditor";

// Hero Maker's five apprenticeship steps (Dave Ferguson). Index 0 is not one
// of the book's five, it is "not started yet" so every person in the network
// always has a valid label, including someone just added. The names are the
// teaching, so the UI always shows the label, never the bare number.
const APPRENTICE_STEPS: { value: number; label: string }[] = [
  { value: 0, label: "Not started yet" },
  { value: 1, label: "I do, you watch" },
  { value: 2, label: "I do, you help" },
  { value: 3, label: "You do, I help" },
  { value: 4, label: "You do, I watch" },
  { value: 5, label: "You do, someone else watches" },
];

function apprenticeStepLabel(step: number): string {
  return APPRENTICE_STEPS[step]?.label ?? APPRENTICE_STEPS[0].label;
}

// A person from the discipleship network (/api/network), as seen from phase
// 5. This is a separate shape from lib/networkLayout's NetworkPerson because
// it also carries apprenticeStep, which that shared type does not yet.
export interface NetworkPerson {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  sentOutBy: string | null;
  linkStatus: "pending" | "confirmed";
  joined: boolean;
  apprenticeStep: number;
}

export interface NetworkDepth {
  generations: number;
  people: number;
}

interface Phase5MultiplyProps {
  sentByViewer: NetworkPerson[];
  networkLoaded: boolean;
  networkError: string | null;
  networkDepth: NetworkDepth;
  stepUpdatingId: string | null;
  stepError: { id: string; message: string } | null;
  setApprenticeStep: (id: string, step: number) => Promise<void>;
  people: Person[];
  peopleLoaded: boolean;
  peopleError: string | null;
  ensurePersonForNetwork: (networkPerson: NetworkPerson) => Promise<Person>;
  patchPerson: (id: string, fields: Record<string, unknown>) => Promise<Person>;
}

// Phase 5 (Multiply) content, shown instead of the modules grid. State and
// handlers come from useNetworkView and useMyPeople via the page; sentByViewer
// is computed in the page because the orbital summary reads it too. Each row
// is person-first: a private ICNU note plus a five-rung apprenticeship
// checklist, collapsed until tapped so the list stays scannable.
export default function Phase5Multiply({
  sentByViewer,
  networkLoaded,
  networkError,
  networkDepth,
  stepUpdatingId,
  stepError,
  setApprenticeStep,
  people,
  peopleLoaded,
  peopleError,
  ensurePersonForNetwork,
  patchPerson,
}: Phase5MultiplyProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <p className="text-sm text-[var(--muted)]">
        Hero Maker&rsquo;s five practices: Multiplication Thinking, Permission Giving, Disciple
        Multiplying, Gift Activating, Kingdom Building.
      </p>

      <p className="text-sm text-white">
        {!networkLoaded ? (
          "Loading your network..."
        ) : networkError ? (
          <span className="text-red-400">{networkError}</span>
        ) : networkDepth.people === 0 ? (
          "This is the beginning: nobody is multiplying below you yet."
        ) : (
          `${networkDepth.people} ${networkDepth.people === 1 ? "person" : "people"} multiplying through ${networkDepth.generations} ${networkDepth.generations === 1 ? "generation" : "generations"} below you`
        )}
      </p>

      {/* Your people: the core of the phase */}
      <div className="panel p-6">
        <span className="eyebrow">Your people</span>
        <h3 className="text-lg font-semibold text-white mt-1 mb-4">Who you&rsquo;re sending out</h3>
        {!networkLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your network...</p>
        ) : networkError ? (
          <p className="text-sm text-red-400">{networkError}</p>
        ) : sentByViewer.length === 0 ? (
          <div>
            <p className="text-sm text-white mb-2">
              No one yet. Add the people you&rsquo;re apprenticing on your network page.
            </p>
            <Link
              href="/leaders/network"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90"
            >
              Open your network page
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {peopleError && <p className="text-red-400 text-sm">{peopleError}</p>}
            {sentByViewer.map((person) => {
              const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
              const isOpen = expandedId === person.id;
              const isUpdating = stepUpdatingId === person.id;
              const linked = people.find((p) => p.networkPersonId === person.id);
              return (
                <div key={person.id} className="rounded-xl border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : person.id)}
                    aria-expanded={isOpen}
                    className="w-full min-h-[44px] flex items-center gap-3 text-left p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                      <p className="text-sm text-[var(--accent)] mt-0.5">
                        {apprenticeStepLabel(person.apprenticeStep)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((rung) => (
                        <span
                          key={rung}
                          className={`w-2.5 h-2.5 rounded-full ${
                            rung <= person.apprenticeStep ? "bg-[var(--accent)]" : "bg-[var(--surface-hover)]"
                          }`}
                        />
                      ))}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--muted)] transition-transform flex-shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-4">
                      {peopleLoaded && !peopleError && (
                        <IcnuEditor
                          networkPerson={person}
                          linked={linked}
                          ensurePersonForNetwork={ensurePersonForNetwork}
                          patchPerson={patchPerson}
                        />
                      )}
                      <div>
                        <span className="eyebrow">Apprenticeship steps</span>
                        <div className="space-y-1 mt-2">
                          {APPRENTICE_STEPS.filter((s) => s.value >= 1).map(({ value: rung, label }) => (
                            <button
                              key={rung}
                              type="button"
                              onClick={() =>
                                setApprenticeStep(person.id, rungAfterTap(person.apprenticeStep, rung))
                              }
                              disabled={isUpdating}
                              aria-pressed={rung <= person.apprenticeStep}
                              className="min-h-[44px] w-full flex items-center gap-3 text-left disabled:opacity-50"
                            >
                              {rung <= person.apprenticeStep ? (
                                <CheckCircle2 className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
                              )}
                              <span className="text-sm text-white">{label}</span>
                            </button>
                          ))}
                        </div>
                        {stepError?.id === person.id && (
                          <p className="text-xs text-red-400 mt-1">{stepError.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The family tree link */}
      <Link
        href="/leaders/network"
        className="panel p-6 flex flex-col justify-between transition-colors hover:border-[var(--border-strong)]"
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-[var(--accent)]" />
          <span className="eyebrow">Family tree</span>
        </div>
        <h3 className="text-base font-semibold text-white mb-2">See the whole network</h3>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          The same steps, seen as a chart: everyone sent out, and everyone they have sent
          out in turn.
        </p>
      </Link>
    </div>
  );
}
