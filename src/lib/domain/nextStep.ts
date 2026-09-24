// The dashboard's "Your next step": the first unfinished thing among
// Foundations, Calling, Launch and this week's check-in. Pure.
import { CALLING_TOTAL, LAUNCH_TOTAL } from "@/lib/domain/journey";

export type NextStepId = "foundations" | "calling" | "launch" | "checkin" | "done";

export interface NextStep {
  id: NextStepId;
  title: string;
  body: string;
  button: string;
  href: string;
}

export interface NextStepInput {
  foundationsDone: number;
  foundationsTotal: number;
  callingDone: number;
  launchDone: number;
  checkedInThisWeek: boolean;
}

export function nextStep(i: NextStepInput): NextStep {
  if (i.foundationsDone < i.foundationsTotal) {
    return {
      id: "foundations",
      title: "Finish Foundations",
      body: `${i.foundationsDone} of ${i.foundationsTotal} modules done.`,
      button: i.foundationsDone === 0 ? "Start Foundations" : "Continue Foundations",
      href: "/leaders/training?phase=phase1",
    };
  }
  if (i.callingDone < CALLING_TOTAL) {
    return {
      id: "calling",
      title: "Discover your Calling",
      body: `${i.callingDone} of ${CALLING_TOTAL} sections done.`,
      button: i.callingDone === 0 ? "Start Calling" : "Continue Calling",
      href: "/leaders/training/calling",
    };
  }
  if (i.launchDone < LAUNCH_TOTAL) {
    return {
      id: "launch",
      title: "Plan your launch",
      body: `${i.launchDone} of ${LAUNCH_TOTAL} steps done.`,
      button: i.launchDone === 0 ? "Start Launch" : "Continue Launch",
      href: "/leaders/training/launch",
    };
  }
  if (!i.checkedInThisWeek) {
    return {
      id: "checkin",
      title: "This week's check-in",
      body: "Four gauges and one sentence.",
      button: "Check in now",
      href: "/leaders/training?phase=phase4",
    };
  }
  return {
    id: "done",
    title: "You're up to date",
    body: "Growth and Multiply are rhythms, not checklists. Keep going with your coach.",
    button: "Open your journey",
    href: "/leaders/training",
  };
}
