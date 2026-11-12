"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { GuideChapter } from "@/content/training/missionGuide";

// Where a chapter heading counts as "in view": just under the site's fixed
// top bar and this nav, so the highlight changes as a heading reaches the top.
const READ_LINE_PX = 140;

// The Mission Guide's section nav. Desktop: a list stuck to the left of the
// text, highlighting the section in view. Phones: a slim bar under the top
// bar naming the current section; tap it for the list. Links jump with a
// smooth scroll (the chapters' scroll-margin clears the top bar).
export default function GuideNav({ chapters }: { chapters: GuideChapter[] }) {
  const [current, setCurrent] = useState(chapters[0]?.id ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      let here = chapters[0]?.id ?? "";
      for (const c of chapters) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= READ_LINE_PX) here = c.id;
      }
      setCurrent(here);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [chapters]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const label = chapters.find((c) => c.id === current)?.label ?? "";
  const index = chapters.findIndex((c) => c.id === current);

  const list = (
    <ol className="space-y-0.5">
      {chapters.map((c, i) => {
        const on = c.id === current;
        return (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              onClick={go(c.id)}
              aria-current={on ? "location" : undefined}
              className={`flex min-h-[40px] items-center gap-3 rounded-lg border-l-2 px-3 text-sm transition-colors ${
                on
                  ? "border-[var(--lamp)] bg-[var(--lamp-soft)] text-white"
                  : "border-transparent text-[var(--muted)] hover:text-white"
              }`}
            >
              <span className={`w-4 tabular-nums ${on ? "text-[var(--lamp)]" : "text-[var(--dim)]"}`}>{i + 1}</span>
              {c.label}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      {/* Desktop: a list beside the text, stuck under the top bar. */}
      <nav aria-label="Sections" className="sticky top-28 hidden self-start pt-14 lg:block">
        <p className="night-label mb-3 px-3">In this guide</p>
        {list}
      </nav>

      {/* Phones and tablets: a slim bar under the top bar. */}
      <nav aria-label="Sections" className="sticky top-16 z-40 -mx-4 mt-10 border-y border-[var(--line)] bg-[var(--night)]/95 backdrop-blur sm:-mx-6 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left sm:px-6"
        >
          <span className="night-label">
            {index + 1} of {chapters.length}
          </span>
          <span className="flex-1 truncate text-sm font-semibold text-white">{label}</span>
          <ChevronDown className={`h-4 w-4 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {open && <div className="max-h-[60vh] overflow-y-auto px-2 pb-3 sm:px-4">{list}</div>}
      </nav>
    </>
  );
}
