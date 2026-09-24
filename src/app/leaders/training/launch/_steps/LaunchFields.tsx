"use client";

import Link from "next/link";

// Small shared pieces for the Launch steps: a labelled textarea, a labelled
// one-line input, and the note shown when Calling is not finished.

const BOX = "mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base text-white";

export function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-[var(--muted)]">{children}</p>;
}

export function AreaField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}) {
  const { id, label, value, onChange, maxLength = 1000 } = props;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-white leading-relaxed">
        {label}
      </label>
      <textarea
        id={id}
        rows={2}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={BOX}
      />
    </div>
  );
}

export function TextField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}) {
  const { id, label, value, onChange, maxLength = 1000 } = props;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-white leading-relaxed">
        {label}
      </label>
      <input
        id={id}
        type="text"
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${BOX} min-h-[44px]`}
      />
    </div>
  );
}

export function CallingNotFinished() {
  return (
    <p className="text-sm text-[var(--muted)]">
      You haven&apos;t finished Calling yet.{" "}
      <Link
        href="/leaders/training/calling?step=5"
        className="inline-flex min-h-[44px] items-center text-[var(--accent)] font-semibold"
      >
        Finish Calling
      </Link>
    </p>
  );
}

export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
