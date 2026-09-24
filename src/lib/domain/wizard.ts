// Step list maths for the Calling and Launch wizards. Pure.

export interface WizardStepMeta {
  id: string;
  title: string;
  minutes: number;
  complete: boolean;
}

// Resume point: the first incomplete step, or the last step when all are done.
export function firstIncompleteIndex(steps: WizardStepMeta[]): number {
  const i = steps.findIndex((s) => !s.complete);
  if (i >= 0) return i;
  return Math.max(0, steps.length - 1);
}

export function totalMinutes(steps: WizardStepMeta[]): number {
  return steps.reduce((sum, s) => sum + s.minutes, 0);
}

export function minutesLeft(steps: WizardStepMeta[]): number {
  return steps.reduce((sum, s) => sum + (s.complete ? 0 : s.minutes), 0);
}

export function progressLabel(current: number, total: number): string {
  return `STEP ${current + 1} OF ${total}`;
}

export function timeLabel(steps: WizardStepMeta[]): string {
  const left = minutesLeft(steps);
  return left === 0 ? `~${totalMinutes(steps)} MIN · DONE` : `~${totalMinutes(steps)} MIN · ~${left} LEFT`;
}

// ?step=3 opens the third step. Anything else is ignored.
export function stepFromParam(param: string | null, count: number): number | null {
  if (!param || !/^\d+$/.test(param)) return null;
  const n = Number(param);
  return n >= 1 && n <= count ? n - 1 : null;
}
