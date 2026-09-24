"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RESET_COPY, RESET_FINAL, RESET_LEAD } from "@/lib/domain/worksheetReset";
import type { WorksheetKind } from "@/lib/domain/worksheets";

export interface ResetWorksheetProps {
  kind: WorksheetKind;
  onReset: () => Promise<void>; // useWorksheet's reset for this kind
  variant: "button" | "quiet"; // page foot: outlined button; hub: quiet text button
}

// Reset Calling / Reset Launch (round 3 spec 2): a button that opens a
// native <dialog> saying exactly what is wiped. Cancel has focus when it
// opens; Escape cancels (except while the reset is running). Screen only.
export default function ResetWorksheet({ kind, onReset, variant }: ResetWorksheetProps) {
  const copy = RESET_COPY[kind];
  const titleId = useId();
  const bodyId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Runs for every way the dialog closes: Cancel, Escape, a finished reset.
  const handleClose = () => {
    setOpen(false);
    setError(null);
    buttonRef.current?.focus();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReset();
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
      // A second Escape can close a modal dialog even while busy (the
      // browser's close watcher), so open it again to show the error.
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const trigger =
    variant === "button"
      ? "inline-flex min-h-[44px] items-center rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)]"
      : "inline-flex min-h-[44px] items-center text-sm text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]";

  return (
    <div className="no-print">
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={trigger}>
        {copy.button}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="av-dialog no-print"
        onClose={handleClose}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <h2 id={titleId} className="font-serif text-2xl text-[var(--ink)]">
          {copy.title}
        </h2>
        <div id={bodyId}>
          <p className="mt-3 text-sm text-[var(--ink-2)]">{RESET_LEAD}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-2)]">
            {copy.wiped.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-[var(--muted)]">{copy.kept}</p>
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">{RESET_FINAL}</p>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-amber-400">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="min-h-[44px] rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="min-h-[44px] rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
          >
            {/* Henry to check wording: the busy label */}
            {busy ? "Resetting..." : copy.confirm}
          </button>
        </div>
      </dialog>
    </div>
  );
}
