// The four RPMS gauges from Dave Ferguson's Multiplier, in the fixed order
// the weekly check-in uses. Each has its own colour (round 2 spec 3.1): a
// deliberate exception to "blue and lamp only", used only inside Growth.
// The colours are CSS variables defined once in globals.css (Task 5).

export type GaugeKey = "relational" | "physical" | "mental" | "spiritual";

export interface GaugeScores {
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
}

export interface Gauge {
  key: GaugeKey;
  label: string;
  letter: string;
  colour: string;
  meaning: string;
}

export const GAUGES: readonly Gauge[] = [
  {
    key: "relational",
    label: "Relational",
    letter: "R",
    colour: "var(--g-relational)",
    // Henry to check wording
    meaning: "Your closest relationships: family, friends, team",
  },
  {
    key: "physical",
    label: "Physical",
    letter: "P",
    colour: "var(--g-physical)",
    // Henry to check wording
    meaning: "Sleep, food, movement, rest",
  },
  {
    key: "mental",
    label: "Mental",
    letter: "M",
    colour: "var(--g-mental)",
    // Henry to check wording
    meaning: "Focus, stress, emotional load",
  },
  {
    key: "spiritual",
    label: "Spiritual",
    letter: "S",
    colour: "var(--g-spiritual)",
    // Henry to check wording
    meaning: "Time with God, prayer, the Word",
  },
];
