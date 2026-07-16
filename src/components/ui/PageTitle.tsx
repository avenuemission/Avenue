import type { ReactNode } from "react";

interface PageTitleProps {
  title: string;
  /** Scripture / lead line under the title. */
  children?: ReactNode;
}

/**
 * Standard page opener: title + optional quote, padded clear of the fixed
 * navbar. Shared by Vision, Pathways, Intersection, Streetlights so every page
 * enters the same way.
 */
export default function PageTitle({ title, children }: PageTitleProps) {
  return (
    <section className="w-full pt-32 pb-14 md:pt-40 md:pb-16">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tight text-white">
          {title}
        </h1>
        {children && (
          <p className="mt-6 mx-auto max-w-3xl text-sm md:text-lg italic text-[var(--muted)] leading-relaxed">
            {children}
          </p>
        )}
      </div>
    </section>
  );
}
