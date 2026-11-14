"use client";

import { useEffect, useState } from "react";
import { dedupedLeaderJson } from "@/lib/client/dedupeFetch";
import { STORY_CATEGORIES, type YearStories } from "@/lib/domain/huddleStories";

// The first thing on the leader dashboard: this year's Metrics of Success
// as numbers ("we count stories, not seats"). Updated by an admin after
// each Pathway Huddle (Admin > Huddle Stories). No names, ever. If the
// numbers can't load, the card stays out of the way.
export default function HuddleStoriesCard() {
  const [stories, setStories] = useState<YearStories | null>(null);

  useEffect(() => {
    let cancelled = false;
    dedupedLeaderJson<YearStories>("/api/huddle-stories").then(
      (data) => {
        if (!cancelled) setStories(data);
      },
      (e: unknown) => console.error("HuddleStoriesCard: could not load the year's stories", e)
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stories) return null;

  return (
    <section aria-labelledby="stories-title" className="night-card mb-10 p-5 sm:p-7">
      <p className="night-label !text-[var(--lamp)]">We count stories, not seats</p>
      <h2 id="stories-title" className="mt-1 font-sans text-2xl font-bold uppercase tracking-tight text-[var(--ink)] sm:text-3xl">
        {stories.year}: Stories, not seats
      </h2>

      <dl className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-4">
        {STORY_CATEGORIES.map((c) => (
          <div key={c.key} className="sm:border-l sm:border-[var(--line)] sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
            <dt className="night-label">
              {c.name} · {c.verb}
            </dt>
            <dd className="mt-1">
              <span className="block font-sans text-5xl font-bold leading-none text-white tabular-nums">
                {stories.totals[c.key]}
              </span>
              <span className="mt-2 block text-sm leading-snug text-[var(--muted)]">
                {stories.totals[c.key] === 1 ? "person" : "people"} {c.line}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 border-t border-[var(--line)] pt-4 text-xs text-[var(--dim)]">
        {stories.latest ? `Updated after the ${stories.latest.label}. ` : "Updated after each Pathway Huddle. "}
        Each person is counted once a year.
      </p>
    </section>
  );
}
