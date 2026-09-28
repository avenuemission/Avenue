"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, CheckCircle2, Circle, UserPlus } from "lucide-react";
import { APPRENTICE_STEPS, apprenticeStepLabel, rungAfterTap } from "@/lib/domain/apprentice";
import { multiplySummary } from "@/lib/domain/phaseSummaries";
import type { Person } from "@/lib/domain/people";
import type { NetworkDepth, NetworkPerson } from "@/lib/domain/network";
import IcnuEditor from "./IcnuEditor";
import Glow from "@/components/leaders/avenue/Glow";
import Expander from "@/components/leaders/avenue/Expander";

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
  icnuDrafts: Map<string, string>;
  addPerson: (fields: { firstName: string; lastName: string; email: string }) => Promise<string | null>;
  addingPerson: boolean;
  teachingTitle: string; // the phase subtitle, shown inside "Why multiply?"
  teaching: string; // the Paul and Timothy teaching (phase description)
}

const FIELD =
  "w-full min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white focus:outline-none focus:border-[var(--accent)]";

// Adds someone this leader is apprenticing without leaving Multiply. Uses
// the network page's "add" action, so the person also appears on the
// family tree. Email is optional; when it matches an existing account the
// network links them.
function AddPersonForm({
  addPerson,
  addingPerson,
  startOpen,
}: {
  addPerson: Phase5MultiplyProps["addPerson"];
  addingPerson: boolean;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"
      >
        <UserPlus className="w-4 h-4" />
        Add someone you&rsquo;re apprenticing
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError("Add their first name.");
      return;
    }
    setError(null);
    const problem = await addPerson({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
    });
    if (problem) {
      setError(problem);
      return;
    }
    setForm({ firstName: "", lastName: "", email: "" });
    if (!startOpen) setOpen(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      <p className="text-sm font-semibold text-white">Add someone you&rsquo;re apprenticing</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-[var(--muted)] mb-1">First name</span>
          <input
            id="multiply-add-first"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            maxLength={80}
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="block text-xs text-[var(--muted)] mb-1">Last name (optional)</span>
          <input
            id="multiply-add-last"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            maxLength={80}
            className={FIELD}
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs text-[var(--muted)] mb-1">Email (optional)</span>
        <input
          id="multiply-add-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={FIELD}
        />
        <span className="block text-xs text-[var(--muted)] mt-1">
          If they already have an Avenue login, use that email so it links to them.
        </span>
      </label>
      {error && <p className="text-sm text-amber-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={addingPerson}
          className="min-h-[44px] rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {addingPerson ? "Adding..." : "Add to my people"}
        </button>
        {!startOpen && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="min-h-[44px] text-sm font-semibold text-[var(--muted)]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Phase 5 (Multiply), round 2 spec 5: people first. The person list and the
// add form lead, then one summary line and the family tree link, then the
// teaching behind "Why multiply?". State and handlers come from
// useNetworkView and useMyPeople via the page. Each row is person-first: a
// private ICNU note plus a five-rung apprenticeship checklist, collapsed
// until tapped so the list stays scannable.
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
  icnuDrafts,
  addPerson,
  addingPerson,
  teachingTitle,
  teaching,
}: Phase5MultiplyProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <div className="space-y-10">
      {/* Your people: the core of the phase, a list on the night ground */}
      <div>
        <span className="eyebrow">Your people</span>
        <h3 className="night-h2 mt-1 mb-4">Who you&rsquo;re sending out</h3>
        {!networkLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your network...</p>
        ) : networkError ? (
          <p className="text-sm text-red-400">{networkError}</p>
        ) : sentByViewer.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--ink)]">
              No one yet. Add someone you&rsquo;re apprenticing, then tap their name for your
              &ldquo;What I see in you&rdquo; note and the five apprenticeship steps.
            </p>
            <AddPersonForm addPerson={addPerson} addingPerson={addingPerson} startOpen />
          </div>
        ) : (
          <div className="space-y-4">
            {peopleError && <p className="text-red-400 text-sm">{peopleError}</p>}
            <ul className="border-t border-[var(--line)]">
              {sentByViewer.map((person) => {
                const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
                const isOpen = expandedId === person.id;
                const isUpdating = stepUpdatingId === person.id;
                const linked = people.find((p) => p.networkPersonId === person.id);
                return (
                  <li key={person.id} className="border-b border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : person.id)}
                      aria-expanded={isOpen}
                      className="w-full min-h-[44px] flex items-center gap-3 text-left py-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-sans text-xl font-semibold text-[var(--ink)]">{name}</p>
                        <p
                          className={`text-sm mt-0.5 ${
                            person.apprenticeStep >= 1 ? "text-[var(--lamp)]" : "text-[var(--muted)]"
                          }`}
                        >
                          {apprenticeStepLabel(person.apprenticeStep)}
                        </p>
                      </div>
                      <Glow
                        trigger={person.apprenticeStep}
                        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full p-1"
                      >
                        {[1, 2, 3, 4, 5].map((rung) => (
                          <span
                            key={rung}
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 rounded-full ${
                              rung <= person.apprenticeStep
                                ? "bg-[var(--lamp)] shadow-[0_0_8px_2px_rgba(255,197,107,0.45)]"
                                : "bg-[var(--line-2)]"
                            }`}
                          />
                        ))}
                      </Glow>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--muted)] transition-transform flex-shrink-0 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-5 space-y-4">
                        {peopleLoaded && !peopleError && (
                          <IcnuEditor
                            networkPerson={person}
                            linked={linked}
                            ensurePersonForNetwork={ensurePersonForNetwork}
                            patchPerson={patchPerson}
                            icnuDrafts={icnuDrafts}
                          />
                        )}
                        <div>
                          <span className="eyebrow">Apprenticeship steps</span>
                          <div className="space-y-1 mt-2">
                            {APPRENTICE_STEPS.filter((s) => s.value >= 1).map(({ value: rung, label }) => (
                              <button
                                key={rung}
                                type="button"
                                onClick={() => setApprenticeStep(person.id, rungAfterTap(person.apprenticeStep, rung))}
                                disabled={isUpdating}
                                aria-pressed={rung <= person.apprenticeStep}
                                className="min-h-[44px] w-full flex items-center gap-3 text-left disabled:opacity-50"
                              >
                                {rung <= person.apprenticeStep ? (
                                  <CheckCircle2 className="w-5 h-5 text-[var(--lamp)] flex-shrink-0" />
                                ) : (
                                  <Circle className="w-5 h-5 text-[var(--dim)] flex-shrink-0" />
                                )}
                                <span className="text-sm text-[var(--ink)]">{label}</span>
                              </button>
                            ))}
                          </div>
                          {stepError?.id === person.id && (
                            <p className="text-xs text-red-400 mt-1">{stepError.message}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <AddPersonForm addPerson={addPerson} addingPerson={addingPerson} startOpen={false} />
          </div>
        )}
      </div>

      {/* One summary line, then the family tree as a single link. A
          network error is already shown in the list above, so it is not
          repeated here. */}
      <div>
        {networkLoaded && !networkError ? (
          <p className="text-sm text-[var(--ink)]">{multiplySummary(networkDepth)}</p>
        ) : null}
        <Link
          href="/leaders/network"
          className="mt-1 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--accent)]"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          See the family tree
        </Link>
      </div>

      {/* The teaching, behind an expander */}
      <div className="border-b border-[var(--line)]">
        <Expander id="multiply-why" title="Why multiply?" open={whyOpen} onToggle={() => setWhyOpen((o) => !o)}>
          <p className="night-label">{teachingTitle}</p>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">{teaching}</p>
          <p className="mt-6 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">
            Hero Maker&rsquo;s five practices: Multiplication Thinking, Permission Giving, Disciple
            Multiplying, Gift Activating, Kingdom Building.
          </p>
        </Expander>
      </div>
    </div>
  );
}
