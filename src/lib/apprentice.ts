// Multiply's rung checklist: tapping a rung sets the apprenticeship step to
// that rung; tapping the current top rung again steps back one.
export function rungAfterTap(current: number, tapped: number): number {
  if (!Number.isInteger(tapped) || tapped < 1 || tapped > 5) {
    throw new Error(`rung must be 1 to 5, got ${tapped}`);
  }
  return tapped === current ? tapped - 1 : tapped;
}
