import type { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  /** Eyebrow label shown above the section, prefixed by the route-line marker. */
  eyebrow?: string;
  /** Section heading (rendered uppercase, bold). */
  title?: string;
  /** Optional lead line under the title. */
  lead?: string;
  /** Constrain inner content width. */
  width?: "narrow" | "default" | "wide";
  /** Center the header block (eyebrow/title/lead). */
  centered?: boolean;
  className?: string;
  id?: string;
}

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-4xl",
  wide: "max-w-7xl",
};

/**
 * One consistent vertical rhythm + container for every page section. The header
 * (eyebrow + title + lead) is optional; pass children for the body.
 */
export default function Section({
  children,
  eyebrow,
  title,
  lead,
  width = "default",
  centered = false,
  className = "",
  id,
}: SectionProps) {
  const hasHeader = eyebrow || title || lead;

  return (
    <section id={id} className={`w-full py-16 md:py-24 ${className}`.trim()}>
      <div className={`mx-auto px-6 sm:px-10 ${widths[width]}`}>
        {hasHeader && (
          <header className={`mb-10 md:mb-14 ${centered ? "text-center" : ""}`}>
            {eyebrow && <span className="eyebrow mb-5">{eyebrow}</span>}
            {title && (
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
                {title}
              </h2>
            )}
            {lead && (
              <p
                className={`mt-4 text-lg text-[var(--muted)] leading-relaxed ${
                  centered ? "mx-auto max-w-2xl" : "max-w-2xl"
                }`}
              >
                {lead}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
