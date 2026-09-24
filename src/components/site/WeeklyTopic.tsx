"use client";

import { useEffect, useState } from "react";
import { getStudyGuides } from "@/lib/client/content";
import { guideOnToLocalDate } from "@/lib/domain/studyGuides";
import Reveal from "@/components/ui/Reveal";
import { CalendarDays, ChevronDown } from "lucide-react";

// Avenue's Pathways Podcast. The Spotify show player always lists the newest
// episodes first, so this stays current without any API calls.
const SPOTIFY_SHOW_ID = "127V2svOSv6x4Xh6Uu6ZaH";
const SPOTIFY_SHOW_URL = `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`;

interface Weekly {
  topic: string;
  series: string;
  scripture: string;
}

interface UpcomingWeek {
  date: string; // pre-formatted, e.g. "15 Aug"
  topic: string;
  scripture: string;
}

interface UpcomingSeries {
  series: string;
  weeks: UpcomingWeek[];
}

// "This week" = the most recent guide dated on or before today. If every guide
// is still in the future, fall back to the soonest upcoming one.
function pickCurrentGuide(guides: Array<Record<string, unknown>>): Record<string, unknown> | null {
  const dated = guides
    .map((g) => ({ g, d: guideOnToLocalDate(g.guide_on) }))
    .filter((x): x is { g: Record<string, unknown>; d: Date } => x.d !== null);

  if (dated.length === 0) return guides[0] ?? null;

  const now = Date.now();
  const past = dated.filter((x) => x.d.getTime() <= now);
  if (past.length > 0) {
    return past.reduce((a, b) => (b.d.getTime() > a.d.getTime() ? b : a)).g;
  }
  return dated.reduce((a, b) => (b.d.getTime() < a.d.getTime() ? b : a)).g;
}

// Everything dated after today, in date order, grouped under its series so the
// schedule reads as terms rather than one long list.
function groupUpcomingBySeries(guides: Array<Record<string, unknown>>): UpcomingSeries[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // today's topic is "current", not "upcoming"

  const future = guides
    .map((g) => ({ g, d: guideOnToLocalDate(g.guide_on) }))
    .filter((x): x is { g: Record<string, unknown>; d: Date } => x.d !== null)
    .filter((x) => x.d.getTime() > now.getTime())
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  const groups: UpcomingSeries[] = [];
  for (const { g, d } of future) {
    const series = String(g.series ?? "Upcoming");
    let group = groups.find((x) => x.series === series);
    if (!group) {
      group = { series, weeks: [] };
      groups.push(group);
    }
    group.weeks.push({
      date: d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      topic: String(g.topic ?? ""),
      scripture: String(g.scripture ?? ""),
    });
  }
  return groups;
}

export default function WeeklyTopic() {
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingSeries[]>([]);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => {
    getStudyGuides()
      .then((guides) => {
        const all = guides as unknown as Array<Record<string, unknown>>;

        const current = pickCurrentGuide(all);
        if (current) {
          setWeekly({
            topic: String(current.topic ?? ""),
            series: String(current.series ?? ""),
            scripture: String(current.scripture ?? ""),
          });
        }

        setUpcoming(groupUpcomingBySeries(all));
      })
      .catch(() => {});
  }, []);

  const upcomingCount = upcoming.reduce((n, s) => n + s.weeks.length, 0);

  return (
    <section className="bg-black py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-6 sm:px-10">
        <Reveal className="text-center mb-10">
          <span className="eyebrow mb-4">Weekly Discussion</span>
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
            This Week&apos;s Topic
          </h2>
          <p className="mt-4 text-[var(--muted)] md:text-lg leading-relaxed">
            What pathway groups are exploring together this week.
          </p>
        </Reveal>

        {weekly && (
          <Reveal>
            <div className="panel p-6 md:p-10 text-center">
              {weekly.series && <span className="eyebrow mb-3">{weekly.series}</span>}
              <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                {weekly.topic}
              </h3>
              {weekly.scripture && (
                <p className="mt-4 text-[var(--muted)] md:text-lg">{weekly.scripture}</p>
              )}
            </div>
          </Reveal>
        )}

        {/* Look ahead: upcoming weeks, grouped by series */}
        {upcomingCount > 0 && (
          <Reveal delay={60} className="mt-4">
            <button
              type="button"
              onClick={() => setShowUpcoming((v) => !v)}
              aria-expanded={showUpcoming}
              aria-controls="upcoming-weeks"
              className="panel panel-interactive group flex w-full items-center justify-between gap-4 px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span className="flex items-center gap-3 text-left">
                <CalendarDays className="w-5 h-5 flex-shrink-0 text-[var(--accent)]" />
                <span className="text-sm md:text-base font-semibold text-white">
                  See upcoming weeks
                </span>
                <span className="text-xs text-[var(--muted)] tabular-nums">
                  {upcomingCount} scheduled
                </span>
              </span>
              <ChevronDown
                size={20}
                aria-hidden="true"
                className={`flex-shrink-0 text-[var(--muted)] transition-transform duration-300 ${
                  showUpcoming ? "rotate-180 text-[var(--accent)]" : ""
                }`}
              />
            </button>

            <div
              id="upcoming-weeks"
              className={`grid transition-all duration-500 ease-out ${
                showUpcoming ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="panel p-5 md:p-7 space-y-7">
                  {upcoming.map((group) => (
                    <div key={group.series}>
                      <span className="eyebrow mb-3">{group.series}</span>
                      <ul className="divide-y divide-[var(--border)]">
                        {group.weeks.map((w) => (
                          <li
                            key={`${group.series}-${w.date}-${w.topic}`}
                            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                          >
                            <span className="w-14 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] tabular-nums">
                              {w.date}
                            </span>
                            <span className="flex-1 min-w-[8rem] text-sm md:text-base font-medium text-white">
                              {w.topic}
                            </span>
                            {w.scripture && (
                              <span className="text-xs md:text-sm text-[var(--muted)]">
                                {w.scripture}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* Latest from the Pathways Podcast */}
        <Reveal delay={100} className="mt-6">
          <div className="panel p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <span className="eyebrow mb-1">Pathways Podcast</span>
                <p className="text-sm text-[var(--muted)]">
                  Listen to the latest episode
                </p>
              </div>
              <a
                href={SPOTIFY_SHOW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[var(--accent)] hover:brightness-110 transition-all"
              >
                Open in Spotify →
              </a>
            </div>
            <div className="overflow-hidden rounded-xl">
              <iframe
                title="Pathways Podcast on Spotify"
                src={`https://open.spotify.com/embed/show/${SPOTIFY_SHOW_ID}?utm_source=generator&theme=0`}
                width="100%"
                height="352"
                style={{ border: 0 }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
