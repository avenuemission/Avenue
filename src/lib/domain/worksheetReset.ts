// Reset Calling and Reset Launch (round 3 spec 2): the confirm dialog's
// words, the wait that lets a save already on the wire land before the
// delete (so it cannot write an old answer back afterwards), and the small
// page-wide count of saves and resets that wait relies on.
import type { WorksheetKind } from "@/lib/domain/worksheets";

export interface ResetCopy {
  button: string;
  title: string;
  wiped: string[];
  kept: string;
  confirm: string;
}

// Henry to check wording
export const RESET_LEAD = "This wipes:";
export const RESET_FINAL = "This can't be undone.";

export const RESET_COPY: Record<WorksheetKind, ResetCopy> = {
  calling: {
    // Henry to check wording
    button: "Reset Calling",
    title: "Reset Calling?",
    wiped: [
      // Henry to check wording
      "Your answers in all six Calling sections",
      // Henry to check wording
      "Your APEST results and the AI reflection",
      // Henry to check wording
      "Your Calling Profile, which is made from those answers",
    ],
    // Henry to check wording
    kept: "People on My People are kept.",
    confirm: "Yes, reset Calling",
  },
  launch: {
    // Henry to check wording
    button: "Reset Launch",
    title: "Reset Launch?",
    wiped: [
      // Henry to check wording
      "Your answers in all seven Launch steps",
      // Henry to check wording
      "Your scenarios and the Metrics step",
      // Henry to check wording
      "Your Launch Plan, including the actions you ticked",
    ],
    // Henry to check wording
    kept: "People on My People are kept.",
    confirm: "Yes, reset Launch",
  },
};

export const RESET_WAIT_MS = 15_000;
const RESET_BUSY_MESSAGE = "A save is still running, so nothing was reset. Try again.";

// Resolves once isBusy() is false, checking every pollMs. Throws
// RESET_BUSY_MESSAGE if it is still busy after timeoutMs, so the caller
// deletes nothing rather than racing a save.
export async function waitForIdle(isBusy: () => boolean, timeoutMs: number, pollMs = 50): Promise<void> {
  const start = Date.now();
  while (isBusy()) {
    if (Date.now() - start >= timeoutMs) throw new Error(RESET_BUSY_MESSAGE);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

// Page-wide bookkeeping, shared by every useWorksheet copy on the page:
// the hub, the profile, and a wizard that has just unmounted but is still
// sending its last save. reset() waits until no save of that kind is on the
// wire, and a copy that loaded before the latest reset drops its later saves
// (an APEST reflection can resolve seconds after the leader left the step).
// While a reset of a kind runs, other copies hold their saves back (they
// wait, not send). The epoch moves only once the delete succeeded, so a
// failed or timed-out reset leaves every copy saving as before.
const inFlight: Record<WorksheetKind, number> = { calling: 0, launch: 0 };
const epoch: Record<WorksheetKind, number> = { calling: 0, launch: 0 };
const resetting: Record<WorksheetKind, number> = { calling: 0, launch: 0 };

export function saveStarted(kind: WorksheetKind): void {
  inFlight[kind] += 1;
}

export function saveEnded(kind: WorksheetKind): void {
  if (inFlight[kind] <= 0) throw new Error(`saveEnded(${kind}) without a matching saveStarted`);
  inFlight[kind] -= 1;
}

export function savesInFlight(kind: WorksheetKind): number {
  return inFlight[kind];
}

export function resetEpoch(kind: WorksheetKind): number {
  return epoch[kind];
}

export function beginResetEpoch(kind: WorksheetKind): number {
  epoch[kind] += 1;
  return epoch[kind];
}

export function resetStarted(kind: WorksheetKind): void {
  resetting[kind] += 1;
}

export function resetEnded(kind: WorksheetKind): void {
  if (resetting[kind] <= 0) throw new Error(`resetEnded(${kind}) without a matching resetStarted`);
  resetting[kind] -= 1;
}

export function isResetting(kind: WorksheetKind): boolean {
  return resetting[kind] > 0;
}
