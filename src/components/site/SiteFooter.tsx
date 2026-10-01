import Link from "next/link";
import { AVENUE_FACTS } from "@/content/site";
import { PRAYER_AND_PRAISE_WHEN, SOCIAL_PROFILES, VENUE_LINE } from "@/lib/domain/siteFacts";

const PAGE_LINKS = [
  { href: "/vision", label: "Vision" },
  { href: "/pathways", label: "Pathways" },
  { href: "/intersection", label: "Intersection" },
  { href: "/streetlights", label: "Streetlights" },
  { href: "/faq", label: "FAQ" },
];

const linkClass = "text-[var(--muted)] transition-colors hover:text-white";

/**
 * The public footer: who Avenue is, where and when Prayer & Praise meets, and
 * how to get in touch, in plain text for readers and search engines alike.
 * Server-rendered from AVENUE_FACTS. Not shown on the home page (FooterGate).
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--night)] text-sm">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        <div>
          <p className="font-semibold uppercase tracking-wider text-white">{AVENUE_FACTS.name}</p>
          <p className="mt-3 leading-relaxed text-[var(--muted)]">{AVENUE_FACTS.summary}</p>
        </div>

        <div>
          <p className="eyebrow mb-3">{AVENUE_FACTS.prayerAndPraise.name}</p>
          <p className="leading-relaxed text-[var(--muted)]">
            {PRAYER_AND_PRAISE_WHEN}
            <br />
            {VENUE_LINE}
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="eyebrow mb-3">Explore</p>
          <ul className="space-y-2">
            {PAGE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow mb-3">Contact</p>
          <a href={`mailto:${AVENUE_FACTS.email}`} className={`${linkClass} break-all`}>
            {AVENUE_FACTS.email}
          </a>
          <ul className="mt-3 space-y-2">
            {SOCIAL_PROFILES.map((profile) => (
              <li key={profile.name}>
                <a href={profile.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {profile.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
