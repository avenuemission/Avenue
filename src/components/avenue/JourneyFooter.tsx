import { NLT_NOTICE } from "@/app/leaders/training/verses";

// The NLT copyright notice required for web use (spec 5), at the foot of
// every journey screen that quotes a verse. Not printed.
export default function JourneyFooter() {
  return (
    <footer className="no-print mt-16 border-t border-[var(--line)] pt-6">
      <p className="max-w-[70ch] text-xs leading-relaxed text-[var(--dim)]">{NLT_NOTICE}</p>
    </footer>
  );
}
