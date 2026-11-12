// Step list maths for the Calling and Launch wizards. Pure.

export interface WizardStepMeta {
  id: string;
  title: string;
  minutes: number;
  complete: boolean;
}

// Resume point: the first incomplete step, or step 1 when all are done.
export function firstIncompleteIndex(steps: WizardStepMeta[]): number {
  // When everything is done, start again at step 1 (for review), not the
  // last step: opening Conversation every time felt like being sent back.
  const i = steps.findIndex((s) => !s.complete);
  return i >= 0 ? i : 0;
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
