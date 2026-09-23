"use client";

import Link from "next/link";
import PrintButton from "@/components/journey/PrintButton";
import { useLeaderGate } from "@/lib/useLeaderGate";
import { useWorksheet } from "@/lib/useWorksheet";
import { useMyPeople } from "@/lib/useMyPeople";
import { arenaPlanFrom, detectGaps, playArena, thinSentence, thinSpots, GAP_TEXT, type EarnedPrinciple } from "@/lib/arena";
import { buildPlanActions, formatIsoDate, gapActions, gatheringsInFirstSixMonths, weeksUntil } from "@/lib/launch";
import { filled, type LaunchData } from "@/lib/journey";
import { SPACE_CONTENT } from "../../calling/content";
import { ARENA_ENABLED, CURVEBALLS, DEFAULT_ORDER } from "../arenaContent";
import { useNetworkView } from "../../useNetworkView";

function capitalise(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function GoToStep({ step }: { step: number }) {
  return (
    <Link
      href={`/leaders/training/launch?step=${step}`}
      className="no-print inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
    >
      Go to step {step}
    </Link>
  );
}

function EmptyPanel({ step }: { step: number }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-[var(--muted)]">Not written yet.</p>
      <GoToStep step={step} />
    </div>
  );
}

// Phase 3's printable one-pager (spec 5.2). Private: never visible to a
// leader's sender or the admins. No readiness score anywhere (Ruling L2).
export default function LaunchPlanPage() {
  const { user, ready, error: gateError } = useLeaderGate();
  const { data, loaded, error, saveSection } = useWorksheet<LaunchData>("launch", ready);
  const { people, peopleLoaded } = useMyPeople(ready);
  const network = useNetworkView(user, ready, ready);
  const apprenticeCount =
    !network.networkLoaded || network.networkError
      ? null
      : network.networkPeople.filter((p) => p.sentOutBy === network.networkViewerId && p.apprenticeStep >= 1).length;

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

  const prayer = data.prayer;
  const hasPrayer = filled(prayer?.when) || filled(prayer?.who) || filled(prayer?.teamPrayer);

  const mission = data.mission;
  const hasMission = filled(mission?.who) || filled(mission?.needs) || filled(mission?.gather);

  const space = data.space;
  const hasSpace = !!space?.hosting || filled(space?.place);

  const rawTeamIds = data.team?.personIds;
  const teamIds = Array.isArray(rawTeamIds) ? rawTeamIds.filter((x): x is string => typeof x === "string") : [];
  const teamNames = teamIds
    .map((id) => {
      const p = people.find((x) => x.id === id);
      return p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : "Someone no longer in My People";
    })
    .join(", ");

  const rawCommitments = data.intentional?.commitments;
  const commitments = (Array.isArray(rawCommitments) ? rawCommitments : []).filter(filled);
  const needPosition = data.intentional?.needPosition;
  const hasIntentional = commitments.length > 0 || filled(needPosition);

  const rhythm = data.rhythm;
  const hasRhythm = filled(rhythm?.launchDate) || !!rhythm?.weeklyDay || filled(rhythm?.weeklyTime);
  const weeks = rhythm?.launchDate ? weeksUntil(rhythm.launchDate, new Date()) : null;
  const gatherings =
    rhythm?.launchDate && rhythm?.weeklyDay ? gatheringsInFirstSixMonths(rhythm.launchDate, rhythm.weeklyDay) : null;

  const inviteCount = people.filter((p) => p.invitee).length;

  const invite = data.invite;
  const hasShepherding = filled(invite?.tracking) || filled(invite?.shepherding);

  const picks = data.arena?.picks ?? [];
  const showArenaSection = ARENA_ENABLED && picks.length > 0;
  let arenaEarned: EarnedPrinciple[] | null = null;
  let arenaBroken = false;
  if (showArenaSection) {
    try {
      arenaEarned = playArena(CURVEBALLS, DEFAULT_ORDER, picks).earned;
    } catch {
      arenaBroken = true;
    }
  }

  const plan = arenaPlanFrom(data, apprenticeCount);
  const gaps = detectGaps(plan);
  const spots = showArenaSection && !arenaBroken ? thinSpots(CURVEBALLS, DEFAULT_ORDER, gaps) : null;

  const nextActions = buildPlanActions(data);
  const gapChecks = gapActions(gaps);
  const doneIds = data.actions?.done ?? [];

  const toggle = (id: string) => {
    const next = doneIds.includes(id) ? doneIds.filter((x) => x !== id) : [...doneIds, id];
    saveSection("actions", { done: next });
  };

  return (
    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/leaders/training/launch"
          className="min-h-[44px] inline-flex items-center text-sm text-[var(--muted)] hover:text-white"
        >
          Back to Launch
        </Link>
        <PrintButton />
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Launch Plan</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Private to you.</p>
      </div>

      {/* Why and prayer */}
      <section className="panel p-5">
        <p className="eyebrow">Why and prayer</p>
        {hasPrayer ? (
          <div className="mt-2 space-y-2">
            {filled(prayer?.when) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">When: </span>
                {prayer!.when}
              </p>
            ) : null}
            {filled(prayer?.who) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Who prays with you: </span>
                {prayer!.who}
              </p>
            ) : null}
            {filled(prayer?.teamPrayer) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Team prayer rhythm: </span>
                {prayer!.teamPrayer}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyPanel step={1} />
        )}
      </section>

      {/* Mission group */}
      <section className="panel p-5">
        <p className="eyebrow">Mission group</p>
        {hasMission ? (
          <div className="mt-2 space-y-2">
            {filled(mission?.who) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Who: </span>
                {mission!.who}
              </p>
            ) : null}
            {filled(mission?.needs) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Needs: </span>
                {mission!.needs}
              </p>
            ) : null}
            {filled(mission?.gather) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Where they gather: </span>
                {mission!.gather}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyPanel step={2} />
        )}
      </section>

      {/* Space */}
      <section className="panel p-5">
        <p className="eyebrow">Space</p>
        {hasSpace ? (
          <div className="mt-2 space-y-2">
            {space?.hosting ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Hosting: </span>
                {SPACE_CONTENT[space.hosting].name} ({SPACE_CONTENT[space.hosting].short})
              </p>
            ) : null}
            {filled(space?.place) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Place: </span>
                {space!.place}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyPanel step={3} />
        )}
      </section>

      {/* Launch team */}
      <section className="panel p-5">
        <p className="eyebrow">Launch team</p>
        {teamIds.length > 0 ? (
          <p className="mt-2 text-sm text-gray-300">{peopleLoaded ? teamNames : "Loading..."}</p>
        ) : (
          <EmptyPanel step={4} />
        )}
      </section>

      {/* Commitments */}
      <section className="panel p-5">
        <p className="eyebrow">Commitments</p>
        {hasIntentional ? (
          <div className="mt-2 space-y-2">
            {commitments.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {commitments.map((c, i) => (
                  <li key={i} className="text-sm text-gray-300">
                    {c}
                  </li>
                ))}
              </ul>
            ) : null}
            {filled(needPosition) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Position of need: </span>
                {needPosition}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyPanel step={5} />
        )}
      </section>

      {/* Rhythm and launch date */}
      <section className="panel p-5">
        <p className="eyebrow">Rhythm and launch date</p>
        {hasRhythm ? (
          <div className="mt-2 space-y-2">
            {filled(rhythm?.launchDate) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Launch date: </span>
                {formatIsoDate(rhythm!.launchDate!)}
              </p>
            ) : null}
            {rhythm?.weeklyDay && filled(rhythm?.weeklyTime) ? (
              <p className="text-sm text-gray-300">
                Every {capitalise(rhythm.weeklyDay)} at {rhythm.weeklyTime}
              </p>
            ) : null}
            {weeks !== null && gatherings !== null ? (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="panel p-4">
                  <p className="eyebrow">Weeks until launch</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{weeks}</p>
                </div>
                <div className="panel p-4">
                  <p className="eyebrow">Gatherings in the first six months</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{gatherings}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyPanel step={6} />
        )}
      </section>

      {/* Invite list */}
      <section className="panel p-5">
        <p className="eyebrow">Invite list</p>
        {peopleLoaded && inviteCount > 0 ? (
          <p className="mt-2 text-sm text-gray-300">
            {inviteCount} {inviteCount === 1 ? "person" : "people"} on your invite list
          </p>
        ) : (
          <EmptyPanel step={7} />
        )}
      </section>

      {/* Shepherding */}
      <section className="panel p-5">
        <p className="eyebrow">Shepherding</p>
        {hasShepherding ? (
          <div className="mt-2 space-y-2">
            {filled(invite?.tracking) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Tracking: </span>
                {invite!.tracking}
              </p>
            ) : null}
            {filled(invite?.shepherding) ? (
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Shepherding: </span>
                {invite!.shepherding}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyPanel step={7} />
        )}
      </section>

      {/* Principles learned */}
      {showArenaSection ? (
        <section className="panel p-5">
          <p className="eyebrow">Principles learned</p>
          {arenaBroken ? (
            <p className="mt-2 text-sm text-gray-300">Your Arena run no longer matches the current months.</p>
          ) : arenaEarned && arenaEarned.length > 0 ? (
            <ol className="mt-2 space-y-3">
              {arenaEarned.map((e) => (
                <li key={e.month} className="border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
                  <p className="text-sm font-semibold text-white">{e.principle}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{e.anchor}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyPanel step={8} />
          )}
        </section>
      ) : null}

      {/* Where your plan is thin */}
      <section className="panel p-5">
        <p className="eyebrow">Where your plan is thin</p>
        {apprenticeCount === null ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Could not load your network, so apprentices are not checked here.
          </p>
        ) : null}
        {gaps.length === 0 ? (
          <p className="mt-2 text-sm text-gray-300">Nothing in your plan stands out as thin.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {gaps.map((gap, i) => {
              const spot = spots?.find((s) => s.gap === gap);
              const sentence = spot ? thinSentence(spot) : GAP_TEXT[gap].thin;
              const { id, text: actionText } = gapChecks[i];
              return (
                <label key={id} htmlFor={id} className="flex min-h-[44px] items-start gap-3">
                  <input
                    id={id}
                    type="checkbox"
                    checked={doneIds.includes(id)}
                    onChange={() => toggle(id)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm text-white">{sentence}</span>
                    <span className="block mt-1 text-sm text-gray-300">{actionText}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Next actions */}
      <section className="panel p-5">
        <p className="eyebrow">Next actions</p>
        {nextActions.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Fill in the steps and your next actions appear here.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {nextActions.map((action) => (
              <label key={action.id} htmlFor={action.id} className="flex min-h-[44px] items-start gap-3">
                <input
                  id={action.id}
                  type="checkbox"
                  checked={doneIds.includes(action.id)}
                  onChange={() => toggle(action.id)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-white">{action.text}</span>
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
