// Hero Maker's five apprenticeship steps (Dave Ferguson). Index 0 is not one
// of the book's five, it is "not started yet" so every person in the network
// always has a valid label, including someone just added. The names are the
// teaching, so the UI always shows the label, never the bare number.
export const APPRENTICE_STEPS: { value: number; label: string }[] = [
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

// Hero Maker's five practices (Dave Ferguson) - a different set from the
// five apprenticeship steps above. The steps describe how one
// apprenticeship relationship moves along (APPRENTICE_STEPS); the
// practices are the five habits of a multiplying leader. The crash-course
// placeholder below is laid out over the practices, not the steps: the
// steps are already shown, per person, in "Your people" directly beneath
// it, so scaffolding the placeholder for steps would just duplicate that
// list rather than covering new ground.
export const HERO_MAKER_PRACTICES: string[] = [
  "Multiplication Thinking",
  "Permission Giving",
  "Disciple Multiplying",
  "Gift Activating",
  "Kingdom Building",
];

// A person from the discipleship network (/api/network), as seen from phase
// 5. This is a separate shape from lib/networkLayout's NetworkPerson because
// it also carries apprenticeStep, which that shared type does not yet.
export interface NetworkPerson {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  sentOutBy: string | null;
  linkStatus: "pending" | "confirmed";
  joined: boolean;
  apprenticeStep: number;
}

export interface NetworkDepth {
  generations: number;
  people: number;
}
