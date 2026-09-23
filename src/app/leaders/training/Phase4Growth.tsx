// The four RPMS gauges from Ferguson's Multiplier, in the fixed order the
// weekly check-in and the crash course placeholder both use.
export const RPMS_GAUGES: { key: "relational" | "physical" | "mental" | "spiritual"; label: string }[] = [
  { key: "relational", label: "Relational" },
  { key: "physical", label: "Physical" },
  { key: "mental", label: "Mental" },
  { key: "spiritual", label: "Spiritual" },
];

// How many recent weeks the history strip shows.
export const CHECKIN_HISTORY_WEEKS = 12;

// One gauge's 1-to-10 picker: ten small buttons, one tap sets the score.
// This is the whole "four taps" the check-in is meant to cost, times four
// gauges. No slider, no text field, nothing that needs explaining.
export function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-white">{label}</span>
        <span className="text-sm font-semibold text-[var(--accent)] tabular-nums">{value}/10</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n} out of 10`}
            aria-pressed={value === n}
            className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
              n <= value
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-hover)] text-[var(--muted)] hover:bg-[var(--border-strong)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
