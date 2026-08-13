"use client";

import { useEffect, useState } from "react";
import { getStudyGuides } from "@/lib/content";
import Reveal from "@/components/ui/Reveal";

// Avenue's Pathways Podcast. The Spotify show player always lists the newest
// episodes first, so this stays current without any API calls.
const SPOTIFY_SHOW_ID = "127V2svOSv6x4Xh6Uu6ZaH";
const SPOTIFY_SHOW_URL = `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`;

interface Weekly {
  topic: string;
  series: string;
  scripture: string;
}

// Study guide dates are stored as "DD/MM/YYYY".
function parseGuideDate(value: string): Date | null {
  const parts = (value || "").split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((p) => parseInt(p, 10));
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

// "This week" = the most recent guide dated on or before today. If every guide
// is still in the future, fall back to the soonest upcoming one.
function pickCurrentGuide(guides: Array<Record<string, unknown>>): Record<string, unknown> | null {
  const dated = guides
    .map((g) => ({ g, d: parseGuideDate(String(g.guide_date ?? "")) }))
    .filter((x): x is { g: Record<string, unknown>; d: Date } => x.d !== null);

  if (dated.length === 0) return guides[0] ?? null;

  const now = Date.now();
  const past = dated.filter((x) => x.d.getTime() <= now);
  if (past.length > 0) {
    return past.reduce((a, b) => (b.d.getTime() > a.d.getTime() ? b : a)).g;
  }
  return dated.reduce((a, b) => (b.d.getTime() < a.d.getTime() ? b : a)).g;
}

export default function WeeklyTopic() {
  const [weekly, setWeekly] = useState<Weekly | null>(null);

  useEffect(() => {
    getStudyGuides()
      .then((guides) => {
        const current = pickCurrentGuide(guides as unknown as Array<Record<string, unknown>>);
        if (!current) return;
        setWeekly({
          topic: String(current.topic ?? ""),
          series: String(current.series ?? ""),
          scripture: String(current.scripture ?? ""),
        });
      })
      .catch(() => {});
  }, []);

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
