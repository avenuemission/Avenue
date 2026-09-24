# Avenue at Night, Round 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Act on Henry's third review: YouTube-quality Foundations thumbnails, "Reset Calling" and "Reset Launch" behind a confirm dialog, Growth and Multiply lamps that read "Ongoing" and breathe once started, three-state step dots (off, in progress, done) on Calling, Launch, Arena months and Foundations modules, and a PersonPicker that saves a typed name on Enter and says when a name is not saved.

**Architecture:** Every rule that decides anything (dot state per step, module and Arena month, the avenue's `ongoing` stop, the thumbnail fallback chain, the reset dialog's wording, the wait for in-flight saves, the picker's Enter choice and unsaved hint) is a pure module under `src/lib/` with Vitest tests. One new server route handler (`DELETE /api/worksheets`) is tested in Vitest with `requireLeader` and `getSupabaseAdmin` mocked, and end to end by `scripts/check-auth.mjs`. `useWorksheet` gains one additive `reset()`; nothing else in it changes. Screens swap markup and CSS only.

**Tech Stack:** Next.js 16 (App Router, React Compiler on), React 19, TypeScript, Tailwind 4, Vitest 4 (node environment, `src/**/*.test.ts` only, so components are checked by tsc, lint, build and the controller's browser pass), Supabase (service role on the server), lucide-react.

**Spec (binding):** `docs/superpowers/specs/2026-09-24-avenue-night-3-design.md` (including the section 5 "Verified" and "Found" bullets added on 24 Sep). Round 1 and round 2 specs still apply unless round 3 says otherwise. House style follows `docs/superpowers/plans/2026-09-24-avenue-night-2.md`. Read the round 3 spec before starting any task.

## Global Constraints

- **Branch `feat/avenue-night-3`.** It exists and holds the round 3 spec commit.
- **Never `git push`.** Commit locally only. Henry says "push" when he wants a deploy.
- **Never `git add`** `HANDOVER.md`, `HANDOVER-v2.md`, `HANDOVER_PROMPT*.md` (any `HANDOVER*.md`), `.mcp.json`, `scripts/demo-network.mjs`. Always `git add` exact paths, never `git add -A` or `git add .`.
- **Presentation only, with exactly these exceptions.** (1) The new `DELETE /api/worksheets?kind=` handler in `src/app/api/worksheets/route.ts` (Task 5). (2) The additive `reset()` in `src/lib/useWorksheet.ts` that cancels queued saves, waits for in-flight ones and calls that endpoint, with the page-wide in-flight count and reset epoch that `send` records and checks for it (Task 6). (3) Spec 5's PersonPicker fix: Enter triggers the same `POST` / `PATCH` to `/api/people` that the existing buttons send (Task 7). Nothing else changes saving, auth, API calls, data shape or completion rules. Do not edit `src/lib/journey.ts`, `useTrainingProgress.ts`, `progressMerge.ts`, `useCheckins.ts`, `useNetworkView.ts`, `useMyPeople.ts`, `src/lib/auth.ts`, `src/lib/requireLeader.ts`, `src/lib/worksheets.ts`, or any other `src/app/api/**` file. The existing `GET` and `PATCH` handlers in `route.ts` stay byte for byte. Reading their values is fine.
- **Reset safety.** The route runs `requireLeader(request)` before any query, takes the email only from `auth.leader.email` (never the body or query), validates `kind` with the existing `parseKind`, deletes only `leader_worksheets` where `email` = session email and `kind` = that kind, and returns a 500 with the database message on any error. It touches no other table. Reset gets its own security-focused review.
- **Print output of the Calling Profile and Launch Plan stays black on white**, with the same boxes and content as today. Reset buttons and the reset dialog carry `no-print`.
- **Never use an em dash (U+2014)** anywhere: code, comments, UI copy, commit messages, this plan. Use a colon, a comma, or a new sentence. En dashes (U+2013) only in number ranges. In tests build an em dash with `String.fromCharCode(0x2014)`; never type one (the Write tool turns a backslash-u 2014 escape into the real character).
- **New copy is exactly the spec's wording** where the spec gives it ("Ongoing", "Reset Calling?", "This can't be undone.", "Yes, reset Calling", "Cancel", "Not saved yet. Press Enter or tap Add."). Copy the plan adds where the spec gives only the meaning (the reset dialog's lists, the button labels) carries `// Henry to check wording` on the line above it.
- **Motion.** Two new loops only: the ongoing lamp's slow breath (about 4 s, opacity and halo scale) and the in-progress dot's pulse (about 2.4 s, opacity and glow). Both stop under `prefers-reduced-motion: reduce`: the ongoing lamp becomes a steady, slightly softer glow, the in-progress dot a steady half-strength warm dot. The round 1 completion glow (`Glow`) still plays when a dot turns done.
- **Colour meaning:** blue `#4f7cff` (`--accent`) = primary buttons, "you are here" on the avenue map and street. Step dots no longer use blue: the current step is shown by its label only (`--ink`, underlined). Warm lamp `#ffc56b` (`--lamp`) = walked, ongoing, done, in progress. Glow only on light. No gradients. The reset confirm button is not red: an outlined neutral button.
- **Type:** Newsreader (`font-serif`) for titles and headings; Geist for everything else; uppercase mono only for `.night-label`.
- **Mobile first at 375 px:** single column, 16 px side gutter, no horizontal page scroll, every tap target at least 44 px, keyboard focus ring in lamp colour (from `.avenue-night :focus-visible`, `.av-sheet :focus-visible`, and the new `.av-dialog :focus-visible`).
- **`.panel` gotcha:** `.panel` and `.avenue-night .panel` set unlayered border colours, so a Tailwind border colour utility on a `.panel` needs the Tailwind 4 `!` suffix.
- **No staging DB.** Every fixture email ends in `@example.invalid`, is deleted by exact email, and `npm run guard` prints `clean` before and after any run that writes.
- **Gates at the end of every task** (the implementer runs 1 to 4; stop the dev server before 4 because it shares `.next`):
  1. `npx tsc --noEmit` prints nothing.
  2. `npm test`: 268 passing at the start of the branch; the count only goes up (each task states its expected count).
  3. `npm run lint`: 54 problems at the start. Never above 54. If the count drops, record the new number in the report; do not chase lint elsewhere.
  4. `npm run build` passes.
- **Commits** end with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Browser checks are the controller's job.** Implementers have no browser. Each UI task ends with a "Controller browser check" step listing exactly what to look at, at 375 px and desktop, with keyboard checks where the task adds controls.
- Use the Write tool for any file over a few lines; heredocs through Bash mangle backslashes. Keep scratch `.mjs` / `.txt` files out of `src/` and out of lint.

## Decisions made while planning (spec gaps)

| Where | Decision | Why |
|---|---|---|
| Spec 4, "started" | A section is started when its saved value holds at least one answer: a non-blank string, a finite number, `true`, or an array or object holding one of those. `false`, `null`, `""`, `[]` and `{}` are not answers | ApestStep saves `{ answers: [] }` on a retake and ArenaStep saves `{ picks: [], done: false }` on "Play it again"; neither is a started step. An unticked checkbox (`booked: false`) is not an answer |
| Spec 4, Launch wizard | `launchStepStatus` also takes `"arena"` and `"plan"`. Arena: done when `done === true` (or the Arena is switched off, as today), in progress when a pick is saved. Plan: always off, as its lamp is never lit today | The wizard has nine lamps; the hub card shows only the seven planning steps |
| Spec 4, `moduleStatus` | Takes the module itself (`completed` plus `episodes[].watched`) rather than a separate watched list | `phases.ts` already carries `watched` on each episode, merged by `useTrainingProgress` |
| Spec 4, Arena "mid-run" | The month in play is in progress only once at least one month has been played and the run is not finished. Before the first pick every month is off | "The month in play mid-run": before any pick there is no run yet |
| Spec 4, current step | The dot keeps its state; only the label shows "current" (`--ink`, underlined, `aria-current="step"` as today). Labels of other steps: done and in progress `--ink-2`, off `--muted` | Spec: "Label only: bright and underlined. No blue ring" |
| Spec 4, Foundations | `PhaseModules` swaps its hand-drawn dot for the shared `StepDot`; the 44 px tick button, its label and `aria-pressed` are unchanged | Spec: "the tick button behaviour is unchanged" |
| Spec 3 | `stopWalked` is unchanged (moments still use it). `avenueStops` maps a walked Growth or Multiply stop to `ongoing`. The map's `STATUS_FILL.ongoing` is `--lamp` | "Here" and the status line must count ongoing exactly like walked |
| Spec 1 | The fallback chain lives in `src/lib/youtubeThumb.ts`. When `hqdefault` also fails the image stays on `hqdefault` and `console.error` names the video id | Fail loud; `hqdefault` exists for every public video |
| Spec 2, route order | `adminConfigError()` stays first, as in `GET` and `PATCH`; it reads env vars only. `requireLeader(request)` is the first thing that touches data | Keeps the three handlers identical in shape |
| Spec 2, response for no row | Deleting when no row exists is still `{ ok: true }` (200) | Reset is idempotent; a second tap must not error |
| Spec 2, pending saves | `reset()` cancels every queued save (the typed values stay queued, unsent), moves the page-wide reset epoch for that kind, then waits up to 15 s for every in-flight `PATCH` of that kind from any copy of the hook on the page (a wizard that just unmounted is still sending) before sending `DELETE`. Unsent values are dropped only once the delete succeeds; if the wait times out ("A save is still running, so nothing was reset. Try again.") or the delete fails, they go back in the save queue. While resetting, `send` does nothing; a copy of the hook that loaded before the latest reset drops its later saves with a `console.warn` | An in-flight `PATCH` that landed after the delete, or a late save from an unmounted wizard (the APEST reflection resolves seconds later), would bring the row back |
| Spec 2, after reset | `reset()` clears local data to `{}` and re-runs the existing `GET` read (a `reloadKey` in the load effect's dependencies) | Spec: "reloads that worksheet (the existing useWorksheet read path)" |
| Spec 2, dialog lists | Calling: "Your answers in all six Calling sections", "Your APEST results and the AI reflection", "Your Calling Profile, which is made from those answers". Launch: "Your answers in all seven Launch steps", "Your Arena run", "Your Launch Plan, including the actions you ticked". Both add "People on My People are kept." | The spec lists what is wiped but not the words; people live in `leader_people`, which reset never touches |
| Spec 2, button labels | Page button "Reset Calling" / "Reset Launch" (outlined, 44 px). Hub text button "Reset Calling" / "Reset Launch" (muted, underlined, 44 px tall). Dialog busy label "Resetting..." | Spec names the actions; quiet on the hub |
| Spec 5 | Enter with an exact full-name match (case and extra spaces ignored) that is not on this list tags that person (the existing pick path). An exact match already on this list (or excluded) clears the field and shows nothing new. Otherwise Enter adds the typed name (the existing Add path). The hint shows only while the field is not focused and holds text | Spec 5 "Found" bullet |
| Spec 5 | The picker's suggestion and Add buttons become `min-h-[44px]` | They were about 36 px; the task edits that markup anyway |

## Pre-flight rulings (round 3, 24 Sep)

Full notes: `.superpowers/sdd/avenue-night-3/preflight.md`. Each ruling is already folded into the task text below.

- F1 (Task 6): `reset()` waits for every in-flight save of that kind from any `useWorksheet` copy on the page, and a copy loaded before a reset drops its later saves (page-wide count and epoch in `worksheetReset.ts`, 2 new tests), so an unmounted wizard's last save or a late APEST reflection cannot bring a reset row back.
- F2 (Task 6): unsent typing is dropped only once the delete succeeds; on a timeout or a failed delete it goes back in the save queue, so "nothing was reset" is true.
- F3 (Task 7): a second Enter or a held Enter while the first request runs does nothing (`enterBusyRef`), so one name cannot be added twice.
- F4 (Task 7): focus returns to the field from an effect once `busy` clears, because the input is still disabled when the request's promise settles.
- F5 (Task 6): a failed reset reopens the dialog to show its error, since a second Escape can close a modal dialog while busy.
- F6 (Task 5): `check-auth.mjs` also proves the reset leaves another table (A's profile) alone; the reset block has ten checks, not eight.
- F7 (Task 3): a module's tick button names its in-progress state (`DOT_SR_TEXT`), because the dot is `aria-hidden` and the `aria-label` hides everything else.

## File map

| File | Status | Task | Responsibility |
|---|---|---|---|
| `src/lib/stepStatus.ts` | Create | 1 | `DotStatus`, `hasAnswer`, `callingSectionStatus`, `launchStepStatus`, `moduleStatus`, `arenaMonthStatus`, `DOT_SR_TEXT` |
| `src/lib/stepStatus.test.ts` | Create | 1 | Tests |
| `src/lib/avenue.ts` | Modify | 2 | `ongoing` status, label, status line |
| `src/lib/avenue.test.ts` | Modify | 2 | Updated and new tests |
| `src/components/avenue/AvenueMap.tsx` | Modify | 2 | Ongoing lamp (lit, breathing) |
| `src/components/avenue/AvenueStreet.tsx` | Modify | 2 | Ongoing dot and line |
| `src/app/globals.css` | Modify | 2, 3, 6 | Breath (2); `.av-dot` and lamp labels (3); `.av-dialog` (6) |
| `src/components/avenue/StepDot.tsx` | Create | 3 | One three-state dot |
| `src/components/avenue/LampSteps.tsx` | Modify | 3 | `status` per step, no stem, label marks current |
| `src/components/journey/WizardShell.tsx` | Modify | 3 | `stepStatus` prop |
| `src/app/leaders/training/calling/page.tsx` | Modify | 3 | Pass `stepStatus` |
| `src/app/leaders/training/launch/page.tsx` | Modify | 3 | Pass `stepStatus` |
| `src/app/leaders/training/CallingCard.tsx` | Modify | 3, 6 | Dots (3); quiet reset button (6) |
| `src/app/leaders/training/LaunchCard.tsx` | Modify | 3, 6 | Dots (3); quiet reset button (6) |
| `src/app/leaders/training/launch/ArenaStep.tsx` | Modify | 3 | Month dots |
| `src/app/leaders/training/PhaseModules.tsx` | Modify | 3 | Module dots |
| `src/lib/youtubeThumb.ts` | Create | 4 | Thumbnail URL, fallback order, placeholder test |
| `src/lib/youtubeThumb.test.ts` | Create | 4 | Tests |
| `src/components/ui/EpisodeCarousel.tsx` | Modify | 4 | `EpisodeThumb` with fallback |
| `src/app/api/worksheets/route.ts` | Modify | 5 | `DELETE` handler (appended) |
| `src/app/api/worksheets/route.test.ts` | Create | 5 | Route tests with mocks |
| `scripts/check-auth.mjs` | Modify | 5 | 401/403 for DELETE; reset end to end |
| `src/lib/worksheetReset.ts` | Create | 6 | `RESET_COPY`, `waitForIdle`, page-wide in-flight count and reset epoch per kind |
| `src/lib/worksheetReset.test.ts` | Create | 6 | Tests |
| `src/lib/useWorksheet.ts` | Modify | 6 | Additive `reset()` |
| `src/components/journey/ResetWorksheet.tsx` | Create | 6 | Reset button plus native `<dialog>` confirm |
| `src/app/leaders/training/calling/profile/page.tsx` | Modify | 6 | Reset Calling at the bottom |
| `src/app/leaders/training/launch/plan/page.tsx` | Modify | 6 | Reset Launch at the bottom |
| `src/app/leaders/training/page.tsx` | Modify | 6 | Pass `onReset` to the two cards |
| `src/lib/personPicker.ts` | Create | 7 | `splitName`, `enterChoice`, `unsavedHint` |
| `src/lib/personPicker.test.ts` | Create | 7 | Tests |
| `src/components/people/PersonPicker.tsx` | Modify | 7 | Enter adds or tags; unsaved hint |

Expected test count: 268 at the start, 287 after Task 1, 290 after Task 2, 293 after Task 4, 299 after Task 5, 307 after Task 6, 313 after Task 7 (final).

Planner dry run (24 Sep, on `96b7eb2`): every code block in Tasks 1 to 7 was applied to a scratch working tree and then reverted. Result: 311 tests passing, `tsc` clean, lint 54, `npm run build` passes, and the Task 3 Step 9 grep and Task 6 Step 5 diff check give the expected output. The pre-flight rulings below changed Tasks 3, 5, 6 and 7 afterwards (two more tests, so 313); their changed code was dry-run again for `tsc`, lint and the unit tests (see the rulings).

---

### Task 1: Step status rules (pure, TDD)

**Files:**
- Create: `src/lib/stepStatus.ts`
- Test: `src/lib/stepStatus.test.ts`

**Interfaces:**
- Consumes: `callingSectionComplete(id, data)`, `launchStepComplete(id, data)`, `LAUNCH_STEP_IDS`, `type CallingData`, `type CallingSectionId`, `type LaunchData`, `type LaunchStepId` from `src/lib/journey.ts` (read only; completion rules unchanged).
- Produces (all from `src/lib/stepStatus.ts`):
  - `type DotStatus = "off" | "progress" | "done"`
  - `DOT_SR_TEXT: Record<DotStatus, string>` (`", not started"`, `", in progress"`, `", done"`)
  - `hasAnswer(value: unknown): boolean`
  - `callingSectionStatus(id: CallingSectionId, data: CallingData): DotStatus`
  - `launchStepStatus(id: LaunchStepId, data: LaunchData): DotStatus`
  - `launchWizardStepStatus(id: string, data: LaunchData, arenaEnabled: boolean): DotStatus` (the seven steps plus `"arena"` and `"plan"`; throws on any other id)
  - `moduleStatus(module: { completed: boolean; episodes?: { watched: boolean }[] }): DotStatus`
  - `arenaMonthStatus(i: number, state: { month: number; finished: boolean }): DotStatus`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/stepStatus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  arenaMonthStatus,
  callingSectionStatus,
  DOT_SR_TEXT,
  hasAnswer,
  launchStepStatus,
  launchWizardStepStatus,
  moduleStatus,
} from "./stepStatus";

describe("hasAnswer", () => {
  it("finds no answer in empty values", () => {
    for (const v of [undefined, null, false, "", "   ", [], {}, { a: "" }, { picks: [], done: false }, Number.NaN]) {
      expect(hasAnswer(v)).toBe(false);
    }
  });
  it("finds an answer in a non-blank string, a number or true", () => {
    for (const v of ["x", 0, 3, true]) expect(hasAnswer(v)).toBe(true);
  });
  it("looks inside arrays and objects", () => {
    expect(hasAnswer({ placements: { s1: "shared" } })).toBe(true);
    expect(hasAnswer({ answers: [4] })).toBe(true);
    expect(hasAnswer({ booked: false, date: "" })).toBe(false);
  });
});

describe("callingSectionStatus", () => {
  it("is off when nothing is saved for the section", () => {
    expect(callingSectionStatus("layers", {})).toBe("off");
    expect(callingSectionStatus("apest", { apest: { answers: [] } })).toBe("off");
  });
  it("is in progress when started but not complete", () => {
    expect(callingSectionStatus("layers", { layers: { placements: { s1: "shared" } } })).toBe("progress");
    expect(callingSectionStatus("apest", { apest: { answers: [3, 4] } })).toBe("progress");
    expect(callingSectionStatus("callable", { callable: { crowding: "Work" } })).toBe("progress");
  });
  it("is done by the existing completion rule", () => {
    expect(callingSectionStatus("callable", { callable: { willing: "yes" } })).toBe("done");
    expect(
      callingSectionStatus("apest", {
        apest: { results: { apostle: 1, prophet: 2, evangelist: 3, shepherd: 4, teacher: 5 } },
      })
    ).toBe("done");
  });
});

describe("launchStepStatus", () => {
  it("is off, in progress, then done for a planning step", () => {
    expect(launchStepStatus("prayer", {})).toBe("off");
    expect(launchStepStatus("prayer", { prayer: { who: "Sam" } })).toBe("progress");
    expect(launchStepStatus("prayer", { prayer: { when: "Mornings" } })).toBe("done");
  });
  it("counts one team member as started and two as done", () => {
    expect(launchStepStatus("team", { team: { personIds: ["a"] } })).toBe("progress");
    expect(launchStepStatus("team", { team: { personIds: ["a", "b"] } })).toBe("done");
  });
});

describe("launchWizardStepStatus", () => {
  it("treats the Arena as started once a month is picked and done when finished", () => {
    expect(launchWizardStepStatus("arena", { arena: { picks: [], done: false } }, true)).toBe("off");
    expect(
      launchWizardStepStatus("arena", { arena: { picks: [{ curveball: 1, choice: 0 }], done: false } }, true)
    ).toBe("progress");
    expect(launchWizardStepStatus("arena", { arena: { picks: [], done: true } }, true)).toBe("done");
  });
  it("counts the Arena as done while it is switched off, as the wizard does today", () => {
    expect(launchWizardStepStatus("arena", {}, false)).toBe("done");
  });
  it("never lights the plan step and hands the seven steps to launchStepStatus", () => {
    expect(launchWizardStepStatus("plan", { prayer: { when: "Mornings" } }, true)).toBe("off");
    expect(launchWizardStepStatus("prayer", { prayer: { when: "Mornings" } }, true)).toBe("done");
  });
  it("throws on an unknown step id", () => {
    expect(() => launchWizardStepStatus("nope", {}, true)).toThrow("Unknown Launch step: nope");
  });
});

describe("moduleStatus", () => {
  const eps = (...w: boolean[]) => w.map((watched) => ({ watched }));
  it("is off with nothing watched and not ticked", () => {
    expect(moduleStatus({ completed: false, episodes: eps(false, false) })).toBe("off");
    expect(moduleStatus({ completed: false })).toBe("off");
  });
  it("is in progress with one episode watched and not ticked", () => {
    expect(moduleStatus({ completed: false, episodes: eps(false, true) })).toBe("progress");
  });
  it("is done once ticked, whatever was watched", () => {
    expect(moduleStatus({ completed: true, episodes: eps(false) })).toBe("done");
    expect(moduleStatus({ completed: true })).toBe("done");
  });
});

describe("arenaMonthStatus", () => {
  const months = (state: { month: number; finished: boolean }) =>
    [0, 1, 2, 3, 4, 5].map((i) => arenaMonthStatus(i, state));
  it("shows every month off before the first pick", () => {
    expect(months({ month: 0, finished: false })).toEqual(["off", "off", "off", "off", "off", "off"]);
  });
  it("shows played months done and the month in play in progress mid-run", () => {
    expect(months({ month: 2, finished: false })).toEqual(["done", "done", "progress", "off", "off", "off"]);
  });
  it("shows every month done when the run is finished", () => {
    expect(months({ month: 6, finished: true })).toEqual(["done", "done", "done", "done", "done", "done"]);
  });
});

describe("DOT_SR_TEXT", () => {
  it("names each state for screen readers with no em dash", () => {
    expect(DOT_SR_TEXT).toEqual({ off: ", not started", progress: ", in progress", done: ", done" });
    expect(Object.values(DOT_SR_TEXT).join("")).not.toContain(String.fromCharCode(0x2014));
  });
});
```

That is 19 tests: `hasAnswer` 3, `callingSectionStatus` 3, `launchStepStatus` 2, `launchWizardStepStatus` 4, `moduleStatus` 3, `arenaMonthStatus` 3, `DOT_SR_TEXT` 1.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/stepStatus.test.ts`
Expected: FAIL: "Failed to resolve import ./stepStatus".

- [ ] **Step 3: Write the rules**

Create `src/lib/stepStatus.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/stepStatus.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Run the gates**

`npx tsc --noEmit` clean, `npm test` 287 passing (268 + 19), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stepStatus.ts src/lib/stepStatus.test.ts
git commit -m "Avenue at night 3: step status rules for three-state dots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Living lamps for Growth and Multiply

**Files:**
- Modify: `src/lib/avenue.ts` (`StopStatus` line 8, `STATUS_LABEL` lines 18-22, `avenueStops` lines 57-69, `streetStatusLine` lines 73-81)
- Modify: `src/lib/avenue.test.ts` (import block, two `avenueStops` tests at lines 37-54, new tests)
- Modify: `src/components/avenue/AvenueMap.tsx` (`STATUS_FILL` line 31, the walked branch lines 71-80, the comment above the component)
- Modify: `src/components/avenue/AvenueStreet.tsx` (lines 23-24 and the dot at lines 186-195)
- Modify: `src/app/globals.css` (new block before `/* RPMS slider (round 2 spec 3.1)`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `StopStatus = "walked" | "ongoing" | "here" | "ahead"`; `STATUS_LABEL.ongoing === "Ongoing"`. `stopWalked` is unchanged. CSS classes `.av-breathe-halo` (opacity and scale) and `.av-breathe-light` (opacity only), 4 s loop, off under reduced motion. The dashboard (`NextStepCard`) needs no edit: it renders `AvenueMap`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/avenue.test.ts`, replace the import block:

```ts
import {
  apprenticesOnRung,
  avenueStops,
  greetingFor,
  hereActionFor,
  melbourneHour,
  partOfDay,
  STOP_IDS,
  streetStatusLine,
  type AvenueProgress,
} from "./avenue";
```

with:

```ts
import {
  apprenticesOnRung,
  avenueStops,
  greetingFor,
  hereActionFor,
  melbourneHour,
  partOfDay,
  STATUS_LABEL,
  STOP_IDS,
  streetStatusLine,
  type AvenueProgress,
} from "./avenue";
```

Replace these two tests:

```ts
  it("keeps a later stop walked when an earlier one is not", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 2, checkinCount: 3 })).toEqual([
      "walked",
      "walked",
      "here",
      "walked",
      "ahead",
    ]);
  });
  it("walks Growth on the first check-in and Multiply on the first apprentice on rung 1", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 1, apprenticesOnRung: 1 })).toEqual([
      "walked",
      "walked",
      "walked",
      "walked",
      "walked",
    ]);
  });
```

with:

```ts
  it("keeps a later stop lit when an earlier one is not", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 2, checkinCount: 3 })).toEqual([
      "walked",
      "walked",
      "here",
      "ongoing",
      "ahead",
    ]);
  });
  it("makes Growth ongoing on the first check-in and Multiply ongoing on the first apprentice on rung 1", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 1, apprenticesOnRung: 1 })).toEqual([
      "walked",
      "walked",
      "walked",
      "ongoing",
      "ongoing",
    ]);
  });
  it("puts here on the first stop that is neither walked nor ongoing", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 1 })).toEqual([
      "walked",
      "walked",
      "walked",
      "ongoing",
      "here",
    ]);
  });
  it("labels the four states", () => {
    expect(STATUS_LABEL).toEqual({ walked: "Walked", ongoing: "Ongoing", here: "You are here", ahead: "Ahead" });
  });
```

In `describe("streetStatusLine", ...)`, after the "matches the mockup line" test, add:

```ts
  it("counts ongoing stops as lit", () => {
    expect(streetStatusLine(avenueStops({ ...fresh, foundationsDone: 4, callingDone: 6, checkinCount: 1 }))).toBe(
      "Three streetlights on. Launch is next."
    );
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/avenue.test.ts`
Expected: FAIL: the two changed tests get `"walked"` where `"ongoing"` is expected, the label test finds no `ongoing` key, and the status line reads "One streetlight on." (Growth is not counted until Step 3).

- [ ] **Step 3: Add the ongoing status**

In `src/lib/avenue.ts`, replace:

```ts
export type StopStatus = "walked" | "here" | "ahead";
```

with:

```ts
export type StopStatus = "walked" | "ongoing" | "here" | "ahead";
```

Replace:

```ts
export const STATUS_LABEL: Record<StopStatus, string> = {
  walked: "Walked",
  here: "You are here",
  ahead: "Ahead",
};
```

with:

```ts
export const STATUS_LABEL: Record<StopStatus, string> = {
  walked: "Walked",
  ongoing: "Ongoing",
  here: "You are here",
  ahead: "Ahead",
};

// Growth and Multiply are rhythms: once started they are never finished,
// so they read "Ongoing" rather than "Walked" (round 3 spec 3).
const RHYTHM_STOPS: ReadonlySet<StopId> = new Set<StopId>(["phase4", "phase5"]);
```

Replace:

```ts
// The first stop not walked is "here"; every other stop not walked is
// "ahead". Nothing is locked: this only decides how each lamp is drawn.
export function avenueStops(p: AvenueProgress): AvenueStop[] {
  let hereTaken = false;
  return STOP_IDS.map((id, i) => {
    let status: StopStatus = "walked";
```

with:

```ts
// A walked Growth or Multiply stop is "ongoing"; other walked stops are
// "walked". The first stop that is neither is "here"; every other one is
// "ahead". Nothing is locked: this only decides how each lamp is drawn.
export function avenueStops(p: AvenueProgress): AvenueStop[] {
  let hereTaken = false;
  return STOP_IDS.map((id, i) => {
    let status: StopStatus = RHYTHM_STOPS.has(id) ? "ongoing" : "walked";
```

In `streetStatusLine`, replace:

```ts
  const lit = stops.filter((s) => s.status === "walked").length;
```

with:

```ts
  const lit = stops.filter((s) => s.status === "walked" || s.status === "ongoing").length;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/avenue.test.ts`
Expected: PASS (every earlier avenue test still passes, plus 3 new ones).

- [ ] **Step 5: The breathing light in CSS**

In `src/app/globals.css`, directly before the line `/* RPMS slider (round 2 spec 3.1): a native range input, 44 px tall to`, add:

```css
/* Living lamps (round 3 spec 3): an ongoing lamp (Growth or Multiply once
   started) is lit like a walked one and its light breathes slowly, about
   4 s a cycle. Opacity and halo scale only. Under reduced motion it is a
   steady, slightly softer glow. */
.av-breathe-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: av-breathe-halo 4s ease-in-out infinite;
}
.av-breathe-light {
  animation: av-breathe-light 4s ease-in-out infinite;
}
@keyframes av-breathe-halo {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}
@keyframes av-breathe-light {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) {
  .av-breathe-halo,
  .av-breathe-light {
    animation: none;
    opacity: 0.85;
    transform: none;
  }
}

```

- [ ] **Step 6: Draw the ongoing lamp on the map**

In `src/components/avenue/AvenueMap.tsx`, replace:

```tsx
const STATUS_FILL = { walked: "var(--lamp)", here: "var(--accent)", ahead: "var(--dim)" } as const;

// Map A (spec 2): the avenue seen from the side, five lamp posts in a row.
// Walked stops are lit (warm head, halo, cone of light), the current stop
```

with:

```tsx
const STATUS_FILL = { walked: "var(--lamp)", ongoing: "var(--lamp)", here: "var(--accent)", ahead: "var(--dim)" } as const;

// Map A (spec 2): the avenue seen from the side, five lamp posts in a row.
// Walked stops are lit (warm head, halo, cone of light); ongoing stops
// (Growth, Multiply once started) are lit the same and their cone and halo
// breathe slowly (round 3 spec 3). The current stop
```

Replace:

```tsx
            if (stop.status === "walked") {
              return (
                <g key={stop.id}>
                  <polygon points={`${x},120 ${x - 60},300 ${x + 60},300`} fill={`url(#${glowId})`} />
                  <circle cx={x} cy={112} r={34} fill={`url(#${haloId})`} />
```

with:

```tsx
            if (stop.status === "walked" || stop.status === "ongoing") {
              const ongoing = stop.status === "ongoing";
              return (
                <g key={stop.id}>
                  <polygon
                    points={`${x},120 ${x - 60},300 ${x + 60},300`}
                    fill={`url(#${glowId})`}
                    className={ongoing ? "av-breathe-light" : undefined}
                  />
                  <circle
                    cx={x}
                    cy={112}
                    r={34}
                    fill={`url(#${haloId})`}
                    className={ongoing ? "av-breathe-halo" : undefined}
                  />
```

(The two `rect`s and the closing `</g>` of that branch stay as they are.)

- [ ] **Step 7: Draw the ongoing stop on the phone street**

In `src/components/avenue/AvenueStreet.tsx`, replace:

```tsx
        const walked = stop.status === "walked";
        const here = stop.status === "here";
```

with:

```tsx
        const ongoing = stop.status === "ongoing";
        const walked = stop.status === "walked" || ongoing; // lit either way
        const here = stop.status === "here";
```

Replace:

```tsx
              className={`absolute left-[5px] top-[6px] h-[14px] w-[14px] rounded-full ${
                walked
                  ? "bg-[var(--lamp)] shadow-[0_0_16px_4px_rgba(255,197,107,0.5)]"
```

with:

```tsx
              className={`absolute left-[5px] top-[6px] h-[14px] w-[14px] rounded-full ${ongoing ? "av-breathe-light" : ""} ${
                walked
                  ? "bg-[var(--lamp)] shadow-[0_0_16px_4px_rgba(255,197,107,0.5)]"
```

- [ ] **Step 8: Run the gates**

`npx tsc --noEmit` clean, `npm test` 290 passing (287 + 3), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/avenue.ts src/lib/avenue.test.ts src/components/avenue/AvenueMap.tsx src/components/avenue/AvenueStreet.tsx src/app/globals.css
git commit -m "Avenue at night 3: Growth and Multiply lamps read Ongoing and breathe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Controller browser check**

With a fixture leader that has at least one weekly check-in and no apprentice on rung 1:
- Desktop `/leaders/training`: the Growth lamp is lit like Foundations would be, its cone and halo slowly brighten and dim (about 4 s), and its label reads "ONGOING" in lamp colour. Multiply is dim ("AHEAD" or "YOU ARE HERE" if every earlier stop is lit). The status line counts Growth as lit.
- Desktop `/leaders` (dashboard map): the same Growth lamp breathes.
- 375 px `/leaders/training`: the phone street shows Growth's dot lit and breathing, the line below it lit, the label "Ongoing".
- DevTools, Rendering, "prefers-reduced-motion: reduce": the lamp and dot are steady and slightly softer; nothing moves.
- A leader with no check-in: Growth is dim as before.

---

### Task 3: Three-state dots on Calling, Launch, Arena months and Foundations modules

**Files:**
- Create: `src/components/avenue/StepDot.tsx`
- Modify: `src/app/globals.css` (the lamp block from `.av-lamp-glass {` to the `.av-lamp.is-current .av-lamp-label` rule)
- Modify: `src/components/avenue/LampSteps.tsx` (whole file)
- Modify: `src/components/journey/WizardShell.tsx` (props, the comment above the default export, the `LampSteps` call)
- Modify: `src/app/leaders/training/calling/page.tsx` (import, `stepStatus`, the `WizardShell` call)
- Modify: `src/app/leaders/training/launch/page.tsx` (import, `stepStatus`, the `WizardShell` call)
- Modify: `src/app/leaders/training/CallingCard.tsx` (imports, `lamps`, `completed`, `firstOpen`)
- Modify: `src/app/leaders/training/LaunchCard.tsx` (imports, `lamps`, `completed`, `firstOpen`)
- Modify: `src/app/leaders/training/launch/ArenaStep.tsx` (`MonthStreet` at lines 40-51, arena import)
- Modify: `src/app/leaders/training/PhaseModules.tsx` (imports, the tick button's `aria-label`, the dot inside the tick button)

**Interfaces:**
- Consumes (Task 1): `type DotStatus`, `DOT_SR_TEXT`, `callingSectionStatus`, `launchStepStatus`, `launchWizardStepStatus`, `moduleStatus`, `arenaMonthStatus` from `@/lib/stepStatus`.
- Produces: `StepDot` default export, props `{ status: DotStatus }`. `LampStep` becomes `{ id: string; label: string; status: DotStatus }` (the boolean `done` is gone). `WizardShellProps` gains `stepStatus: Record<string, DotStatus>` (one entry per step id; a missing entry throws). CSS `.av-dot` with `.is-off`, `.is-progress`, `.is-done`; `.av-lamp.is-<status>` and `.av-lamp.is-current` label rules. The classes `.av-lamp-glass`, `.av-lamp-post`, `.is-lit` are removed.

- [ ] **Step 1: The dot in CSS**

In `src/app/globals.css`, replace this block:

```css
.av-lamp-glass {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--line-2);
  background: #131926;
}
.av-lamp.is-lit .av-lamp-glass {
  background: var(--lamp);
  border-color: var(--lamp);
  box-shadow: 0 0 18px 4px rgba(255, 197, 107, 0.45);
}
.av-lamp.is-current .av-lamp-glass {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.av-lamp.is-lit.is-current .av-lamp-glass {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft), 0 0 18px 4px rgba(255, 197, 107, 0.45);
}
.av-lamp-post {
  display: block;
  width: 2px;
  height: 26px;
  background: var(--line-2);
}
.av-lamp-label {
  font-size: 11.5px;
  line-height: 1.3;
  text-align: center;
  color: var(--muted);
}
.av-lamp.is-lit .av-lamp-label,
.av-lamp.is-current .av-lamp-label {
  color: var(--ink);
}
```

with:

```css
/* Step dots (round 3 spec 4): one dot per step, no stem. Done: a solid
   warm dot with its glow. In progress: the same warm dot pulsing, about
   2.4 s, opacity and glow only. Off: a dim hollow dot. Used by LampSteps
   and the Foundations module ticks. */
.av-dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--line-2);
  background: transparent;
}
.av-dot.is-done {
  background: var(--lamp);
  border-color: var(--lamp);
  box-shadow: 0 0 18px 4px rgba(255, 197, 107, 0.45);
}
.av-dot.is-progress {
  background: var(--lamp);
  border-color: var(--lamp);
  animation: av-dot-pulse 2.4s ease-in-out infinite;
}
@keyframes av-dot-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 14px 3px rgba(255, 197, 107, 0.4); }
  50% { opacity: 0.4; box-shadow: 0 0 4px 1px rgba(255, 197, 107, 0.15); }
}
@media (prefers-reduced-motion: reduce) {
  .av-dot.is-progress {
    animation: none;
    opacity: 0.5;
    box-shadow: 0 0 10px 2px rgba(255, 197, 107, 0.25);
  }
}
.av-lamp-label {
  font-size: 11.5px;
  line-height: 1.3;
  text-align: center;
  color: var(--muted);
}
.av-lamp.is-done .av-lamp-label,
.av-lamp.is-progress .av-lamp-label {
  color: var(--ink-2);
}
/* The step you are on: its label only, bright and underlined. No ring. */
.av-lamp.is-current .av-lamp-label {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}
```

(`.av-lamps`, `.av-lamp`, `button.av-lamp` and the `.av-lamps-dense` rules above and below stay as they are. `.av-lamp` keeps `min-height: 44px`.)

- [ ] **Step 2: StepDot**

Create `src/components/avenue/StepDot.tsx`:

```tsx
import type { DotStatus } from "@/lib/stepStatus";

// One step dot (round 3 spec 4): off, in progress (pulsing) or done (lit).
// Decoration only; the caller says the state in words.
export default function StepDot({ status }: { status: DotStatus }) {
  return <span aria-hidden="true" className={`av-dot is-${status}`} />;
}
```

- [ ] **Step 3: LampSteps takes a status per step**

Replace the whole of `src/components/avenue/LampSteps.tsx` with:

```tsx
"use client";

import Glow from "./Glow";
import StepDot from "./StepDot";
import { DOT_SR_TEXT, type DotStatus } from "@/lib/stepStatus";

export interface LampStep {
  id: string;
  label: string;
  status: DotStatus;
}

export interface LampStepsProps {
  steps: LampStep[];
  currentIndex: number | null;
  onSelect?: (index: number) => void; // omit for a display-only row
  label: string; // accessible name for the whole row
  dense?: boolean; // six narrow lamps for the Arena months
}

// A row of step dots (round 3 spec 4), one per step, wrapping on phones:
// off, in progress (pulsing) or done (lit). The step you are on is shown by
// its label only, bright and underlined. With onSelect each step is a
// button that jumps to it. A dot that turns done glows once.
export default function LampSteps({ steps, currentIndex, onSelect, label, dense = false }: LampStepsProps) {
  return (
    <ol className={`av-lamps ${dense ? "av-lamps-dense" : ""}`} aria-label={label}>
      {steps.map((step, i) => {
        const current = i === currentIndex;
        const cls = `av-lamp is-${step.status} ${current ? "is-current" : ""}`;
        const inner = (
          <>
            <Glow trigger={step.status === "done" ? "lit" : null}>
              <StepDot status={step.status} />
            </Glow>
            <span className="av-lamp-label">{step.label}</span>
            <span className="sr-only">
              {DOT_SR_TEXT[step.status]}
              {current ? ", current step" : ""}
            </span>
          </>
        );
        return (
          <li key={step.id}>
            {onSelect ? (
              <button
                type="button"
                className={cls}
                onClick={() => onSelect(i)}
                aria-current={current ? "step" : undefined}
              >
                {inner}
              </button>
            ) : (
              <span className={cls}>{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: WizardShell takes each step's status**

In `src/components/journey/WizardShell.tsx`, add to the imports:

```tsx
import type { DotStatus } from "@/lib/stepStatus";
```

In `WizardShellProps`, after the line `lampLabels: Record<string, string>; // short lamp label per step id`, add:

```tsx
  stepStatus: Record<string, DotStatus>; // off, in progress or done, per step id
```

Replace the comment:

```tsx
// Layout for the Calling and Launch wizards (spec 4.2). The page owns
// navigation and data; the shell draws the phase opening, a lamp per step
// (lit when complete, blue ring on the current one, tap to jump), one quiet
// time line, the save state, and the step itself on a raised night card.
```

with:

```tsx
// Layout for the Calling and Launch wizards (spec 4.2). The page owns
// navigation and data; the shell draws the phase opening, a dot per step
// (off, in progress or done; the current step's label is underlined; tap
// to jump), one quiet time line, the save state, and the step itself on a
// raised night card.
```

Replace:

```tsx
  const { phaseId, user, name, title, steps, lampLabels, current, onSelect, saving, saveError, children } = props;
```

with:

```tsx
  const { phaseId, user, name, title, steps, lampLabels, stepStatus, current, onSelect, saving, saveError, children } =
    props;
```

Replace:

```tsx
              steps={steps.map((s) => ({ id: s.id, label: lampLabels[s.id] ?? s.title, done: s.complete }))}
```

with:

```tsx
              steps={steps.map((s) => {
                const status = stepStatus[s.id];
                if (!status) throw new Error(`WizardShell: no status for step ${s.id}`);
                return { id: s.id, label: lampLabels[s.id] ?? s.title, status };
              })}
```

- [ ] **Step 5: The two wizards pass the statuses**

In `src/app/leaders/training/calling/page.tsx`, add to the imports:

```tsx
import { callingSectionStatus } from "@/lib/stepStatus";
```

Directly after the `steps` array (after the line `  }));` that closes `CALLING_SECTIONS.map`), add:

```tsx
  const stepStatus = Object.fromEntries(CALLING_SECTIONS.map((s) => [s.id, callingSectionStatus(s.id, data)]));
```

In the `<WizardShell` call, after `lampLabels={CALLING_LAMP_LABELS}`, add:

```tsx
        stepStatus={stepStatus}
```

In `src/app/leaders/training/launch/page.tsx`, add to the imports:

```tsx
import { launchWizardStepStatus } from "@/lib/stepStatus";
```

Directly after the `steps` array (after the line `  }));` that closes `LAUNCH_STEPS.map`), add:

```tsx
  const stepStatus = Object.fromEntries(
    LAUNCH_STEPS.map((s) => [s.id, launchWizardStepStatus(s.id, data, ARENA_ENABLED)])
  );
```

In the `<WizardShell` call, after `lampLabels={LAUNCH_LAMP_LABELS}`, add:

```tsx
        stepStatus={stepStatus}
```

- [ ] **Step 6: The hub's Calling and Launch blocks**

In `src/app/leaders/training/CallingCard.tsx`, replace:

```tsx
import LampSteps from "@/components/avenue/LampSteps";
import { CALLING_LAMP_LABELS } from "@/lib/avenue";
import { CALLING_SECTION_IDS, CALLING_TOTAL, callingSectionComplete, type CallingData } from "@/lib/journey";
```

with:

```tsx
import LampSteps, { type LampStep } from "@/components/avenue/LampSteps";
import { CALLING_LAMP_LABELS } from "@/lib/avenue";
import { CALLING_SECTION_IDS, CALLING_TOTAL, type CallingData } from "@/lib/journey";
import { callingSectionStatus } from "@/lib/stepStatus";
```

Replace:

```tsx
  const lamps = CALLING_SECTION_IDS.map((id) => ({
    id,
    label: CALLING_LAMP_LABELS[id],
    done: ok && callingSectionComplete(id, data),
  }));
  const completed = lamps.filter((l) => l.done).length;
  const firstOpen = lamps.findIndex((l) => !l.done);
```

with:

```tsx
  const lamps: LampStep[] = CALLING_SECTION_IDS.map((id) => ({
    id,
    label: CALLING_LAMP_LABELS[id],
    status: ok ? callingSectionStatus(id, data) : "off",
  }));
  const completed = lamps.filter((l) => l.status === "done").length;
  const firstOpen = lamps.findIndex((l) => l.status !== "done");
```

In `src/app/leaders/training/LaunchCard.tsx`, replace:

```tsx
import LampSteps from "@/components/avenue/LampSteps";
import { LAUNCH_LAMP_LABELS } from "@/lib/avenue";
import { LAUNCH_STEP_IDS, LAUNCH_TOTAL, launchStepComplete, type LaunchData } from "@/lib/journey";
```

with:

```tsx
import LampSteps, { type LampStep } from "@/components/avenue/LampSteps";
import { LAUNCH_LAMP_LABELS } from "@/lib/avenue";
import { LAUNCH_STEP_IDS, LAUNCH_TOTAL, type LaunchData } from "@/lib/journey";
import { launchStepStatus } from "@/lib/stepStatus";
```

Replace:

```tsx
  const lamps = LAUNCH_STEP_IDS.map((id) => ({
    id,
    label: LAUNCH_LAMP_LABELS[id],
    done: ok && launchStepComplete(id, data),
  }));
  const completed = lamps.filter((l) => l.done).length;
  const firstOpen = lamps.findIndex((l) => !l.done);
```

with:

```tsx
  const lamps: LampStep[] = LAUNCH_STEP_IDS.map((id) => ({
    id,
    label: LAUNCH_LAMP_LABELS[id],
    status: ok ? launchStepStatus(id, data) : "off",
  }));
  const completed = lamps.filter((l) => l.status === "done").length;
  const firstOpen = lamps.findIndex((l) => l.status !== "done");
```

- [ ] **Step 7: The Arena month street**

In `src/app/leaders/training/launch/ArenaStep.tsx`, add below the `@/lib/arena` import:

```tsx
import { arenaMonthStatus } from "@/lib/stepStatus";
```

Replace:

```tsx
// The six months as a street of small lamps: lit once played, a blue ring
// on the month being played. Display only.
function MonthStreet({ state }: { state: ArenaState }) {
  const steps = DEFAULT_ORDER.map((id, i) => ({ id: `month-${i + 1}-${id}`, label: `Month ${i + 1}`, done: i < state.month }));
```

with:

```tsx
// The six months as a row of dots: done once played, the month in play
// pulsing mid-run, its label underlined. Display only.
function MonthStreet({ state }: { state: ArenaState }) {
  const steps = DEFAULT_ORDER.map((id, i) => ({
    id: `month-${i + 1}-${id}`,
    label: `Month ${i + 1}`,
    status: arenaMonthStatus(i, state),
  }));
```

- [ ] **Step 8: Foundations module dots**

In `src/app/leaders/training/PhaseModules.tsx`, add after the `Glow` import:

```tsx
import StepDot from "@/components/avenue/StepDot";
import { DOT_SR_TEXT, moduleStatus } from "@/lib/stepStatus";
```

Replace (the dot is `aria-hidden`, so the button's name carries the in-progress state; ticked wording unchanged):

```tsx
                aria-label={module.completed ? `${module.title}: done. Tap to untick.` : `${module.title}: mark done`}
```

with:

```tsx
                aria-label={
                  module.completed
                    ? `${module.title}: done. Tap to untick.`
                    : `${module.title}${DOT_SR_TEXT[moduleStatus(module)]}: mark done`
                }
```

Replace:

```tsx
                <Glow trigger={module.completed ? "lit" : null}>
                  <span
                    aria-hidden="true"
                    className={`block h-[14px] w-[14px] rounded-full border ${
                      module.completed
                        ? "border-[var(--lamp)] bg-[var(--lamp)] shadow-[0_0_18px_4px_rgba(255,197,107,0.45)]"
                        : "border-[var(--line-2)] bg-[#131926]"
                    }`}
                  />
                </Glow>
```

with:

```tsx
                <Glow trigger={module.completed ? "lit" : null}>
                  <StepDot status={moduleStatus(module)} />
                </Glow>
```

and replace the comment line `// useTrainingProgress via the page. A ticked module's lamp is lit.` with:

```tsx
// useTrainingProgress via the page. A ticked module's dot is lit; a module
// with an episode watched but not ticked pulses (round 3 spec 4).
```

- [ ] **Step 9: No stale uses left**

Run: `git grep -n "av-lamp-glass\|av-lamp-post\|is-lit\|done: s.complete" -- src`
Expected: no output.

- [ ] **Step 10: Run the gates**

`npx tsc --noEmit` clean, `npm test` 290 passing (no new tests), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 11: Commit**

```bash
git add src/components/avenue/StepDot.tsx src/app/globals.css src/components/avenue/LampSteps.tsx src/components/journey/WizardShell.tsx src/app/leaders/training/calling/page.tsx src/app/leaders/training/launch/page.tsx src/app/leaders/training/CallingCard.tsx src/app/leaders/training/LaunchCard.tsx src/app/leaders/training/launch/ArenaStep.tsx src/app/leaders/training/PhaseModules.tsx
git commit -m "Avenue at night 3: three-state step dots, current step by its label

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 12: Controller browser check**

At 375 px and desktop, with a fixture leader who has part of Calling answered (one Layers placement saved, Callable complete), one Launch step half done (Pray first: only "who"), one Foundations episode watched but its module not ticked:
- `/leaders/training`, Calling block: a row of dots with no stems. "Callable" is a solid warm dot, "What is a calling" pulses (about 2.4 s), the rest are hollow and dim. The first not-done step's label is bright and underlined; no blue ring anywhere.
- Launch block: "Pray first" pulses, the others are off.
- Foundations: the module with a watched episode pulses; a ticked module is solid. Tapping the tick still toggles done, and the dot glows once when it turns done.
- `/leaders/training/calling` (six dots) and `/leaders/training/launch` (nine dots): the dots at the top match the hub; tap one (44 px target) and the underline moves to it. Keyboard: Tab reaches each step, the lamp focus ring shows.
- `/leaders/training/launch`, step 8 (Arena): before any pick all six month dots are off; after one pick month 1 is done and month 2 pulses; at the end all six are lit. At 375 px the six months stay on one row.
- Reduced motion on: the pulsing dots are steady half-strength warm dots.

---

### Task 4: Foundations thumbnails as YouTube shows them

**Files:**
- Create: `src/lib/youtubeThumb.ts`
- Test: `src/lib/youtubeThumb.test.ts`
- Modify: `src/components/ui/EpisodeCarousel.tsx` (imports, the `thumbUrl` helper at lines 19-22, the `<img>` at lines 122-130)

**Interfaces:**
- Consumes: nothing new.
- Produces: `THUMB_ORDER` (`["maxresdefault", "sddefault", "hqdefault"]`), `type ThumbSize`, `thumbUrl(youtubeId: string, size: ThumbSize): string`, `nextThumbSize(size: ThumbSize): ThumbSize | null`, `isPlaceholderThumb(naturalWidth: number): boolean` from `src/lib/youtubeThumb.ts`. Nothing else in the carousel changes.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/youtubeThumb.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPlaceholderThumb, nextThumbSize, THUMB_ORDER, thumbUrl } from "./youtubeThumb";

describe("YouTube thumbnails", () => {
  it("starts from the 1280x720 image YouTube itself shows", () => {
    expect(THUMB_ORDER[0]).toBe("maxresdefault");
    expect(thumbUrl("-yjMDB8OXsg", "maxresdefault")).toBe("https://img.youtube.com/vi/-yjMDB8OXsg/maxresdefault.jpg");
  });
  it("falls back to sddefault, then hqdefault, then stops", () => {
    expect(nextThumbSize("maxresdefault")).toBe("sddefault");
    expect(nextThumbSize("sddefault")).toBe("hqdefault");
    expect(nextThumbSize("hqdefault")).toBeNull();
  });
  it("treats an image 120 px wide or less as YouTube's grey placeholder", () => {
    expect(isPlaceholderThumb(120)).toBe(true);
    expect(isPlaceholderThumb(0)).toBe(true);
    expect(isPlaceholderThumb(121)).toBe(false);
    expect(isPlaceholderThumb(1280)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/youtubeThumb.test.ts`
Expected: FAIL: "Failed to resolve import ./youtubeThumb".

- [ ] **Step 3: Write the helpers**

Create `src/lib/youtubeThumb.ts`:

```ts
// Foundations thumbnails as YouTube shows them (round 3 spec 1). Pure.
// maxresdefault is the 1280x720 16:9 image. Not every video has one, so
// fall back to sddefault, then hqdefault (both 4:3 with black bars, which
// object-cover in a 16:9 box crops away). YouTube answers a missing size
// with a 120x90 grey placeholder, so a loaded image that narrow counts as
// missing too.
export const THUMB_ORDER = ["maxresdefault", "sddefault", "hqdefault"] as const;
export type ThumbSize = (typeof THUMB_ORDER)[number];

export const PLACEHOLDER_MAX_WIDTH = 120;

export function thumbUrl(youtubeId: string, size: ThumbSize): string {
  return `https://img.youtube.com/vi/${youtubeId}/${size}.jpg`;
}

export function nextThumbSize(size: ThumbSize): ThumbSize | null {
  const i = THUMB_ORDER.indexOf(size);
  return i >= 0 && i < THUMB_ORDER.length - 1 ? THUMB_ORDER[i + 1] : null;
}

export function isPlaceholderThumb(naturalWidth: number): boolean {
  return naturalWidth <= PLACEHOLDER_MAX_WIDTH;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/youtubeThumb.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Use them in the carousel**

In `src/components/ui/EpisodeCarousel.tsx`, add below the lucide import:

```tsx
import { isPlaceholderThumb, nextThumbSize, THUMB_ORDER, thumbUrl, type ThumbSize } from "@/lib/youtubeThumb";
```

Replace:

```tsx
// YouTube serves thumbnails straight off img.youtube.com, no API key and no
// next/image domain config needed, so a plain <img> is the right call here.
const thumbUrl = (youtubeId: string) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
```

with:

```tsx
// YouTube serves thumbnails straight off img.youtube.com, no API key and no
// next/image domain config needed, so a plain <img> is the right call here.
// Starts at the 16:9 maxresdefault and steps down on a 404 or on YouTube's
// 120 px grey placeholder (round 3 spec 1). The carousel mounts only on the
// client, after the leader gate, so onError and onLoad always fire here.
function EpisodeThumb({ youtubeId, dimmed }: { youtubeId: string; dimmed: boolean }) {
  const [size, setSize] = useState<ThumbSize>(THUMB_ORDER[0]);
  const fallBack = () => {
    const next = nextThumbSize(size);
    if (next) setSize(next);
    else console.error(`EpisodeCarousel: no thumbnail loaded for YouTube video ${youtubeId}`);
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl(youtubeId, size)}
      alt=""
      loading="lazy"
      onError={fallBack}
      onLoad={(e) => {
        if (isPlaceholderThumb(e.currentTarget.naturalWidth)) fallBack();
      }}
      className={`w-full aspect-video object-cover ${dimmed ? "opacity-50" : ""}`}
    />
  );
}
```

Replace:

```tsx
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(ep.youtubeId)}
                    alt=""
                    loading="lazy"
                    className={`w-full aspect-video object-cover ${
                      ep.watched ? "opacity-50" : ""
                    }`}
                  />
```

with:

```tsx
                  <EpisodeThumb key={ep.youtubeId} youtubeId={ep.youtubeId} dimmed={ep.watched} />
```

- [ ] **Step 6: Run the gates**

`npx tsc --noEmit` clean, `npm test` 293 passing (290 + 3), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/youtubeThumb.ts src/lib/youtubeThumb.test.ts src/components/ui/EpisodeCarousel.tsx
git commit -m "Avenue at night 3: Foundations thumbnails at YouTube's 16:9 size, with fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

At 375 px and desktop, `/leaders/training?phase=phase1`:
- Every Foundations thumbnail fills its 16:9 tile with no black bars, sharp like YouTube's own grid. Compare two or three against the same video on youtube.com.
- Network panel, filter `img.youtube.com`: most requests are `maxresdefault.jpg` (200). For any video without one, a 404 on `maxresdefault.jpg` is followed by `sddefault.jpg` or `hqdefault.jpg`, and that tile still shows a picture, not a grey box.
- Console: no "no thumbnail loaded" error.
- Watched episodes are still dimmed; play and watched toggles work as before; the arrows and counter are unchanged.

---

### Task 5: The reset endpoint, `DELETE /api/worksheets`

**Files:**
- Modify: `src/app/api/worksheets/route.ts` (header comment, a new `DELETE` export appended after `PATCH`; `GET` and `PATCH` unchanged)
- Test: `src/app/api/worksheets/route.test.ts` (new)
- Modify: `scripts/check-auth.mjs` (`GUARDED` list at lines 30-47; the worksheets block after the "over-deep value is 400" check at line 284)

**Interfaces:**
- Consumes: `requireLeader(request)` from `@/lib/requireLeader`, `getSupabaseAdmin()` and `adminConfigError()` from `@/lib/supabaseAdmin`, `parseKind(value)` from `@/lib/worksheets` (all unchanged).
- Produces: `DELETE /api/worksheets?kind=calling|launch`. 401 or 403 from `requireLeader`; 400 `{ error: "kind must be calling or launch" }`; 500 `{ error: <database message> }`; 200 `{ ok: true }` (also when there was no row). Task 6's `reset()` calls it through `leaderFetch`.

- [ ] **Step 1: Write the failing route tests**

Create `src/app/api/worksheets/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The route's two server dependencies are replaced, so these tests run with
// no Supabase and no session. requireLeader's own checks are covered by
// leaderAuth.test.ts and scripts/check-auth.mjs.
const h = vi.hoisted(() => ({
  requireLeader: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { DELETE } from "./route";

const SESSION_EMAIL = "reset-a@example.invalid";

// A stand-in for the Supabase query builder: records every call, and the
// awaited delete resolves with `result`.
function fakeDb(result: { error: { message: string } | null }) {
  const calls: string[][] = [];
  const chain = {
    eq(column: string, value: string) {
      calls.push(["eq", column, value]);
      return chain;
    },
    then(onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  const db = {
    from(table: string) {
      calls.push(["from", table]);
      return {
        delete() {
          calls.push(["delete"]);
          return chain;
        },
      };
    },
  };
  return { db, calls };
}

const del = (query: string) =>
  DELETE(new NextRequest(`http://localhost/api/worksheets${query}`, { method: "DELETE" }));

beforeEach(() => {
  h.requireLeader.mockReset();
  h.getSupabaseAdmin.mockReset();
  h.requireLeader.mockResolvedValue({ leader: { email: SESSION_EMAIL, name: "Reset A", fullAccess: false } });
});

describe("DELETE /api/worksheets (reset)", () => {
  it("passes requireLeader's 401 straight back and touches no table", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) });
    const res = await del("?kind=calling");
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 without a kind and touches no table", async () => {
    const res = await del("");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "kind must be calling or launch" });
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for a kind that is not calling or launch", async () => {
    const res = await del("?kind=profile");
    expect(res.status).toBe(400);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("deletes only the signed-in leader's row of that kind, ignoring an email in the query", async () => {
    const fake = fakeDb({ error: null });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await del(`?kind=launch&email=${encodeURIComponent("someone-else@example.invalid")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fake.calls).toEqual([
      ["from", "leader_worksheets"],
      ["delete"],
      ["eq", "email", SESSION_EMAIL],
      ["eq", "kind", "launch"],
    ]);
  });

  it("checks the session before it opens the database", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeDb({ error: null }).db);
    await del("?kind=calling");
    expect(h.requireLeader.mock.invocationCallOrder[0]).toBeLessThan(h.getSupabaseAdmin.mock.invocationCallOrder[0]);
  });

  it("fails loud with the database message", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeDb({ error: { message: "permission denied" } }).db);
    const res = await del("?kind=calling");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "permission denied" });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/app/api/worksheets/route.test.ts`
Expected: FAIL: `DELETE` is not a function (the route has no `DELETE` export yet).

- [ ] **Step 3: Add the handler**

In `src/app/api/worksheets/route.ts`, replace the header comment:

```ts
// Worksheets: Calling and Launch answers, private to the signed-in leader.
// The email is only ever auth.leader.email. A read filters by it; a write
// passes it to worksheet_set_section, which merges one section atomically.
```

with:

```ts
// Worksheets: Calling and Launch answers, private to the signed-in leader.
// The email is only ever auth.leader.email. A read filters by it; a write
// passes it to worksheet_set_section, which merges one section atomically;
// a reset deletes the one row for that email and kind.
```

Append at the end of the file (after the closing `}` of `PATCH`):

```ts

// DELETE /api/worksheets?kind=calling|launch
// Reset Calling or Reset Launch (round 3 spec 2): removes the caller's one
// row for that kind, which holds every answer in it (APEST results and the
// AI reflection for Calling, the Arena run and ticked actions for Launch).
// No other table is touched. Deleting when there is no row is still ok, so
// a second tap is harmless.
export async function DELETE(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const kind = parseKind(new URL(request.url).searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "kind must be calling or launch" }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from("leader_worksheets")
    .delete()
    .eq("email", auth.leader.email)
    .eq("kind", kind);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/app/api/worksheets/route.test.ts`
Expected: PASS, 6 tests.

Then confirm `GET` and `PATCH` are untouched:

Run: `git diff -U0 src/app/api/worksheets/route.ts`
Expected: in the header comment, the third line changes (its final full stop becomes a semicolon) and one line is added below it; then the appended `DELETE` block. No line inside `GET` or `PATCH` appears.

- [ ] **Step 5: Extend the end-to-end auth check**

In `scripts/check-auth.mjs`, in `GUARDED`, after the line `  ["PATCH", "/api/worksheets"],` add:

```js
  ["DELETE", "/api/worksheets?kind=calling"],
```

After these lines:

```js
      const deep = await patch(tokenA, { kind: "launch", section: "invite", value: { a: { b: { c: { d: { e: { f: 1 } } } } } } });
      check("over-deep value is 400", deep.status === 400, `got ${deep.status}`);
```

add:

```js

      console.log("reset clears only the caller's own worksheet of that kind");
      const aPrayer = await patch(tokenA, { kind: "launch", section: "prayer", value: { when: "Mornings" } });
      check("A saves a launch section before the reset", aPrayer.status === 200, JSON.stringify(aPrayer));
      const reset = await call("DELETE", `/api/worksheets?kind=calling&email=${encodeURIComponent(B)}`, { token: tokenA });
      check("A resets Calling", reset.status === 200 && reset.json?.ok === true, JSON.stringify(reset));
      const aCalling = await call("GET", "/api/worksheets?kind=calling", { token: tokenA });
      check(
        "A's Calling reads as {} after the reset",
        aCalling.status === 200 && JSON.stringify(aCalling.json?.data) === "{}",
        JSON.stringify(aCalling)
      );
      const aLaunchAfter = await call("GET", "/api/worksheets?kind=launch", { token: tokenA });
      check(
        "A's Launch is untouched by a Calling reset",
        aLaunchAfter.status === 200 && aLaunchAfter.json?.data?.prayer?.when === "Mornings",
        JSON.stringify(aLaunchAfter)
      );
      const { data: bCalling, error: bCallingErr } = await db
        .from("leader_worksheets")
        .select("data")
        .eq("email", B)
        .eq("kind", "calling");
      if (bCallingErr) throw new Error(bCallingErr.message);
      check(
        "B's Calling row survives A's reset (the query's email is ignored)",
        bCalling.length === 1 && bCalling[0].data?.layers?.placements?.s1 === "seasonal",
        JSON.stringify(bCalling)
      );
      const { data: aProfile, error: aProfileErr } = await db
        .from("leader_profiles")
        .select("about")
        .eq("email", A)
        .maybeSingle();
      if (aProfileErr) throw new Error(aProfileErr.message);
      check(
        "A's profile is untouched by the reset (no other table)",
        aProfile?.about === "written by A",
        JSON.stringify(aProfile)
      );
      const again = await call("DELETE", "/api/worksheets?kind=calling", { token: tokenA });
      check("a second reset is still ok", again.status === 200 && again.json?.ok === true, JSON.stringify(again));
      const badReset = await call("DELETE", "/api/worksheets?kind=profile", { token: tokenA });
      check("reset with an invalid kind is 400", badReset.status === 400, `got ${badReset.status}`);
      const noAuthReset = await call("DELETE", "/api/worksheets?kind=launch");
      check("reset without a token is 401", noAuthReset.status === 401, `got ${noAuthReset.status}`);
      const aLaunchFinal = await call("GET", "/api/worksheets?kind=launch", { token: tokenA });
      check(
        "A's Launch still holds its answer after the refused reset",
        aLaunchFinal.json?.data?.prayer?.when === "Mornings",
        JSON.stringify(aLaunchFinal)
      );
```

Run: `node --check scripts/check-auth.mjs`
Expected: no output (the script parses).

- [ ] **Step 6: Run the gates**

`npx tsc --noEmit` clean, `npm test` 299 passing (293 + 6), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/worksheets/route.ts src/app/api/worksheets/route.test.ts scripts/check-auth.mjs
git commit -m "Avenue at night 3: DELETE /api/worksheets resets one leader's Calling or Launch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller-run fixture check (writes fixtures, controller only)**

With the dev server running on :3000 (`npm run dev`):

```bash
npm run guard
node --env-file=.env.local scripts/check-auth.mjs
npm run guard
```

Expected: `clean`; then every line `ok`, including the new "no token, garbage token, non-leader token" lines for `DELETE /api/worksheets?kind=calling` (401, 401, 403) and the ten reset lines, ending `fixtures cleaned` and `all passed`; then `clean`. Any `FAIL` stops the branch until fixed.

- [ ] **Step 9: Security-focused review (controller dispatches)**

Dispatch a reviewer on this task's diff with this brief: the handler runs `requireLeader` before any query; the email comes only from `auth.leader.email`; `kind` goes through `parseKind`; the delete filters on both `email` and `kind` on `leader_worksheets` only; every error returns non-2xx; `GET` and `PATCH` are byte for byte unchanged; `check-auth.mjs` proves 401 without a token, 403 for a non-leader, own-kind cleared, other kind, other leader and another table (A's profile) untouched. Verdict must be clean before Task 6 starts.

---

### Task 6: Reset Calling and Reset Launch in the app

**Files:**
- Create: `src/lib/worksheetReset.ts`
- Test: `src/lib/worksheetReset.test.ts`
- Modify: `src/lib/useWorksheet.ts` (additive only: one import, `reloadKey` state, `resettingRef` and `epochRef`, one line at the top of the load effect, the load effect's dependency list, two guards in `send`, one line each where `send` adds and removes its in-flight mark, `reset`, the return value)
- Create: `src/components/journey/ResetWorksheet.tsx`
- Modify: `src/app/globals.css` (the focus ring selector list at lines 298-300; a new `.av-dialog` block after the `.av-sheet` media query)
- Modify: `src/app/leaders/training/calling/profile/page.tsx` (import, `reset` from the hook, a block before `<JourneyFooter />`)
- Modify: `src/app/leaders/training/launch/plan/page.tsx` (import, `reset` from the hook, a block before `<JourneyFooter />`)
- Modify: `src/app/leaders/training/CallingCard.tsx` (import, `onReset` prop, quiet button)
- Modify: `src/app/leaders/training/LaunchCard.tsx` (import, `onReset` prop, quiet button)
- Modify: `src/app/leaders/training/page.tsx` (the two card calls at lines 380 and 382)

**Interfaces:**
- Consumes (Task 5): `DELETE /api/worksheets?kind=` returning `{ ok: true }` or `{ error }`. `type WorksheetKind` from `@/lib/worksheets`. `leaderFetch` from `@/lib/leaderFetch`.
- Produces:
  - From `src/lib/worksheetReset.ts`: `interface ResetCopy { button: string; title: string; wiped: string[]; kept: string; confirm: string }`, `RESET_COPY: Record<WorksheetKind, ResetCopy>`, `RESET_LEAD = "This wipes:"`, `RESET_FINAL = "This can't be undone."`, `RESET_WAIT_MS = 15_000`, `RESET_BUSY_MESSAGE`, `waitForIdle(isBusy: () => boolean, timeoutMs: number, pollMs?: number): Promise<void>`, and the page-wide bookkeeping shared by every `useWorksheet` copy: `saveStarted(kind)`, `saveEnded(kind)` (throws if nothing was started), `savesInFlight(kind): number`, `resetEpoch(kind): number`, `beginResetEpoch(kind): number`.
  - `useWorksheet(...)` also returns `reset: () => Promise<void>`.
  - `ResetWorksheet` default export, props `{ kind: WorksheetKind; onReset: () => Promise<void>; variant: "button" | "quiet" }`.
  - `CallingCardProps` and `LaunchCardProps` gain `onReset: () => Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/worksheetReset.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginResetEpoch,
  RESET_COPY,
  RESET_FINAL,
  RESET_LEAD,
  resetEpoch,
  saveEnded,
  saveStarted,
  savesInFlight,
  waitForIdle,
} from "./worksheetReset";

afterEach(() => {
  vi.useRealTimers();
});

describe("reset dialog copy", () => {
  it("says exactly what Reset Calling wipes and keeps", () => {
    expect(RESET_COPY.calling).toEqual({
      button: "Reset Calling",
      title: "Reset Calling?",
      wiped: [
        "Your answers in all six Calling sections",
        "Your APEST results and the AI reflection",
        "Your Calling Profile, which is made from those answers",
      ],
      kept: "People on My People are kept.",
      confirm: "Yes, reset Calling",
    });
  });
  it("says exactly what Reset Launch wipes and keeps", () => {
    expect(RESET_COPY.launch).toEqual({
      button: "Reset Launch",
      title: "Reset Launch?",
      wiped: [
        "Your answers in all seven Launch steps",
        "Your Arena run",
        "Your Launch Plan, including the actions you ticked",
      ],
      kept: "People on My People are kept.",
      confirm: "Yes, reset Launch",
    });
  });
  it("ends with the spec's warning and uses no em dash", () => {
    expect(RESET_LEAD).toBe("This wipes:");
    expect(RESET_FINAL).toBe("This can't be undone.");
    expect(JSON.stringify(RESET_COPY) + RESET_LEAD + RESET_FINAL).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("waitForIdle", () => {
  it("resolves at once when no save is in flight", async () => {
    await expect(waitForIdle(() => false, 1000)).resolves.toBeUndefined();
  });
  it("waits until the in-flight save lands", async () => {
    vi.useFakeTimers();
    const inFlight = new Set(["layers"]);
    let done = false;
    const waiting = waitForIdle(() => inFlight.size > 0, 15_000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(200);
    expect(done).toBe(false);
    inFlight.clear();
    await vi.advanceTimersByTimeAsync(50);
    expect(done).toBe(true);
    await waiting;
  });
  it("gives up loud after the timeout", async () => {
    vi.useFakeTimers();
    const waiting = waitForIdle(() => true, 1000);
    const failed = expect(waiting).rejects.toThrow("A save is still running, so nothing was reset. Try again.");
    await vi.advanceTimersByTimeAsync(1100);
    await failed;
  });
});

describe("page-wide save bookkeeping", () => {
  it("counts saves on the wire per kind and fails loud on an unmatched end", () => {
    saveStarted("calling");
    saveStarted("calling");
    saveEnded("calling");
    expect(savesInFlight("calling")).toBe(1);
    expect(savesInFlight("launch")).toBe(0);
    saveEnded("calling");
    expect(savesInFlight("calling")).toBe(0);
    expect(() => saveEnded("calling")).toThrow("saveEnded(calling) without a matching saveStarted");
  });
  it("moves the reset epoch for one kind only", () => {
    const calling = resetEpoch("calling");
    const launch = resetEpoch("launch");
    expect(beginResetEpoch("calling")).toBe(calling + 1);
    expect(resetEpoch("calling")).toBe(calling + 1);
    expect(resetEpoch("launch")).toBe(launch);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/worksheetReset.test.ts`
Expected: FAIL: "Failed to resolve import ./worksheetReset".

- [ ] **Step 3: Write the copy and the wait**

Create `src/lib/worksheetReset.ts`:

```ts
// Reset Calling and Reset Launch (round 3 spec 2): the confirm dialog's
// words, the wait that lets a save already on the wire land before the
// delete (so it cannot write an old answer back afterwards), and the small
// page-wide count of saves and resets that wait relies on.
import type { WorksheetKind } from "@/lib/worksheets";

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
    button: "Reset Launch",
    title: "Reset Launch?",
    wiped: [
      // Henry to check wording
      "Your answers in all seven Launch steps",
      // Henry to check wording
      "Your Arena run",
      // Henry to check wording
      "Your Launch Plan, including the actions you ticked",
    ],
    // Henry to check wording
    kept: "People on My People are kept.",
    confirm: "Yes, reset Launch",
  },
};

export const RESET_WAIT_MS = 15_000;
export const RESET_BUSY_MESSAGE = "A save is still running, so nothing was reset. Try again.";

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
const inFlight: Record<WorksheetKind, number> = { calling: 0, launch: 0 };
const epoch: Record<WorksheetKind, number> = { calling: 0, launch: 0 };

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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/worksheetReset.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: `reset()` in useWorksheet (additive)**

In `src/lib/useWorksheet.ts`, after the line `import type { WorksheetKind } from "@/lib/worksheets";` add:

```ts
import {
  beginResetEpoch,
  RESET_WAIT_MS,
  resetEpoch,
  saveEnded,
  saveStarted,
  savesInFlight,
  waitForIdle,
} from "@/lib/worksheetReset";
```

After the line `  const [saveError, setSaveError] = useState<string | null>(null);` add:

```ts
  // Bumped by reset() to re-run the load below after a delete.
  const [reloadKey, setReloadKey] = useState(0);
```

After the line `  const unmountedRef = useRef(false);` add:

```ts
  // True while reset() runs: send does nothing (queued values stay queued),
  // so no save can write an old answer back after the delete (round 3
  // spec 2).
  const resettingRef = useRef(false);
  // The page-wide reset epoch this copy loaded under. A copy that loaded
  // before a later reset (a wizard that has unmounted but still gets a late
  // APEST reflection) drops its saves instead of writing old answers back.
  const epochRef = useRef(0);
```

Directly after the load effect's first line `  useEffect(() => {` (the one whose next line is `    if (!enabled) return;`), add:

```ts
    epochRef.current = resetEpoch(kind);
```

Replace the load effect's dependency line:

```ts
  }, [kind, enabled]);
```

with:

```ts
  }, [kind, enabled, reloadKey]);
```

Inside `sendRef.current = async (section: string) => {`, replace its first line:

```ts
      if (!pendingRef.current.has(section)) return;
```

with:

```ts
      if (resettingRef.current) return;
      if (!pendingRef.current.has(section)) return;
      if (epochRef.current !== resetEpoch(kind)) {
        // This worksheet was reset after this copy loaded: an old answer
        // must not be written back (round 3 spec 2).
        pendingRef.current.delete(section);
        console.warn(`Worksheet save dropped after a reset (${kind}.${section})`);
        return;
      }
```

In the same function, directly after the line `      inFlightRef.current.add(section);` add:

```ts
      saveStarted(kind);
```

and in its `finally`, directly after the line `        inFlightRef.current.delete(section);` add:

```ts
        saveEnded(kind);
```

After the whole `flushSection` callback (ending `  }, []);`, directly before the comment `// Warn before leaving with unsaved typing, and send anything still`), add:

```ts
  // Reset Calling or Reset Launch (round 3 spec 2). Queued saves are
  // stopped (their values stay queued, unsent) and the reset epoch moves,
  // so any other copy of this worksheet on the page drops its later saves.
  // Every save of this kind already on the wire, from any copy, lands
  // before the delete, so it cannot write an old answer back. If one is
  // still running after RESET_WAIT_MS this throws and deletes nothing. A
  // failed delete throws the server's message. Unsent typing is dropped
  // only once the delete succeeded; otherwise it goes back in the queue.
  // On success the worksheet is re-read through the normal load path.
  const reset = useCallback(async () => {
    resettingRef.current = true;
    for (const t of timersRef.current.values()) clearTimeout(t);
    timersRef.current.clear();
    beginResetEpoch(kind);
    let wiped = false;
    try {
      await waitForIdle(() => savesInFlight(kind) > 0, RESET_WAIT_MS);
      const res = await leaderFetch(`/api/worksheets?kind=${kind}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not reset (${res.status})`);
      wiped = true;
      pendingRef.current.clear();
      setData({});
      setSaveError(null);
      setError(null);
      setReloadKey((k) => k + 1);
    } finally {
      epochRef.current = resetEpoch(kind);
      resettingRef.current = false;
      if (!wiped) for (const section of pendingRef.current.keys()) schedule(section, SAVE_DEBOUNCE_MS);
    }
  }, [kind, schedule]);
```

Replace the return line:

```ts
  return { data, loaded, error, saveSection, flushSection, savingSection, saveError };
```

with:

```ts
  return { data, loaded, error, saveSection, flushSection, savingSection, saveError, reset };
```

Then confirm the change is additive:

Run: `git diff src/lib/useWorksheet.ts | grep "^-" | grep -v "^---"`
Expected: exactly two removed lines, the old dependency list `  }, [kind, enabled]);` and the old return line. Everything else is `+` only.

- [ ] **Step 6: The reset button and dialog**

Create `src/components/journey/ResetWorksheet.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RESET_COPY, RESET_FINAL, RESET_LEAD } from "@/lib/worksheetReset";
import type { WorksheetKind } from "@/lib/worksheets";

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
        className="av-dialog no-print"
        onClose={handleClose}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <h2 id={titleId} className="font-serif text-2xl text-[var(--ink)]">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm text-[var(--ink-2)]">{RESET_LEAD}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-2)]">
          {copy.wiped.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--muted)]">{copy.kept}</p>
        <p className="mt-3 text-sm font-semibold text-[var(--ink)]">{RESET_FINAL}</p>
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
            {busy ? "Resetting..." : copy.confirm}
          </button>
        </div>
      </dialog>
    </div>
  );
}
```

- [ ] **Step 7: The dialog's CSS**

In `src/app/globals.css`, replace:

```css
.avenue-night :focus-visible,
.av-moment :focus-visible,
.av-sheet :focus-visible {
```

with:

```css
.avenue-night :focus-visible,
.av-moment :focus-visible,
.av-sheet :focus-visible,
.av-dialog :focus-visible {
```

After the closing `}` of the `@media (min-width: 768px) { .av-sheet { ... } .av-sheet-body { ... } }` block, directly before the three-line banner comment whose middle line is `/* PRINT: Calling Profile and Launch Plan                       */`, add:

```css
/* The reset confirm (round 3 spec 2): a native <dialog>, centred, on the
   night panel. It may render outside .avenue-night's colours, so it
   carries the night muted colour itself; the lamp focus ring comes from
   the rule above. */
.av-dialog {
  --muted: #8b94a7;
  width: calc(100% - 32px);
  max-width: 440px;
  margin: auto;
  padding: 24px;
  border: 1px solid var(--line-2);
  border-radius: 18px;
  background: var(--night-2);
  color: var(--ink);
}
.av-dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

```

- [ ] **Step 8: Buttons on the Calling Profile and Launch Plan**

In `src/app/leaders/training/calling/profile/page.tsx`, add after the `HeaderAvatar` import:

```tsx
import ResetWorksheet from "@/components/journey/ResetWorksheet";
```

Replace:

```tsx
  const { data, loaded, error } = useWorksheet<CallingData>("calling", ready);
```

with:

```tsx
  const { data, loaded, error, reset } = useWorksheet<CallingData>("calling", ready);
```

Replace:

```tsx
          <EmptyNext line="Not booked yet." label="Book the conversation" step={STEP_NUMBER.conversation} />
        )}
      </section>

      <JourneyFooter />
```

with:

```tsx
          <EmptyNext line="Not booked yet." label="Book the conversation" step={STEP_NUMBER.conversation} />
        )}
      </section>

      <div className="no-print border-t border-[var(--line)] pt-6">
        <ResetWorksheet kind="calling" onReset={reset} variant="button" />
      </div>

      <JourneyFooter />
```

In `src/app/leaders/training/launch/plan/page.tsx`, add after the `HeaderAvatar` import:

```tsx
import ResetWorksheet from "@/components/journey/ResetWorksheet";
```

Replace:

```tsx
  const { data, loaded, error, saveSection } = useWorksheet<LaunchData>("launch", ready);
```

with:

```tsx
  const { data, loaded, error, saveSection, reset } = useWorksheet<LaunchData>("launch", ready);
```

Replace (the end of the actions section and the footer):

```tsx
          </div>
        )}
      </section>

      <JourneyFooter />
```

with:

```tsx
          </div>
        )}
      </section>

      <div className="no-print border-t border-[var(--line)] pt-6">
        <ResetWorksheet kind="launch" onReset={reset} variant="button" />
      </div>

      <JourneyFooter />
```

- [ ] **Step 9: Quiet buttons in the hub's Calling and Launch blocks**

In `src/app/leaders/training/CallingCard.tsx`, add after the `LampSteps` import:

```tsx
import ResetWorksheet from "@/components/journey/ResetWorksheet";
```

In `CallingCardProps`, after `error: string | null;` add:

```tsx
  onReset: () => Promise<void>; // useWorksheet("calling").reset
```

Replace:

```tsx
export default function CallingCard({ data, loaded, error }: CallingCardProps) {
```

with:

```tsx
export default function CallingCard({ data, loaded, error, onReset }: CallingCardProps) {
```

Replace the closing lines of the component:

```tsx
          View my Calling Profile
        </Link>
      </div>
    </div>
  );
}
```

with:

```tsx
          View my Calling Profile
        </Link>
      </div>
      {ok ? <ResetWorksheet kind="calling" onReset={onReset} variant="quiet" /> : null}
    </div>
  );
}
```

In `src/app/leaders/training/LaunchCard.tsx`, make the same four edits with the Launch names: import `ResetWorksheet`; add `onReset: () => Promise<void>; // useWorksheet("launch").reset` to `LaunchCardProps`; destructure `onReset` in `export default function LaunchCard({ data, loaded, error, onReset }: LaunchCardProps) {`; and replace:

```tsx
          View my Launch Plan
        </Link>
      </div>
    </div>
  );
}
```

with:

```tsx
          View my Launch Plan
        </Link>
      </div>
      {ok ? <ResetWorksheet kind="launch" onReset={onReset} variant="quiet" /> : null}
    </div>
  );
}
```

In `src/app/leaders/training/page.tsx`, replace:

```tsx
                    <CallingCard data={calling.data} loaded={calling.loaded} error={calling.error} />
                  ) : isLaunchPhase ? (
                    <LaunchCard data={launch.data} loaded={launch.loaded} error={launch.error} />
```

with:

```tsx
                    <CallingCard data={calling.data} loaded={calling.loaded} error={calling.error} onReset={calling.reset} />
                  ) : isLaunchPhase ? (
                    <LaunchCard data={launch.data} loaded={launch.loaded} error={launch.error} onReset={launch.reset} />
```

- [ ] **Step 10: Run the gates**

`npx tsc --noEmit` clean, `npm test` 307 passing (299 + 8), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 11: Commit**

```bash
git add src/lib/worksheetReset.ts src/lib/worksheetReset.test.ts src/lib/useWorksheet.ts src/components/journey/ResetWorksheet.tsx src/app/globals.css src/app/leaders/training/calling/profile/page.tsx src/app/leaders/training/launch/plan/page.tsx src/app/leaders/training/CallingCard.tsx src/app/leaders/training/LaunchCard.tsx src/app/leaders/training/page.tsx
git commit -m "Avenue at night 3: Reset Calling and Reset Launch behind a confirm dialog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 12: Controller browser check**

`npm run guard` prints `clean` first. With a fixture leader (`@example.invalid`) that has some Calling answers (including APEST results) and some Launch answers (one planning step, one Arena pick, one ticked action), at 375 px and desktop:
- `/leaders/training/calling/profile`: "Reset Calling" sits at the bottom above the footer, 44 px tall. Print preview: no reset button, the printout is unchanged.
- Open it: the dialog is centred, titled "Reset Calling?", lists the three wiped items, "People on My People are kept.", "This can't be undone.", and "Cancel" has the lamp focus ring. Escape closes it and focus returns to "Reset Calling". Tab moves between Cancel and "Yes, reset Calling" only (focus is trapped).
- "Yes, reset Calling": the label reads "Resetting..." briefly, the dialog closes, every profile section shows its empty state. Reload: still empty. `/leaders/training`: the Calling dots are all off, "0 of 6"; the Launch block is unchanged.
- Pending-save guard: on `/leaders/training/launch/plan`, tick an action and within half a second press "Reset Launch", then "Yes, reset Launch". Network panel: no `PATCH /api/worksheets` is sent after the `DELETE` (a PATCH already on the wire finishes before it). Reload: no action is ticked and the plan is empty.
- Late save from a page you left: on `/leaders/training/calling`, finish the APEST quiz and, while the reflection is still being written, go to `/leaders/training` and "Reset Calling", "Yes, reset Calling". Wait 20 s and reload: Calling is still empty, and the console shows "Worksheet save dropped after a reset (calling.apest)" if the reflection came back after the reset.
- Hub quiet buttons: "Reset Calling" and "Reset Launch" appear under the two buttons in each block as quiet underlined text, 44 px tall, and open the same dialog.
- A failed delete (DevTools, block request URL `/api/worksheets?kind=launch` for DELETE only, or take the dev server down): the dialog stays open and shows the error in amber; nothing is wiped.
- Delete the fixture by exact email, then `npm run guard` prints `clean`.

---

### Task 7: Names save on Enter, and say when they are not saved (spec 5)

**Files:**
- Create: `src/lib/personPicker.ts`
- Test: `src/lib/personPicker.test.ts`
- Modify: `src/components/people/PersonPicker.tsx` (imports, state and two refs, `pick`, the name split, `onEnter` and a refocus effect, the input, the two list buttons, a hint line)

**Interfaces:**
- Consumes: `type Person` from `@/lib/people`. The existing `send("POST" | "PATCH", body)` inside `PersonPicker` (same `/api/people` calls as today).
- Produces (from `src/lib/personPicker.ts`):
  - `UNSAVED_HINT = "Not saved yet. Press Enter or tap Add."`
  - `splitName(query: string): { firstName: string; lastName: string | null } | null`
  - `type EnterChoice = { kind: "nothing" } | { kind: "existing"; person: Person } | { kind: "already"; person: Person } | { kind: "add"; firstName: string; lastName: string | null }`
  - `enterChoice(query: string, people: Person[], isListed: (p: Person) => boolean): EnterChoice`
  - `unsavedHint(query: string, focused: boolean): string | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/personPicker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Metric, Person } from "./people";
import { enterChoice, splitName, UNSAVED_HINT, unsavedHint } from "./personPicker";

const person = (id: string, firstName: string, lastName: string | null, metrics: Metric[] = []): Person => ({
  id,
  firstName,
  lastName,
  spaces: [],
  metrics,
  invitee: false,
  icnu: null,
  networkPersonId: null,
});

const sam = person("p1", "Sam", "Lee");
const jo = person("p2", "Jo", null, ["pathways"]);
const onPathways = (p: Person) => p.metrics.includes("pathways");

describe("enterChoice", () => {
  it("does nothing for a blank field", () => {
    expect(enterChoice("   ", [sam], onPathways)).toEqual({ kind: "nothing" });
  });
  it("adds a new name, split like the Add button splits it", () => {
    expect(enterChoice("Mary Anne Smith", [sam], onPathways)).toEqual({
      kind: "add",
      firstName: "Mary",
      lastName: "Anne Smith",
    });
    expect(enterChoice(" Priya ", [sam], onPathways)).toEqual({ kind: "add", firstName: "Priya", lastName: null });
    expect(splitName("  ")).toBeNull();
  });
  it("tags an exact existing match instead of adding a second person, ignoring case and spaces", () => {
    expect(enterChoice("  sam   LEE ", [sam, jo], onPathways)).toEqual({ kind: "existing", person: sam });
  });
  it("reports an exact match already on this list, preferring a same-named person who is not", () => {
    expect(enterChoice("jo", [sam, jo], onPathways)).toEqual({ kind: "already", person: jo });
    const otherJo = person("p3", "Jo", null);
    expect(enterChoice("Jo", [jo, otherJo], onPathways)).toEqual({ kind: "existing", person: otherJo });
  });
  it("adds rather than tags when the name only partly matches someone", () => {
    expect(enterChoice("Sam", [sam], onPathways)).toEqual({ kind: "add", firstName: "Sam", lastName: null });
  });
});

describe("unsavedHint", () => {
  it("shows only when the field has text and has lost focus", () => {
    expect(unsavedHint("Sam", false)).toBe(UNSAVED_HINT);
    expect(unsavedHint("Sam", true)).toBeNull();
    expect(unsavedHint("  ", false)).toBeNull();
    expect(UNSAVED_HINT).toBe("Not saved yet. Press Enter or tap Add.");
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/personPicker.test.ts`
Expected: FAIL: "Failed to resolve import ./personPicker".

- [ ] **Step 3: Write the rules**

Create `src/lib/personPicker.ts`:

```ts
// PersonPicker's typed-name rules (round 3 spec 5). Pure. Enter must do
// what the leader expects: tag an exact existing match (as picking the
// suggestion does), or add the typed name (as the Add button does). A
// typed name that was never saved says so once the field loses focus.
import type { Person } from "@/lib/people";

export const UNSAVED_HINT = "Not saved yet. Press Enter or tap Add.";

export type EnterChoice =
  | { kind: "nothing" }
  | { kind: "existing"; person: Person }
  | { kind: "already"; person: Person }
  | { kind: "add"; firstName: string; lastName: string | null };

// "Mary Anne Smith" is first name Mary, last name "Anne Smith"; one word
// has no last name. The Add button uses this too.
export function splitName(query: string): { firstName: string; lastName: string | null } | null {
  const [first, ...rest] = query.trim().split(/\s+/);
  if (!first) return null;
  return { firstName: first, lastName: rest.join(" ") || null };
}

function normalised(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// isListed: already carries this picker's tag, or is excluded (the launch
// team's current members). Among exact matches, one not yet listed wins.
export function enterChoice(query: string, people: Person[], isListed: (p: Person) => boolean): EnterChoice {
  const q = normalised(query);
  if (!q) return { kind: "nothing" };
  const exact = people.filter((p) => normalised(`${p.firstName} ${p.lastName ?? ""}`) === q);
  const unlisted = exact.find((p) => !isListed(p));
  if (unlisted) return { kind: "existing", person: unlisted };
  if (exact.length > 0) return { kind: "already", person: exact[0] };
  const name = splitName(query);
  if (!name) return { kind: "nothing" };
  return { kind: "add", ...name };
}

export function unsavedHint(query: string, focused: boolean): string | null {
  return !focused && query.trim().length > 0 ? UNSAVED_HINT : null;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/personPicker.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Enter and the hint in PersonPicker**

In `src/components/people/PersonPicker.tsx`, replace:

```tsx
import { useMemo, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { Metric, Person, Space } from "@/lib/people";
```

with:

```tsx
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { Metric, Person, Space } from "@/lib/people";
import { enterChoice, splitName, unsavedHint } from "@/lib/personPicker";
```

Replace the component comment:

```tsx
// Type a name: pick someone already on My People to tag them, or add a new
// person with the tag already applied. One person record, many features.
```

with:

```tsx
// Type a name: pick someone already on My People to tag them, or add a new
// person with the tag already applied. One person record, many features.
// Enter does the same as tapping (round 3 spec 5), and a typed name that
// was never saved says so when the field loses focus.
```

Replace:

```tsx
  const [error, setError] = useState<string | null>(null);
```

with:

```tsx
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  // Set while a request started by Enter runs, so a second Enter (or a held
  // key) before the field is disabled cannot add the same person twice.
  const enterBusyRef = useRef(false);
  // Set when Enter sent a request: the field is disabled while it runs and
  // loses focus, so it gets focus back once busy clears (the effect below).
  const refocusRef = useRef(false);
```

Replace the `pick` function:

```tsx
  const pick = (p: Person) => {
    if (tag.kind === "none") {
      setError(null);
      onChange(p);
      setQuery("");
      return;
    }
    void send("PATCH", { id: p.id, ...tagPatch(p, tag) });
  };

  const [first, ...rest] = query.trim().split(/\s+/);
```

with:

```tsx
  const pick = (p: Person): Promise<void> => {
    if (tag.kind === "none") {
      setError(null);
      onChange(p);
      setQuery("");
      return Promise.resolve();
    }
    return send("PATCH", { id: p.id, ...tagPatch(p, tag) });
  };

  const name = splitName(query);
  const add = () =>
    name ? send("POST", { firstName: name.firstName, lastName: name.lastName, ...tagCreate(tag) }) : Promise.resolve();

  // Enter: tag an exact match not yet on this list, clear an exact match
  // already on it, otherwise add the typed name. One request at a time.
  const onEnter = () => {
    if (busy || enterBusyRef.current) return;
    const choice = enterChoice(query, people, (p) => hasTag(p, tag) || (exclude?.includes(p.id) ?? false));
    if (choice.kind === "nothing") return;
    if (choice.kind === "already") {
      setError(null);
      setQuery("");
      return;
    }
    if (choice.kind === "existing" && tag.kind === "none") {
      void pick(choice.person); // no request, so the field keeps focus
      return;
    }
    enterBusyRef.current = true;
    refocusRef.current = true;
    const done = choice.kind === "existing" ? pick(choice.person) : add();
    void done.finally(() => {
      enterBusyRef.current = false;
    });
  };

  // The field is enabled again only after React re-renders with busy false,
  // so focus it here rather than when the request's promise settles.
  useEffect(() => {
    if (busy || !refocusRef.current) return;
    refocusRef.current = false;
    inputRef.current?.focus();
  }, [busy]);

  const hint = busy ? null : unsavedHint(query, focused);
```

Replace the input:

```tsx
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a name"
        disabled={busy}
```

with:

```tsx
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          e.preventDefault();
          onEnter();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby={hint ? hintId : undefined}
        placeholder="Type a name"
        disabled={busy}
```

Replace the suggestion button:

```tsx
                onClick={() => pick(p)}
                className="w-full text-left px-3 py-2 text-gray-200 hover:text-white"
```

with:

```tsx
                onClick={() => void pick(p)}
                className="w-full min-h-[44px] text-left px-3 py-2 text-gray-200 hover:text-white"
```

Replace the Add button:

```tsx
              disabled={busy || !first}
              onClick={() => send("POST", { firstName: first, lastName: rest.join(" ") || null, ...tagCreate(tag) })}
              className="w-full text-left px-3 py-2 text-[var(--accent)]"
```

with:

```tsx
              disabled={busy || !name}
              onClick={() => void add()}
              className="w-full min-h-[44px] text-left px-3 py-2 text-[var(--accent)]"
```

Replace:

```tsx
      {error && <p className="text-red-400 text-xs">{error}</p>}
```

with:

```tsx
      {hint && (
        <p id={hintId} className="text-xs text-[var(--muted)]">
          {hint}
        </p>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
```

(`send`, `hasTag`, `tagPatch`, `tagCreate`, `untagPatch` and the `/api/people` requests are unchanged.)

- [ ] **Step 6: Run the gates**

`npx tsc --noEmit` clean, `npm test` 313 passing (307 + 6), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/personPicker.ts src/lib/personPicker.test.ts src/components/people/PersonPicker.tsx
git commit -m "Avenue at night 3: Enter saves a typed name; unsaved names say so

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

`npm run guard` prints `clean` first. With a fixture leader, at 375 px and desktop, `/leaders/training?phase=phase4`, open Church health:
- Under Pathways type a new name ("Fixture Enter") and press Enter: it joins the Pathways list, the count goes up by one and glows, the field empties and keeps focus. Reload: still listed. Read it back from the database:

```bash
node --env-file=.env.local -e "import('./scripts/lib/fixtures.mjs').then(async ({ db }) => { const { data, error } = await db.from('leader_people').select('first_name,last_name,metrics').eq('owner_email', process.argv[1]); if (error) throw error; console.log(JSON.stringify(data)); })" "FIXTURE_EMAIL@example.invalid"
```

(replace `FIXTURE_EMAIL@example.invalid` with the fixture's exact email). Expected: the row for "Fixture" / "Enter" with `metrics` holding `pathways`.
- Under Streetlights type "Fixture Double" and press Enter twice quickly, then type "Fixture Held" and hold Enter for a second: the query above shows exactly one "Fixture" / "Double" row and one "Fixture" / "Held" row.
- Under Intersections type "fixture enter" (any case) and press Enter: the same person is tagged, not a second person (the query above shows one row, now with both metrics).
- Type "Half typed" under Streetlights and Tab away: "Not saved yet. Press Enter or tap Add." shows under the field in muted text. Focus back and it goes away. Tapping "Add ... to My People" still works and the suggestion rows are 44 px tall.
- `/leaders/training/launch`, Launch team step: type a new name and press Enter; the person joins the team as the Add button would.
- Delete the fixture by exact email, then `npm run guard` prints `clean`.

---

### Task 8: Final pass (controller-run)

**Files:** none new. Fixes found here go in their own small commits with exact paths.

- [ ] **Step 1: Gates on the whole branch**

With the dev server stopped:

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
npm run guard
```

Expected: tsc prints nothing; 313 tests pass; lint at most 54 problems; build passes; guard prints `clean`.

- [ ] **Step 2: The end-to-end auth check**

With `npm run dev` running: `node --env-file=.env.local scripts/check-auth.mjs` ends `all passed`, then `npm run guard` prints `clean`.

- [ ] **Step 3: Protected files untouched, allowed ones only as planned**

```bash
git diff --stat main...HEAD -- src/app/leaders/training/useTrainingProgress.ts src/app/leaders/training/progressMerge.ts src/lib/journey.ts src/app/leaders/training/useCheckins.ts src/app/leaders/training/useNetworkView.ts src/lib/useMyPeople.ts src/lib/auth.ts src/lib/requireLeader.ts src/lib/worksheets.ts
git diff --name-only main...HEAD -- src/app/api
git diff main...HEAD -- src/lib/useWorksheet.ts | grep "^-" | grep -v "^---"
```

Expected: no output from the first; only `src/app/api/worksheets/route.test.ts` and `src/app/api/worksheets/route.ts` from the second; exactly the two removed lines named in Task 6 Step 5 from the third. Read the `route.ts` diff: `GET` and `PATCH` unchanged.

- [ ] **Step 4: No em dashes, and every new copy line is marked**

```bash
git diff main...HEAD | grep "^+" | python -c "import sys; print(sys.stdin.read().count(chr(0x2014)))"
python -c "print(open('docs/superpowers/plans/2026-09-24-avenue-night-3.md', encoding='utf-8').read().count(chr(0x2014)))"
git diff main...HEAD | grep "^+" | grep -c "Henry to check wording"
```

Expected: `0`, `0`, and `9` (all in `src/lib/worksheetReset.ts`: the "This wipes:" lead, three wiped lines and the kept line for each kind).

- [ ] **Step 5: Whole-journey browser pass**

At 375 px and desktop, reduced motion on and off, with a fixture leader: `/leaders` (dashboard map, breathing Growth lamp once checked in), `/leaders/training` every phase (thumbnails, module dots, Calling and Launch dots with the current label underlined, quiet reset buttons, Church health Enter and hint, Growth and Multiply "Ongoing"), both wizards (dots, Arena months), Calling Profile and Launch Plan (reset at the foot, print preview unchanged with no reset button). Keyboard: through one reset dialog (Cancel focused, Escape, focus return), one wizard dot row, one PersonPicker Enter. Delete the fixture by exact email, then `npm run guard` prints `clean`.

- [ ] **Step 6: Update the ledger**

Mark every task done in `.superpowers/sdd/avenue-night-3/progress.md` with its commit hash and review verdict. Do not push.
