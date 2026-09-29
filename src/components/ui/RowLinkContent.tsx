import { ChevronRight } from "lucide-react";

interface RowLinkContentProps {
  title: string;
  subtitle: string;
}

/**
 * The inside of a `.row-link` panel (the Vision-style row): uppercase title,
 * muted subtitle, arrow on the right. Put it inside an <a> or <button> that
 * has the `row-link` class, so links and popup triggers look the same.
 */
export default function RowLinkContent({ title, subtitle }: RowLinkContentProps) {
  return (
    <>
      <span>
        <span className="row-link-title">{title}</span>
        <span className="row-link-sub">{subtitle}</span>
      </span>
      <ChevronRight size={18} className="row-link-arrow" aria-hidden="true" />
    </>
  );
}
