import type { DotStatus } from "@/lib/stepStatus";

// One step dot (round 3 spec 4): off, in progress (pulsing) or done (lit).
// Decoration only; the caller says the state in words.
export default function StepDot({ status }: { status: DotStatus }) {
  return <span aria-hidden="true" className={`av-dot is-${status}`} />;
}
