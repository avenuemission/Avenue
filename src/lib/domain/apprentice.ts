// Multiply's rung checklist: tapping a rung sets the apprenticeship step to
// that rung; tapping the current top rung again steps back one.
export function rungAfterTap(current: number, tapped: number): number {
  if (!Number.isInteger(tapped) || tapped < 1 || tapped > 5) {
    throw new Error(`rung must be 1 to 5, got ${tapped}`);
  }
  return tapped === current ? tapped - 1 : tapped;
}

// Hero Maker's five apprenticeship steps (Dave Ferguson). Index 0 is not one
// of the book's five: it is "not started yet", so every person in the
// network always has a valid label, including someone just added. The names
// are the teaching, so screens and emails always show the label, never the
// bare number.
export const APPRENTICE_STEPS: readonly { value: number; label: string }[] = [
  { value: 0, label: "Not started yet" },
  { value: 1, label: "I do, you watch" },
  { value: 2, label: "I do, you help" },
  { value: 3, label: "You do, I help" },
  { value: 4, label: "You do, I watch" },
  { value: 5, label: "You do, someone else watches" },
];

export function apprenticeStepLabel(step: number): string {
  return APPRENTICE_STEPS[step]?.label ?? APPRENTICE_STEPS[0].label;
}

// One line on how to help someone onto each rung (the apprentice email).
// Henry to check wording
export const APPRENTICE_HOW_TO: Record<number, string> = {
  1: "Bring them along and let them watch you lead one gathering.",
  2: "Give them one part to run with you, like the welcome or the prayer.",
  3: "Let them lead while you sit beside them and step in only if needed.",
  4: "Let them lead on their own while you watch, then talk it through together.",
  5: "Help them find their own apprentice to bring along.",
};
