// Three-state step dots (round 3 spec 4). Pure. Off: not started. In
// progress: at least one answer saved but not complete. Done: the existing
// completion rule from journey.ts, which this file never changes.
import {
  callingSectionComplete,
  launchStepComplete,
  LAUNCH_STEP_IDS,
  type CallingData,
  type CallingSectionId,
  type LaunchData,
  type LaunchStepId,
} from "@/lib/journey";

export type DotStatus = "off" | "progress" | "done";

export const DOT_SR_TEXT: Record<DotStatus, string> = {
  off: ", not started",
  progress: ", in progress",
  done: ", done",
};

// A saved value holds an answer when it is, or contains, a non-blank
// string, a finite number or true. false, null, "", [] and {} do not count:
// a retake saves { answers: [] } and "Play it again" saves
// { picks: [], done: false }, and neither is a started step.
export function hasAnswer(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(hasAnswer);
  if (value !== null && typeof value === "object") return Object.values(value).some(hasAnswer);
  return false;
}

function statusOf(done: boolean, started: boolean): DotStatus {
  if (done) return "done";
  return started ? "progress" : "off";
}

export function callingSectionStatus(id: CallingSectionId, data: CallingData): DotStatus {
  return statusOf(callingSectionComplete(id, data), hasAnswer(data[id]));
}

export function launchStepStatus(id: LaunchStepId, data: LaunchData): DotStatus {
  return statusOf(launchStepComplete(id, data), hasAnswer(data[id]));
}

function isLaunchStepId(id: string): id is LaunchStepId {
  return (LAUNCH_STEP_IDS as readonly string[]).includes(id);
}

// The Launch wizard's nine lamps: the seven planning steps, the Arena and
// the plan. The Arena counts as done while it is switched off, exactly as
// the wizard's completion does today. The plan lamp is never lit.
export function launchWizardStepStatus(id: string, data: LaunchData, arenaEnabled: boolean): DotStatus {
  if (isLaunchStepId(id)) return launchStepStatus(id, data);
  if (id === "arena") return statusOf(!arenaEnabled || data.arena?.done === true, hasAnswer(data.arena?.picks));
  if (id === "plan") return "off";
  throw new Error(`Unknown Launch step: ${id}`);
}

// A Foundations module: done once ticked, in progress once any episode is
// watched. The tick itself stays the leader's choice.
export function moduleStatus(module: { completed: boolean; episodes?: { watched: boolean }[] }): DotStatus {
  return statusOf(module.completed, (module.episodes ?? []).some((e) => e.watched));
}

// An Arena month: played months are done. The month in play is in progress
// only mid-run (at least one month played, not finished).
export function arenaMonthStatus(i: number, state: { month: number; finished: boolean }): DotStatus {
  if (i < state.month) return "done";
  if (i === state.month && state.month > 0 && !state.finished) return "progress";
  return "off";
}
