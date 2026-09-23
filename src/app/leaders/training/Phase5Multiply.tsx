import Link from "next/link";
import { Users, MessageCircle } from "lucide-react";

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

// Hero Maker's five practices (Dave Ferguson) - a different set from the
// five apprenticeship steps above. The steps describe how one
// apprenticeship relationship moves along (APPRENTICE_STEPS); the
// practices are the five habits of a multiplying leader. The crash-course
// placeholder below is laid out over the practices, not the steps: the
// steps are already shown, per person, in "Your people" directly beneath
// it, so scaffolding the placeholder for steps would just duplicate that
// list rather than covering new ground.
const HERO_MAKER_PRACTICES: string[] = [
  "Multiplication Thinking",
  "Permission Giving",
  "Disciple Multiplying",
  "Gift Activating",
  "Kingdom Building",
];

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
}

// Phase 5 (Multiply) content, shown instead of the modules grid. State and
// handlers come from useNetworkView via the page; sentByViewer is computed
// in the page because the orbital summary reads it too.
export default function Phase5Multiply({
  sentByViewer,
  networkLoaded,
  networkError,
  networkDepth,
  stepUpdatingId,
  stepError,
  setApprenticeStep,
}: Phase5MultiplyProps) {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Hero Maker crash course: a clearly marked placeholder,
          laid out for the five practices, not the five
          apprenticeship steps (those are already shown, per
          person, in "Your people" below). No invented
          teaching goes here. */}
      <div className="panel p-6">
        <span className="eyebrow">Placeholder</span>
        <h3 className="text-lg font-semibold text-white mt-1 mb-2">Hero Maker, by Dave Ferguson</h3>
        <p className="text-sm text-[var(--muted)] leading-relaxed mb-5">
          Ferguson&rsquo;s case is that multiplication is not a course you finish, it is five
          practices you build as habits. The crash course on each practice goes here.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {HERO_MAKER_PRACTICES.map((practice) => (
            <div key={practice} className="rounded-lg border border-dashed border-[var(--border)] p-3 text-center">
              <span className="text-xs uppercase tracking-wider text-[var(--muted)]">{practice}</span>
              <p className="text-[11px] text-[var(--muted)] mt-2 italic">
                Crash course notes coming soon
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Your people: the core of the phase */}
      <div className="panel p-6">
        <span className="eyebrow">Your people</span>
        <h3 className="text-lg font-semibold text-white mt-1 mb-4">Who you&rsquo;re sending out</h3>
        {!networkLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your network...</p>
        ) : networkError ? (
          <p className="text-sm text-red-400">{networkError}</p>
        ) : sentByViewer.length === 0 ? (
          // The common case, not a broken screen: most leaders
          // are sending nobody out yet, and that is a
          // beginning with an obvious next step, not an error.
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
            <Users className="w-6 h-6 text-[var(--accent)] mx-auto mb-3" />
            <p className="text-sm text-white mb-1">You&rsquo;re not sending anyone out yet.</p>
            <p className="text-sm text-[var(--muted)] mb-4">
              That&rsquo;s the starting line, not a gap. Add the first person you&rsquo;re sending
              out and the apprenticeship steps below start to mean something.
            </p>
            <Link
              href="/leaders/network"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90"
            >
              Add someone to your network
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sentByViewer.map((person) => {
              const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
              const isUpdating = stepUpdatingId === person.id;
              return (
                <div
                  key={person.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border border-[var(--border)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                    <p className="text-sm text-[var(--accent)] mt-0.5">
                      {apprenticeStepLabel(person.apprenticeStep)}
                    </p>
                    {stepError?.id === person.id && (
                      <p className="text-xs text-red-400 mt-1">{stepError.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setApprenticeStep(person.id, person.apprenticeStep - 1)}
                      disabled={isUpdating || person.apprenticeStep <= 0}
                      aria-label={`Lower ${name}'s apprenticeship step`}
                      className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs font-semibold text-white transition-colors hover:border-[var(--border-strong)] disabled:opacity-30"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprenticeStep(person.id, person.apprenticeStep + 1)}
                      disabled={isUpdating || person.apprenticeStep >= 5}
                      aria-label={`Advance ${name}'s apprenticeship step`}
                      className="px-3 py-1.5 rounded-full bg-[var(--accent)] text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isUpdating ? "Saving..." : "Advance"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multiplication depth: Ferguson's Kingdom Building
          measure. Counts kingdom advance, not a score, and a
          zero reads as a beginning rather than a failure. */}
      <div className="panel p-6 text-center">
        <span className="eyebrow">Kingdom advance</span>
        {/* Gated on networkLoaded/networkError, same as "Your
            people" above: without this, a leader with a real
            network briefly saw "This is the beginning" before
            it corrected, and on a failed load saw a red error
            right next to a confident "This is the
            beginning" with no indication the count was
            unknown rather than genuinely zero. */}
        {!networkLoaded ? (
          <p className="text-sm text-[var(--muted)] mt-2">Loading your network...</p>
        ) : networkError ? (
          <p className="text-sm text-red-400 mt-2">{networkError}</p>
        ) : networkDepth.people === 0 ? (
          <>
            <p className="text-3xl font-bold text-white mt-2">This is the beginning</p>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">
              Nobody is multiplying below you yet. The first person you send out is where a
              multiplication depth starts counting.
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl font-bold text-white mt-2 tabular-nums">{networkDepth.people}</p>
            <p className="text-sm text-[var(--muted)] mt-2">
              {networkDepth.people === 1 ? "person" : "people"} multiplying through{" "}
              {networkDepth.generations} {networkDepth.generations === 1 ? "generation" : "generations"}{" "}
              below you
            </p>
          </>
        )}
      </div>

      {/* The family tree link, and an ICNU nudge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        <div className="panel p-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-[var(--accent)]" />
            <span className="eyebrow">ICNU</span>
          </div>
          <h3 className="text-base font-semibold text-white mb-2">Permission Giving</h3>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
            Ferguson&rsquo;s ICNU tool: name one person, then finish the sentence, &ldquo;I see
            in you...&rdquo; That&rsquo;s the whole conversation. Nothing here is saved or
            logged, so have it, then add them.
          </p>
          <Link
            href="/leaders/network"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-white text-sm font-semibold transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            Add them to your network
          </Link>
        </div>
      </div>
    </div>
  );
}
