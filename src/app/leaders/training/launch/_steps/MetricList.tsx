import { COUNTER_KEYS, COUNTER_MEANINGS, COUNTER_NAMES } from "@/lib/domain/arena";

// The three metrics with their plain meanings. The Metrics step and the
// scenarios' score key both render this list, from one source of names and
// meanings, so the two can never disagree.
export default function MetricList() {
  return (
    <dl className="mt-4 space-y-3">
      {COUNTER_KEYS.map((k) => (
        <div key={k}>
          <dt className="text-sm font-semibold text-[var(--ink)]">{COUNTER_NAMES[k]}</dt>
          <dd className="text-sm text-[var(--muted)]">{COUNTER_MEANINGS[k]}</dd>
        </div>
      ))}
    </dl>
  );
}
