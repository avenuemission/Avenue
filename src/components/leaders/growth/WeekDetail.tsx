import type { CheckinEntry } from "@/lib/domain/checkins/types";
import { GAUGES } from "@/lib/domain/rpms";
import { formatWeekLabel } from "@/lib/domain/checkins/calendar";

export interface WeekDetailProps {
  week: string;
  checkin: CheckinEntry | null;
  onClose: () => void;
}

// The tapped week (round 2 spec 3.2): its four scores in their colours and
// the sentence, below the chart. A week with no check-in says so plainly,
// without implying the leader did anything wrong.
export default function WeekDetail({ week, checkin, onClose }: WeekDetailProps) {
  return (
    <div className="night-card mt-6 p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">Week of {formatWeekLabel(week, "long")}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Close
        </button>
      </div>
      {checkin ? (
        <>
          <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
            {GAUGES.map((g) => (
              <div key={g.key}>
                <dt className="text-xs text-[var(--muted)]">{g.label}</dt>
                <dd className="font-sans text-3xl font-bold tabular-nums" style={{ color: g.colour }}>
                  {checkin[g.key]}
                </dd>
              </div>
            ))}
          </dl>
          {checkin.reflection ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">{checkin.reflection}</p>
          ) : (
            <p className="mt-3 text-sm italic text-[var(--muted)]">No reflection written that week.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">No check-in recorded for this week.</p>
      )}
    </div>
  );
}
