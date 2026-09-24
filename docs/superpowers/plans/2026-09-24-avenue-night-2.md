# Avenue at Night, Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Act on Henry's review of the live "Avenue at night" build: a small profile photo in every leader header that opens the profile in a panel, smaller phase titles with "Read more" intros, Growth as two expanders (Leader health with coloured RPMS sliders, a month calendar and a 12-week trend; Church health), a plain-words Arena scoring card, Multiply with people first, and Leader Support and Workshop Hub moved to Admin.

**Architecture:** Every rule that decides anything (gauge list and copy, Growth and Multiply summaries, avatar initials, the calendar month grid and its bounds, the chart's point and gap mapping) is a pure module under `src/lib/` with Vitest tests. Small presentational components live in `src/components/avenue/` (shared pieces) and `src/components/growth/` (the Recent weeks pieces). Screens swap markup only; no hook, API route, save path, data shape or completion rule changes. ProfileCard is reused as is inside a native `<dialog>` panel.

**Tech Stack:** Next.js 16 (App Router, React Compiler on), React 19, TypeScript, Tailwind 4, Vitest 4 (node environment, `src/**/*.test.ts` only, so components are checked by tsc, lint, build and the controller's browser pass), lucide-react. No chart library.

**Spec (binding):** `docs/superpowers/specs/2026-09-24-avenue-night-2-design.md`. Its parent `docs/superpowers/specs/2026-09-24-avenue-night-design.md` still applies unless round 2 says otherwise. House style follows the first round's plan `docs/superpowers/plans/2026-09-24-avenue-night.md`. Read the round 2 spec before starting any task.

## Global Constraints

- **Branch `feat/avenue-night-2`.** It exists and holds the round 2 spec commit.
- **Never `git push`.** Commit locally only. Henry says "push" when he wants a deploy.
- **Never `git add`** `HANDOVER.md`, `HANDOVER-v2.md`, `HANDOVER_PROMPT*.md` (any `HANDOVER*.md`), `.mcp.json`, `scripts/demo-network.mjs`. Always `git add` exact paths, never `git add -A` or `git add .`.
- **Presentation only.** Do not change saving, auth, API calls, data shape, completion rules, or `useTrainingProgress.ts` / `progressMerge.ts` (no edit to either file on this branch). Do not change `src/lib/journey.ts`, `src/lib/useWorksheet.ts`, `useCheckins.ts`, `useNetworkView.ts`, `useMyPeople.ts`, `src/lib/auth.ts`, or any `src/app/api/**` file. Reading their values is fine. ProfileCard's load and save behaviour stays exactly as it is (it is reused inside the new panel; the only edits to it are importing `initialsOf` from `src/lib/profileAvatar.ts` and removing the `collapsible` prop and its collapsed branch, which have no caller left once the dashboard card goes: pre-flight F2).
- **Print output of the Calling Profile and Launch Plan stays black on white**, with the same boxes and the same content as today (`@media print` rules in `globals.css`). The header avatar never prints.
- **Never use an em dash (U+2014)** anywhere: code, comments, UI copy, commit messages, this plan. Use a colon, a comma, or a new sentence. En dashes (U+2013) only in number ranges. In tests build an em dash with `String.fromCharCode(0x2014)`; never type one (the Write tool turns a backslash-u 2014 escape into the real character).
- **New copy is exactly the spec's wording.** Each new intro or meaning line carries the code comment `// Henry to check wording` on the line above it. No other new content.
- **Respect `prefers-reduced-motion`.** No new animation. The only motion added is a chevron rotation, written with `motion-safe:transition-transform` so it does not animate under reduced motion.
- **Colour meaning:** blue `#4f7cff` (`--accent`) = you are here, primary buttons, current week ring. Warm lamp `#ffc56b` (`--lamp`) = walked, done, lit, "checked in". Glow only on light. No gradients. **One exception (spec 3.1):** the four gauge colours, defined once as CSS variables `--g-relational` `#ff8fa3`, `--g-physical` `#6fdca0`, `--g-mental` `#7cc7ff`, `--g-spiritual` `#b9a2ff`, used only inside Growth (sliders, calendar bars, trend lines, week detail). Every other text colour comes from tokens (`--ink`, `--ink-2`, `--muted`, `--dim`, `--accent`, `--lamp`).
- **Type:** Newsreader (`font-serif`) for phase titles, expander headings, section headings and big numbers; Geist for everything else. Uppercase mono only for small status labels (`.night-label`).
- **Mobile first at 375 px:** single column, 16 px side gutter, no horizontal page scroll, every tap target at least 44 px, keyboard focus ring in lamp colour (from `.avenue-night :focus-visible`, extended to the new `.av-sheet`).
- **`.panel` gotcha:** `.panel` and `.avenue-night .panel` set unlayered border colours, so a Tailwind border colour utility on a `.panel` needs the Tailwind 4 `!` suffix.
- **No staging DB.** This branch writes nothing new. If the controller signs in a test leader for browser checks, fixtures use only `@example.invalid` emails, deleted by exact email, and `npm run guard` must print `clean` before and after.
- **Gates at the end of every task** (the implementer runs 1 to 4; stop the dev server before 4 because it shares `.next`):
  1. `npx tsc --noEmit` prints nothing.
  2. `npm test`: 230 passing at the start of the branch; the count only goes up (each task states its expected count).
  3. `npm run lint`: 54 problems at the start. Never above 54. If a task removes an unused import and the count drops, record the new number in the report; do not chase lint elsewhere.
  4. `npm run build` passes.
- **Commits** end with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Browser checks are the controller's job.** Implementers have no browser. Each UI task ends with a "Controller browser check" step listing exactly what to look at, at 375 px and desktop, with keyboard checks where the task adds controls.
- Use the Write tool for any file over a few lines; heredocs through Bash mangle backslashes. Keep scratch `.mjs` / `.txt` files out of `src/` and out of lint.

## Decisions made while planning (spec gaps)

| Where | Decision | Why |
|---|---|---|
| Spec 1, which pages | Avatar on the dashboard, journey hub, Calling and Launch wizards, Calling Profile, Launch Plan, and the Network, Resources, Study Guides and Support pages. Not on Admin or the Workshop pages | Only the hub has a true pill header; the other leader pages have a plain header with the leader's name. Admin is behind its own key and the Workshop pages are presenter screens. Support keeps the avatar: leaders still use it and it has leader auth only (pre-flight F11) |
| Spec 1, panel | Native `<dialog>` with `showModal()`: Escape, focus trap and top layer come from the browser. A click outside the sheet's box (on the backdrop) also closes it; a click on empty space inside the sheet does not (pre-flight F3). Escape discarding an unsaved edit is accepted as native behaviour. Closing refocuses the avatar and re-reads the photo | A saved new photo shows in the header without a reload; no custom focus trap to get wrong |
| Spec 1, photo source | The avatar reads `GET /api/leader-profile` (the endpoint ProfileCard already reads). If it fails, the initials show and the error goes to `console.error` | No new endpoint or data. The initials are an honest state, not a silent fake. This is a new read-only call site of an existing endpoint (same auth; the dashboard already made this read); accepted, and the Task 4 report notes it (pre-flight F7) |
| Spec 2 | Title 40 px on phones, 64 px from `md`; the small (wizard) title rule is untouched | Spec 2 numbers |
| Spec 3, Recent weeks | Recent weeks sits inside the Leader health expander, under the check-in | It is RPMS history; Church health has no weeks |
| Spec 3, default open | Decided once, the first time check-ins load. Also opens when the check-in failed to load, so the "Try again" prompt is visible. Saving does not close it | "Opens by default when this week's check-in is not saved yet" |
| Spec 3, closed summaries while loading | "Loading..." while the data is loading, "Could not load" on error | A summary must never claim "Not checked in" before the data has arrived |
| Spec 3, closed summary while saving | Leader health's closed summary reads "Saving..." while a save is in flight and "Could not save. Open to try again." after a failed save, via `leaderHealthStatus` (pre-flight F4) | Closing the expander unmounts the Save button's own state, so a failure must not hide behind "Not checked in this week" |
| Spec 3 | The "Four gauges from Dave Ferguson's Multiplier" line in the check-in card is removed; the Leader health intro now says it. The hub's "Checked in this week / Not yet this week" label is removed; the closed summary says it | No repeated lines |
| Spec 3.2, chart taps | Each of the 12 weeks is a full-height transparent button column over the chart (about 28 px wide at 375 px, 150 px tall). The calendar rows are the full-size, keyboard-first route to the same detail | Twelve 44 px columns cannot fit in 343 px. The below-44 px width is accepted (pre-flight F10) |
| Spec 3.2, x labels | Every third week is labelled, counting back from this week (4 labels) | Twelve labels overlap at 375 px |
| Spec 3.2, calendar | Future weeks in the current month show but are disabled. The selected week gets the raised night background; the current week keeps its blue ring | Nothing to show for a week that has not happened |
| Spec 4 | The meanings and the Arena intro live in `src/lib/arena.ts` beside `COUNTER_KEYS`, pinned by one test | One place for the counter vocabulary |
| Spec 5 | The Paul and Timothy teaching is the Multiply phase's `phase.subtitle` plus `phase.description` from `phases.ts`, moved (not copied) into "Why multiply?" | Spec 5 "move behind" |
| Spec 5 | The empty-list instruction ("No one yet. Add someone you're apprenticing, then tap their name...") stays; it is an instruction, not one of the "sending nobody yet" lines | It tells a new leader what tapping a name does |
| Spec 5b | The Admin link row sits at the top of the unlocked Admin view (after the admin key), not on the lock screen | Keeps admin tools behind the admin key as today; no auth change |

## Pre-flight rulings

From `.superpowers/sdd/avenue-night-2/preflight.md`, all accepted by the controller. Each is already folded into its task below.

- **F1 (Task 3):** the base `.av-phase-title` keeps `line-height: 0.92`, so the small (wizard, Profile, Plan) title is truly unchanged.
- **F2 (Task 4):** ProfileCard loses the now-dead `collapsible` prop, its `open` state, collapsed branch, collapse button and `ChevronUp` import.
- **F3 (Task 4):** the panel closes on a click only when it lands outside the sheet's bounding box; Escape discarding an edit is accepted.
- **F4 (Tasks 1, 5):** `leaderHealthStatus` makes Leader health's closed summary say "Saving..." or "Could not save. Open to try again."; 2 new tests.
- **F5 (Task 4):** "Welcome, {name}" becomes `hidden sm:inline` on Resources, Study Guides and Support; the Profile and Plan top rows get `flex-wrap gap-2`.
- **F6 (Task 9):** build as specced (Henry: "remove everywhere"); the report notes that pending leaders have no in-app booking link.
- **F7 (Task 4):** the avatar's read of `/api/leader-profile` is accepted as a read-only call site; the report notes it.
- **F8 (Task 5):** the duplicated metric count stays (unchanged old code); no refactor.
- **F9 (Task 3):** ClampedText also measures once after `document.fonts.ready`.
- **F10 (Task 6):** the about 28 px chart columns are accepted; the calendar rows are the full-size route.
- **F11 (decisions):** the Workshop rationale now reads "presenter screens"; Support keeps its avatar.
- **F12 (Task 5):** Expander's button holds only the title and chevron; intro and summary sit below it and are linked with `aria-describedby`.

## File map

| File | Status | Task | Responsibility |
|---|---|---|---|
| `src/lib/rpms.ts` | Create | 1 | The four gauges: key, label, letter, colour variable, meaning line |
| `src/lib/rpms.test.ts` | Create | 1 | Tests |
| `src/lib/phaseSummaries.ts` | Create | 1 | Growth intros, Leader and Church health closed summaries, save-state summary, default-open rule, Multiply summary |
| `src/lib/phaseSummaries.test.ts` | Create | 1 | Tests |
| `src/lib/profileAvatar.ts` | Create | 1 | `initialsOf`, `avatarFromProfileResponse` |
| `src/lib/profileAvatar.test.ts` | Create | 1 | Tests |
| `src/lib/checkinCalendar.ts` | Create | 2 | Month grid (Monday first), check-in per week, current and future flags, month bounds and navigation, week label |
| `src/lib/checkinCalendar.test.ts` | Create | 2 | Tests |
| `src/lib/checkinChart.ts` | Create | 2 | Chart box, x and y mapping, per-gauge segments split at missed weeks, path string, label indexes |
| `src/lib/checkinChart.test.ts` | Create | 2 | Tests |
| `src/app/globals.css` | Modify | 3, 4, 5 | Smaller phase title (3); `.av-sheet` panel (4); gauge variables and `.av-range` slider (5) |
| `src/components/avenue/ClampedText.tsx` | Create | 3 | Two-line clamp with Read more / Show less |
| `src/app/leaders/training/page.tsx` | Modify | 3, 4, 5, 8 | ClampedText (3); avatar (4); Growth props, label removed (5); Multiply label removed, teaching moved (8) |
| `src/components/avenue/HeaderAvatar.tsx` | Create | 4 | 44 px avatar button plus the profile panel |
| `src/components/ui/ProfileCard.tsx` | Modify | 4 | Import `initialsOf` from the lib; remove the dead `collapsible` branch (no behaviour change for any caller) |
| `src/app/leaders/page.tsx` | Modify | 4, 9 | Avatar in header, collapsed ProfileCard removed (4); Support and Workshop Hub removed from Tools, pending-access link removed (9) |
| `src/components/journey/WizardShell.tsx` | Modify | 4 | New `user` prop, avatar at the right of the top row |
| `src/app/leaders/training/calling/page.tsx` | Modify | 4 | Pass `user` to WizardShell |
| `src/app/leaders/training/launch/page.tsx` | Modify | 4 | Pass `user` to WizardShell |
| `src/app/leaders/training/calling/profile/page.tsx` | Modify | 4 | Avatar beside the Print button |
| `src/app/leaders/training/launch/plan/page.tsx` | Modify | 4 | Avatar beside the Print button |
| `src/app/leaders/network/page.tsx` | Modify | 4 | Avatar in header |
| `src/app/leaders/resources/page.tsx` | Modify | 4 | Avatar in header |
| `src/app/leaders/study-guides/page.tsx` | Modify | 4 | Avatar in header |
| `src/app/leaders/support/page.tsx` | Modify | 4 | Avatar in header |
| `src/components/avenue/Expander.tsx` | Create | 5 | Button-row expander: serif heading, intro, closed summary |
| `src/app/leaders/training/growth/RpmsSlider.tsx` | Create | 5 | One gauge's coloured 1 to 10 range input |
| `src/app/leaders/training/Phase4Growth.tsx` | Modify | 5 | Leader health and Church health expanders, sliders |
| `src/components/ui/CheckinHistory.tsx` | Rewrite | 6 | Recent weeks: calendar, trend, week detail (keeps the `CheckinEntry` export) |
| `src/components/growth/CheckinCalendar.tsx` | Create | 6 | Month calendar with month navigation |
| `src/components/growth/CheckinTrend.tsx` | Create | 6 | 12-week SVG line chart with tap columns |
| `src/components/growth/WeekDetail.tsx` | Create | 6 | A week's four scores and sentence |
| `src/lib/arena.ts` | Modify | 7 | `ARENA_SCORE_INTRO`, `COUNTER_MEANINGS` |
| `src/lib/arena.test.ts` | Modify | 7 | One test |
| `src/app/leaders/training/launch/ArenaStep.tsx` | Modify | 7 | "How the Arena keeps score" card, meaning under each counter |
| `src/app/leaders/training/Phase5Multiply.tsx` | Modify | 8 | People first, summary line, family tree link, "Why multiply?" |
| `src/app/leaders/training/calling/ConversationStep.tsx` | Modify | 9 | Leader Support link removed |
| `src/app/leaders/training/calling/content.ts` | Modify | 9 | `supportLink` removed |
| `src/app/leaders/admin/page.tsx` | Modify | 9 | Leader Support and Workshop Hub link row |

Expected test count: 230 at the start, 251 after Task 1, 267 after Task 2, 268 after Task 7 (final).

---

### Task 1: Gauges, Growth and Multiply summaries, avatar initials (pure, TDD)

**Files:**
- Create: `src/lib/rpms.ts`, `src/lib/rpms.test.ts`
- Create: `src/lib/phaseSummaries.ts`, `src/lib/phaseSummaries.test.ts`
- Create: `src/lib/profileAvatar.ts`, `src/lib/profileAvatar.test.ts`

**Interfaces:**
- Consumes: `METRICS`, `type Person` from `src/lib/people.ts`.
- Produces:
  - `rpms.ts`: `type GaugeKey = "relational" | "physical" | "mental" | "spiritual"`; `interface GaugeScores { relational: number; physical: number; mental: number; spiritual: number }`; `interface Gauge { key: GaugeKey; label: string; letter: string; colour: string; meaning: string }` (`colour` is a CSS value such as `"var(--g-relational)"`); `const GAUGES: readonly Gauge[]` in check-in order.
  - `phaseSummaries.ts`: `LEADER_HEALTH_INTRO: string`, `CHURCH_HEALTH_INTRO: string`, `NOT_CHECKED_IN: string`, `leaderHealthSummary(checkins: (GaugeScores & { weekStart: string })[], currentWeekStart: string): string`, `leaderHealthStartsOpen(checkins: { weekStart: string }[], currentWeekStart: string): boolean`, `SAVING: string`, `SAVE_FAILED: string`, `leaderHealthStatus(summary: string, saving: boolean, saveError: string | null): string`, `churchHealthSummary(people: Pick<Person, "metrics">[]): string`, `multiplySummary(depth: { people: number; generations: number }): string`.
  - `profileAvatar.ts`: `initialsOf(name: string): string`, `interface AvatarSummary { name: string; avatarUrl: string }`, `avatarFromProfileResponse(json: unknown, fallbackName: string): AvatarSummary`.

- [ ] **Step 1: Write the failing tests for the gauges**

`src/lib/rpms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GAUGES } from "./rpms";

describe("GAUGES", () => {
  it("lists the four gauges in check-in order with their letters", () => {
    expect(GAUGES.map((g) => g.key)).toEqual(["relational", "physical", "mental", "spiritual"]);
    expect(GAUGES.map((g) => g.label)).toEqual(["Relational", "Physical", "Mental", "Spiritual"]);
    expect(GAUGES.map((g) => g.letter)).toEqual(["R", "P", "M", "S"]);
  });
  it("carries the spec's meaning line and a colour variable per gauge", () => {
    expect(GAUGES.map((g) => g.meaning)).toEqual([
      "Your closest relationships: family, friends, team",
      "Sleep, food, movement, rest",
      "Focus, stress, emotional load",
      "Time with God, prayer, the Word",
    ]);
    expect(GAUGES.map((g) => g.colour)).toEqual([
      "var(--g-relational)",
      "var(--g-physical)",
      "var(--g-mental)",
      "var(--g-spiritual)",
    ]);
  });
  it("contains no em dash", () => {
    expect(JSON.stringify(GAUGES)).not.toContain(String.fromCharCode(0x2014));
  });
});
```

- [ ] **Step 2: Write the failing tests for the summaries**

`src/lib/phaseSummaries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CHURCH_HEALTH_INTRO,
  churchHealthSummary,
  LEADER_HEALTH_INTRO,
  leaderHealthStartsOpen,
  leaderHealthStatus,
  leaderHealthSummary,
  multiplySummary,
  NOT_CHECKED_IN,
  SAVE_FAILED,
  SAVING,
} from "./phaseSummaries";

const week = (weekStart: string, relational: number, physical: number, mental: number, spiritual: number) => ({
  weekStart,
  relational,
  physical,
  mental,
  spiritual,
});

describe("leaderHealthSummary", () => {
  it("shows this week's four scores", () => {
    const checkins = [week("2026-09-21", 7, 5, 6, 8), week("2026-09-14", 1, 1, 1, 1)];
    expect(leaderHealthSummary(checkins, "2026-09-21")).toBe("This week: R 7 · P 5 · M 6 · S 8");
  });
  it("says not checked in when only older weeks exist", () => {
    expect(leaderHealthSummary([week("2026-09-14", 7, 5, 6, 8)], "2026-09-21")).toBe(NOT_CHECKED_IN);
    expect(NOT_CHECKED_IN).toBe("Not checked in this week");
  });
});

describe("leaderHealthStartsOpen", () => {
  it("opens when this week's check-in is not saved yet", () => {
    expect(leaderHealthStartsOpen([], "2026-09-21")).toBe(true);
    expect(leaderHealthStartsOpen([{ weekStart: "2026-09-14" }], "2026-09-21")).toBe(true);
  });
  it("starts closed once this week is saved", () => {
    expect(leaderHealthStartsOpen([{ weekStart: "2026-09-21" }], "2026-09-21")).toBe(false);
  });
});

describe("leaderHealthStatus", () => {
  it("says a save is in flight, and a failed save wins over the scores", () => {
    expect(leaderHealthStatus(NOT_CHECKED_IN, true, null)).toBe(SAVING);
    expect(SAVING).toBe("Saving...");
    expect(leaderHealthStatus("This week: R 7 · P 5 · M 6 · S 8", false, "Network down")).toBe(SAVE_FAILED);
    expect(SAVE_FAILED).toBe("Could not save. Open to try again.");
  });
  it("passes the summary through when nothing is saving or failed", () => {
    expect(leaderHealthStatus(NOT_CHECKED_IN, false, null)).toBe(NOT_CHECKED_IN);
  });
});

describe("churchHealthSummary", () => {
  it("counts each list separately; one person can sit in more than one", () => {
    const people = [
      { metrics: ["pathways" as const, "intersections" as const] },
      { metrics: ["pathways" as const] },
      { metrics: ["pathways" as const] },
    ];
    expect(churchHealthSummary(people)).toBe("Named: 3 · 1 · 0");
  });
  it("reads zero for every list when nobody is named", () => {
    expect(churchHealthSummary([])).toBe("Named: 0 · 0 · 0");
  });
});

describe("multiplySummary", () => {
  it("says nobody is sent out yet", () => {
    expect(multiplySummary({ people: 0, generations: 0 })).toBe("Nobody sent out yet");
  });
  it("uses the singular for one person and one generation", () => {
    expect(multiplySummary({ people: 1, generations: 1 })).toBe(
      "1 person multiplying through 1 generation below you"
    );
  });
  it("uses the plural otherwise", () => {
    expect(multiplySummary({ people: 5, generations: 2 })).toBe(
      "5 people multiplying through 2 generations below you"
    );
  });
});

describe("Growth intros", () => {
  it("keeps the two intros exactly as specced, with no em dash", () => {
    expect(LEADER_HEALTH_INTRO).toBe(
      "How you are doing, in four gauges from Dave Ferguson's Multiplier. One check-in a week."
    );
    expect(CHURCH_HEALTH_INTRO).toBe(
      "Who is moving in your community, in three lists: Pathways, Intersections, Streetlights."
    );
    expect(LEADER_HEALTH_INTRO + CHURCH_HEALTH_INTRO).not.toContain(String.fromCharCode(0x2014));
  });
});
```

- [ ] **Step 3: Write the failing tests for the avatar helpers**

`src/lib/profileAvatar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { avatarFromProfileResponse, initialsOf } from "./profileAvatar";

describe("initialsOf", () => {
  it("takes the first letters of the first two words", () => {
    expect(initialsOf("sam  de la cruz")).toBe("SD");
  });
  it("takes one letter for one word", () => {
    expect(initialsOf("Henry")).toBe("H");
  });
  it("shows a question mark for a blank name", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("avatarFromProfileResponse", () => {
  it("reads the display name and photo from the profile", () => {
    expect(
      avatarFromProfileResponse({ profile: { display_name: "Sam Lee", avatar_url: "data:image/jpeg;base64,AA" } }, "Sam")
    ).toEqual({ name: "Sam Lee", avatarUrl: "data:image/jpeg;base64,AA" });
  });
  it("falls back to the sign-in name when there is no profile yet", () => {
    expect(avatarFromProfileResponse({ profile: null }, "Sam")).toEqual({ name: "Sam", avatarUrl: "" });
    expect(avatarFromProfileResponse(null, "Sam")).toEqual({ name: "Sam", avatarUrl: "" });
  });
  it("ignores a blank name and a photo that is not a string", () => {
    expect(avatarFromProfileResponse({ profile: { display_name: "  ", avatar_url: 42 } }, "Sam")).toEqual({
      name: "Sam",
      avatarUrl: "",
    });
  });
});
```

- [ ] **Step 4: Run the tests to see them fail**

Run: `npx vitest run src/lib/rpms.test.ts src/lib/phaseSummaries.test.ts src/lib/profileAvatar.test.ts`
Expected: FAIL in all three files with "Failed to resolve import" for `./rpms`, `./phaseSummaries` and `./profileAvatar`.

- [ ] **Step 5: Write `src/lib/rpms.ts`**

```ts
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
```

- [ ] **Step 6: Write `src/lib/phaseSummaries.ts`**

```ts
import { METRICS, type Person } from "./people";
import { GAUGES, type GaugeScores } from "./rpms";

// One-line summaries shown on closed expanders (round 2 spec 3 and 5).
// Pure, so the wording and the counting are pinned by tests.

// Henry to check wording
export const LEADER_HEALTH_INTRO =
  "How you are doing, in four gauges from Dave Ferguson's Multiplier. One check-in a week.";

// Henry to check wording
export const CHURCH_HEALTH_INTRO =
  "Who is moving in your community, in three lists: Pathways, Intersections, Streetlights.";

export const NOT_CHECKED_IN = "Not checked in this week";

// "This week: R 7 · P 5 · M 6 · S 8", or NOT_CHECKED_IN. Only the week the
// form edits counts: an older check-in is not this week's.
export function leaderHealthSummary(
  checkins: (GaugeScores & { weekStart: string })[],
  currentWeekStart: string
): string {
  const entry = checkins.find((c) => c.weekStart === currentWeekStart);
  if (!entry) return NOT_CHECKED_IN;
  return `This week: ${GAUGES.map((g) => `${g.letter} ${entry[g.key]}`).join(" · ")}`;
}

// Leader health opens by default only while this week's check-in is unsaved.
export function leaderHealthStartsOpen(checkins: { weekStart: string }[], currentWeekStart: string): boolean {
  return !checkins.some((c) => c.weekStart === currentWeekStart);
}

export const SAVING = "Saving...";
export const SAVE_FAILED = "Could not save. Open to try again.";

// The closed Leader health summary while a save is in flight or has failed
// (pre-flight F4): closing the expander hides the Save button's own state,
// so a failure must not hide behind the scores or "Not checked in".
export function leaderHealthStatus(summary: string, saving: boolean, saveError: string | null): string {
  if (saving) return SAVING;
  if (saveError) return SAVE_FAILED;
  return summary;
}

// "Named: 3 · 1 · 0" in Pathways, Intersections, Streetlights order. Three
// separate lists, so one person can count in more than one.
export function churchHealthSummary(people: Pick<Person, "metrics">[]): string {
  const counts = METRICS.map((m) => people.filter((p) => p.metrics.includes(m)).length);
  return `Named: ${counts.join(" · ")}`;
}

// The Multiply summary line under the person list (spec 5).
export function multiplySummary(depth: { people: number; generations: number }): string {
  if (depth.people === 0) return "Nobody sent out yet";
  const people = `${depth.people} ${depth.people === 1 ? "person" : "people"}`;
  const generations = `${depth.generations} ${depth.generations === 1 ? "generation" : "generations"}`;
  return `${people} multiplying through ${generations} below you`;
}
```

- [ ] **Step 7: Write `src/lib/profileAvatar.ts`**

```ts
// The header avatar's two small rules (round 2 spec 1): the initials shown
// when there is no photo (the same rule ProfileCard has always used), and
// reading the name and photo out of GET /api/leader-profile's body.

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export interface AvatarSummary {
  name: string;
  avatarUrl: string;
}

export function avatarFromProfileResponse(json: unknown, fallbackName: string): AvatarSummary {
  const profile =
    json !== null && typeof json === "object" && "profile" in json ? (json as { profile: unknown }).profile : null;
  const fields: Record<string, unknown> =
    profile !== null && typeof profile === "object" ? (profile as Record<string, unknown>) : {};
  const displayName = typeof fields.display_name === "string" ? fields.display_name.trim() : "";
  return {
    name: displayName || fallbackName,
    avatarUrl: typeof fields.avatar_url === "string" ? fields.avatar_url : "",
  };
}
```

- [ ] **Step 8: Run the tests to see them pass**

Run: `npx vitest run src/lib/rpms.test.ts src/lib/phaseSummaries.test.ts src/lib/profileAvatar.test.ts`
Expected: PASS, 21 tests (3 + 12 + 6).

- [ ] **Step 9: Run the gates**

`npx tsc --noEmit` clean, `npm test` 251 passing (230 + 21), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 10: Commit**

```bash
git add src/lib/rpms.ts src/lib/rpms.test.ts src/lib/phaseSummaries.ts src/lib/phaseSummaries.test.ts src/lib/profileAvatar.ts src/lib/profileAvatar.test.ts
git commit -m "Avenue at night 2: gauges, Growth and Multiply summaries, avatar initials

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

No browser check: nothing is wired yet.

---

### Task 2: Calendar month grid and trend chart mapping (pure, TDD)

**Files:**
- Create: `src/lib/checkinCalendar.ts`, `src/lib/checkinCalendar.test.ts`
- Create: `src/lib/checkinChart.ts`, `src/lib/checkinChart.test.ts`

**Interfaces:**
- Consumes: `mondayOf`, `recentMondays` from `src/lib/weeks.ts`; `type GaugeKey`, `type GaugeScores` from `src/lib/rpms.ts` (Task 1).
- Produces:
  - `checkinCalendar.ts`: `interface MonthRef { year: number; month: number }` (month 0 to 11); `interface CalendarDay { iso: string; day: number; inMonth: boolean }`; `interface CalendarWeek<T> { weekStart: string; days: CalendarDay[]; checkin: T | null; isCurrent: boolean; isFuture: boolean }`; `interface MonthBounds { min: MonthRef; max: MonthRef }`; `monthOf(iso: string): MonthRef`; `monthOfDate(date: Date): MonthRef`; `compareMonths(a: MonthRef, b: MonthRef): number`; `shiftMonth(m: MonthRef, delta: number): MonthRef`; `canShift(view: MonthRef, delta: number, bounds: MonthBounds): boolean`; `monthWeeks<T extends { weekStart: string }>(view: MonthRef, checkins: T[], currentWeekStart: string): CalendarWeek<T>[]`; `monthBounds(checkinWeeks: string[], today: Date, historyCount?: number): MonthBounds`; `formatWeekLabel(weekStart: string, month?: "short" | "long"): string`; `monthLabel(view: MonthRef): string`.
  - `checkinChart.ts`: `interface ChartBox { width: number; height: number; padLeft: number; padRight: number; padTop: number; padBottom: number }`; `CHART_BOX: ChartBox`; `interface ChartPoint { week: string; index: number; x: number; y: number; score: number }`; `xFor(index: number, count: number, box?: ChartBox): number`; `yFor(score: number, box?: ChartBox): number`; `gaugeSegments<T extends GaugeScores & { weekStart: string }>(weeks: string[], checkins: T[], gauge: GaugeKey, box?: ChartBox): ChartPoint[][]`; `segmentPath(points: ChartPoint[]): string`; `labelIndexes(count: number, every?: number): number[]`.

Reference dates used by the tests (checked): 1 Sep 2026 is a Tuesday, so the September grid starts on Monday 31 Aug and ends with the row of Monday 28 Sep. 1 Mar 2026 is a Sunday (six rows, from Monday 23 Feb). 1 Jun 2026 is a Monday. 24 Sep 2026 is a Thursday in the week of Monday 21 Sep; twelve weeks back from that week is Monday 6 Jul 2026.

- [ ] **Step 1: Write the failing calendar tests**

`src/lib/checkinCalendar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canShift, compareMonths, monthBounds, monthWeeks, shiftMonth, type MonthBounds } from "./checkinCalendar";

const SEPT_2026 = { year: 2026, month: 8 };
const entry = (weekStart: string) => ({ weekStart, relational: 7, physical: 5, mental: 6, spiritual: 8 });

describe("monthWeeks", () => {
  it("starts September 2026 on Monday 31 August and gives five rows of seven days", () => {
    const weeks = monthWeeks(SEPT_2026, [], "2026-09-21");
    expect(weeks.map((w) => w.weekStart)).toEqual([
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
    for (const w of weeks) expect(w.days).toHaveLength(7);
    expect(weeks[0].days.map((d) => d.day)).toEqual([31, 1, 2, 3, 4, 5, 6]);
    expect(weeks[0].days[1].iso).toBe("2026-09-01");
  });
  it("marks the days that fall outside the month", () => {
    const weeks = monthWeeks(SEPT_2026, [], "2026-09-21");
    expect(weeks[0].days.map((d) => d.inMonth)).toEqual([false, true, true, true, true, true, true]);
    expect(weeks[4].days.map((d) => d.day)).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(weeks[4].days.map((d) => d.inMonth)).toEqual([true, true, true, false, false, false, false]);
  });
  it("needs six rows for March 2026, which starts on a Sunday", () => {
    const weeks = monthWeeks({ year: 2026, month: 2 }, [], "2026-09-21");
    expect(weeks.map((w) => w.weekStart)).toEqual([
      "2026-02-23",
      "2026-03-02",
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
    ]);
  });
  it("starts June 2026 on its own first day, which is a Monday", () => {
    const weeks = monthWeeks({ year: 2026, month: 5 }, [], "2026-09-21");
    expect(weeks[0].weekStart).toBe("2026-06-01");
    expect(weeks[0].days[0].inMonth).toBe(true);
    expect(weeks).toHaveLength(5);
  });
  it("attaches each week's check-in and leaves the other weeks empty", () => {
    const checkin = entry("2026-09-14");
    const weeks = monthWeeks(SEPT_2026, [checkin, entry("2026-06-01")], "2026-09-21");
    expect(weeks.map((w) => w.checkin)).toEqual([null, null, checkin, null, null]);
  });
  it("flags the current week and the weeks after it", () => {
    const weeks = monthWeeks(SEPT_2026, [], "2026-09-21");
    expect(weeks.map((w) => w.isCurrent)).toEqual([false, false, false, true, false]);
    expect(weeks.map((w) => w.isFuture)).toEqual([false, false, false, false, true]);
  });
});

describe("monthBounds", () => {
  const today = new Date(2026, 8, 24);
  it("goes back twelve weeks (to July 2026) and forward to this month when no check-in is older", () => {
    expect(monthBounds(["2026-09-14"], today)).toEqual({ min: { year: 2026, month: 6 }, max: SEPT_2026 });
  });
  it("reaches back to the month of an older check-in", () => {
    expect(monthBounds(["2026-09-21", "2026-03-02"], today)).toEqual({
      min: { year: 2026, month: 2 },
      max: SEPT_2026,
    });
  });
});

describe("month navigation", () => {
  it("shifts across the year boundary both ways", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 });
    expect(compareMonths({ year: 2026, month: 0 }, { year: 2025, month: 11 })).toBe(1);
  });
  it("stops at both bounds", () => {
    const bounds: MonthBounds = { min: { year: 2026, month: 6 }, max: SEPT_2026 };
    expect(canShift(SEPT_2026, 1, bounds)).toBe(false);
    expect(canShift(SEPT_2026, -1, bounds)).toBe(true);
    expect(canShift({ year: 2026, month: 6 }, -1, bounds)).toBe(false);
    expect(canShift({ year: 2026, month: 6 }, 1, bounds)).toBe(true);
  });
});
```

- [ ] **Step 2: Write the failing chart tests**

`src/lib/checkinChart.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gaugeSegments, labelIndexes, segmentPath, xFor, yFor, type ChartBox } from "./checkinChart";

// A box with round numbers: the plot area is 100 wide (x 10 to 110) and 90
// tall (y 0 to 90).
const BOX: ChartBox = { width: 110, height: 100, padLeft: 10, padRight: 0, padTop: 0, padBottom: 10 };
const entry = (weekStart: string, relational: number) => ({
  weekStart,
  relational,
  physical: 5,
  mental: 5,
  spiritual: 5,
});
const WEEKS = ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21"];

describe("xFor and yFor", () => {
  it("puts 10 at the top of the plot and 1 at the bottom", () => {
    expect(yFor(10, BOX)).toBe(0);
    expect(yFor(1, BOX)).toBe(90);
    expect(yFor(4, BOX)).toBe(60);
  });
  it("spreads the weeks from the left edge to the right edge, and centres a single week", () => {
    expect(xFor(0, 5, BOX)).toBe(10);
    expect(xFor(2, 5, BOX)).toBe(60);
    expect(xFor(4, 5, BOX)).toBe(110);
    expect(xFor(0, 1, BOX)).toBe(60);
  });
});

describe("gaugeSegments", () => {
  it("breaks the line at a missed week", () => {
    const checkins = [entry("2026-08-31", 10), entry("2026-09-14", 4), entry("2026-09-21", 1)];
    const segments = gaugeSegments(WEEKS, checkins, "relational", BOX);
    expect(segments.map((s) => s.map((p) => [p.week, p.index, p.score, p.y]))).toEqual([
      [["2026-08-31", 0, 10, 0]],
      [
        ["2026-09-14", 2, 4, 60],
        ["2026-09-21", 3, 1, 90],
      ],
    ]);
    expect(segments[1][0].x).toBeCloseTo(76.667, 2);
    expect(segments[1][1].x).toBe(110);
  });
  it("has no segments when there are no check-ins in the window", () => {
    expect(gaugeSegments(WEEKS, [entry("2026-01-05", 7)], "relational", BOX)).toEqual([]);
  });
});

describe("segmentPath", () => {
  it("draws a move then lines, rounded to two decimals", () => {
    const [segment] = gaugeSegments(
      ["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"],
      [entry("2026-09-14", 10), entry("2026-09-21", 1)],
      "relational",
      BOX
    );
    expect(segmentPath(segment)).toBe("M10 0 L43.33 90");
  });
});

describe("labelIndexes", () => {
  it("labels every third week counting back from this week", () => {
    expect(labelIndexes(12)).toEqual([2, 5, 8, 11]);
    expect(labelIndexes(1)).toEqual([0]);
    expect(labelIndexes(0)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/lib/checkinCalendar.test.ts src/lib/checkinChart.test.ts`
Expected: FAIL in both files with "Failed to resolve import" for `./checkinCalendar` and `./checkinChart`.

- [ ] **Step 4: Write `src/lib/checkinCalendar.ts`**

```ts
import { mondayOf, recentMondays } from "./weeks";

// The Recent weeks calendar (round 2 spec 3.2): a month grid, Monday first,
// one row per week, with each week's check-in attached. Everything is built
// from local-time Date parts, the same way weeks.ts does, so a week never
// drifts by a day in a zone behind UTC.

export interface MonthRef {
  year: number;
  month: number; // 0 to 11
}

export interface CalendarDay {
  iso: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

export interface CalendarWeek<T> {
  weekStart: string; // the row's Monday, YYYY-MM-DD
  days: CalendarDay[];
  checkin: T | null;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface MonthBounds {
  min: MonthRef;
  max: MonthRef;
}

function isoOf(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthOfDate(date: Date): MonthRef {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthOf(iso: string): MonthRef {
  return monthOfDate(parseIso(iso));
}

// Negative when a is before b, 0 when equal, positive when after.
export function compareMonths(a: MonthRef, b: MonthRef): number {
  return (a.year - b.year) * 12 + (a.month - b.month);
}

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  return monthOfDate(new Date(m.year, m.month + delta, 1));
}

export function canShift(view: MonthRef, delta: number, bounds: MonthBounds): boolean {
  const next = shiftMonth(view, delta);
  return compareMonths(next, bounds.min) >= 0 && compareMonths(next, bounds.max) <= 0;
}

// Every week that touches the month, Monday first. Days from the months
// either side are included (inMonth false) so each row has seven days.
export function monthWeeks<T extends { weekStart: string }>(
  view: MonthRef,
  checkins: T[],
  currentWeekStart: string
): CalendarWeek<T>[] {
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const lastDay = new Date(view.year, view.month + 1, 0);
  let start = parseIso(mondayOf(new Date(view.year, view.month, 1)));
  const weeks: CalendarWeek<T>[] = [];
  while (start.getTime() <= lastDay.getTime()) {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      days.push({ iso: isoOf(d), day: d.getDate(), inMonth: d.getMonth() === view.month });
    }
    const weekStart = isoOf(start);
    weeks.push({
      weekStart,
      days,
      checkin: byWeek.get(weekStart) ?? null,
      isCurrent: weekStart === currentWeekStart,
      isFuture: weekStart > currentWeekStart,
    });
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  }
  return weeks;
}

// How far the month buttons go: back to the oldest check-in or twelve weeks,
// whichever is earlier, and never past the current month.
export function monthBounds(checkinWeeks: string[], today: Date, historyCount = 12): MonthBounds {
  const recent = recentMondays(historyCount, today);
  let oldest = recent[recent.length - 1];
  for (const w of checkinWeeks) if (w < oldest) oldest = w;
  return { min: monthOf(oldest), max: monthOfDate(today) };
}

// "14 Sep" (short) or "14 September" (long).
export function formatWeekLabel(weekStart: string, month: "short" | "long" = "short"): string {
  return parseIso(weekStart).toLocaleDateString("en-AU", { day: "numeric", month });
}

// "September 2026".
export function monthLabel(view: MonthRef): string {
  return new Date(view.year, view.month, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
```

- [ ] **Step 5: Write `src/lib/checkinChart.ts`**

```ts
import type { GaugeKey, GaugeScores } from "./rpms";

// The Recent weeks trend (round 2 spec 3.2): one line per gauge over the
// last twelve weeks, y from 1 (bottom) to 10 (top). A missed week breaks
// the line, so each gauge is a list of segments rather than one path.

export interface ChartBox {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

// The SVG viewBox the component draws in: room on the left for the 1, 5 and
// 10 labels and at the bottom for the week labels.
export const CHART_BOX: ChartBox = { width: 320, height: 168, padLeft: 24, padRight: 10, padTop: 10, padBottom: 26 };

export interface ChartPoint {
  week: string;
  index: number;
  x: number;
  y: number;
  score: number;
}

export function xFor(index: number, count: number, box: ChartBox = CHART_BOX): number {
  const inner = box.width - box.padLeft - box.padRight;
  if (count <= 1) return box.padLeft + inner / 2;
  return box.padLeft + (inner * index) / (count - 1);
}

export function yFor(score: number, box: ChartBox = CHART_BOX): number {
  const inner = box.height - box.padTop - box.padBottom;
  return box.padTop + ((10 - score) / 9) * inner;
}

export function gaugeSegments<T extends GaugeScores & { weekStart: string }>(
  weeks: string[],
  checkins: T[],
  gauge: GaugeKey,
  box: ChartBox = CHART_BOX
): ChartPoint[][] {
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];
  weeks.forEach((week, index) => {
    const entry = byWeek.get(week);
    if (!entry) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    const score = entry[gauge];
    current.push({ week, index, x: xFor(index, weeks.length, box), y: yFor(score, box), score });
  });
  if (current.length > 0) segments.push(current);
  return segments;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function segmentPath(points: ChartPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${round2(p.x)} ${round2(p.y)}`).join(" ");
}

// Which weeks get an x label: every `every`th week, counting back from the
// newest (the last index), so this week is always labelled.
export function labelIndexes(count: number, every = 3): number[] {
  const out: number[] = [];
  for (let i = count - 1; i >= 0; i -= every) out.unshift(i);
  return out;
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run src/lib/checkinCalendar.test.ts src/lib/checkinChart.test.ts`
Expected: PASS, 16 tests (10 + 6).

- [ ] **Step 7: Run the gates**

`npx tsc --noEmit` clean, `npm test` 267 passing (251 + 16), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 8: Commit**

```bash
git add src/lib/checkinCalendar.ts src/lib/checkinCalendar.test.ts src/lib/checkinChart.ts src/lib/checkinChart.test.ts
git commit -m "Avenue at night 2: check-in calendar grid and trend chart mapping

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

No browser check: nothing is wired yet.

---

### Task 3: Smaller phase titles and "Read more" intros

**Files:**
- Modify: `src/app/globals.css` (the `.av-phase-title` rule, about lines 465-474)
- Create: `src/components/avenue/ClampedText.tsx`
- Modify: `src/app/leaders/training/page.tsx:330` (the `phase.description` paragraph) and the import block

**Interfaces:**
- Consumes: nothing new.
- Produces: `ClampedText` default export, props `{ text: string; className?: string }`. Task 8 uses it on the hub for every phase except Multiply.

- [ ] **Step 1: Halve the large phase title**

In `src/app/globals.css`, replace the whole `.av-phase-title` rule:

```css
.av-phase-title {
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 400;
  font-size: clamp(44px, 11vw, 120px);
  line-height: 0.92;
  letter-spacing: -0.02em;
  margin: 18px 0 22px;
  overflow-wrap: anywhere;
  color: var(--ink);
}
```

with:

```css
/* Round 2 spec 2: about half the first round's size, 40 px on phones and
   64 px from md. The small (wizard) size below is unchanged: line-height
   stays 0.92 because the small rule inherits it (pre-flight F1). */
.av-phase-title {
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 400;
  font-size: 40px;
  line-height: 0.92;
  letter-spacing: -0.02em;
  margin: 14px 0 18px;
  overflow-wrap: anywhere;
  color: var(--ink);
}
@media (min-width: 768px) {
  .av-phase-title {
    font-size: 64px;
  }
}
```

Leave `.av-opening-small .av-phase-title` exactly as it is. It comes later in the file and has higher specificity, so the wizard title keeps `clamp(40px, 7vw, 64px)` and its own margin. It does not set line-height, which is why the base rule keeps `0.92` (the only base changes are font-size and margin).

- [ ] **Step 2: Write ClampedText**

`src/components/avenue/ClampedText.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ClampedTextProps {
  text: string;
  className?: string;
}

// A phase intro clamped to two lines (round 2 spec 2) with a "Read more" /
// "Show less" button. The button only appears when the text really is cut
// off: a ResizeObserver compares the clamped height with the full height,
// and runs again whenever the width changes (rotating a phone, resizing a
// window). It also measures once the web fonts have loaded: a font swap can
// re-wrap the text without changing the clamped box, which the observer
// would miss (pre-flight F9). While expanded nothing is measured, so
// "Show less" stays put.
export default function ClampedText({ text, className = "" }: ClampedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let cancelled = false;
    const measure = () => {
      if (!cancelled) setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    // ResizeObserver reports once as soon as it starts observing, so the
    // first measurement needs no separate call.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [expanded, text]);

  return (
    <div className={className}>
      <p
        ref={ref}
        id={id}
        className={`max-w-[62ch] text-sm leading-relaxed text-[var(--muted)] ${expanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Use it on the hub**

In `src/app/leaders/training/page.tsx`, add the import after `import PhaseOpening from "@/components/avenue/PhaseOpening";`:

```tsx
import ClampedText from "@/components/avenue/ClampedText";
```

Replace line 330:

```tsx
                <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">{phase.description}</p>
```

with:

```tsx
                <ClampedText text={phase.description} className="mt-4" />
```

The section is keyed by `phase.id`, so switching phases mounts a fresh ClampedText, collapsed again.

- [ ] **Step 4: Run the gates**

`npx tsc --noEmit` clean, `npm test` 267 passing (unchanged), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/avenue/ClampedText.tsx src/app/leaders/training/page.tsx
git commit -m "Avenue at night 2: smaller phase titles, two-line intros with Read more

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Controller browser check**

At 375 px and at desktop (1280 px), on `/leaders/training`:
- Each phase title (Foundations to Multiply) is about 40 px tall on the phone and about 64 px on desktop; long names ("Foundations") fit on one line at 375 px with no horizontal scroll.
- The intro under each opening shows exactly two lines, then "Read more". Tapping it shows the whole paragraph and the button reads "Show less"; tapping again collapses. The button is at least 44 px tall and shows the lamp focus ring when reached by Tab; Enter and Space toggle it.
- Screen reader name check (read_page): the button has `aria-expanded` false then true.
- Widen the desktop window until a short intro fits in two lines (or pick a phase whose intro is short): no button shows.
- Open `/leaders/training/calling`, `/leaders/training/calling/profile` and `/leaders/training/launch/plan`: the small title has the same size and line spacing as before this task (compare with `main`).
- Cold load (hard reload, cache disabled) of `/leaders/training`: "Read more" shows under a long intro after the fonts arrive.

---

### Task 4: Profile photo in the header, profile in a panel

**Files:**
- Modify: `src/app/globals.css` (the focus-ring selector list at about line 292, and a new block just before the `/* PRINT: Calling Profile and Launch Plan */` banner at about line 586)
- Create: `src/components/avenue/HeaderAvatar.tsx`
- Modify: `src/components/ui/ProfileCard.tsx` (lines 86-90: local `initialsOf` replaced by the lib import; lines 15, 107-116, 234-250, 452-461: the dead `collapsible` branch removed, pre-flight F2)
- Modify: `src/app/leaders/page.tsx` (header, and the "My Profile" block at lines 211-214)
- Modify: `src/app/leaders/training/page.tsx` (the import block and the pill header, lines 240-261 before Task 3's one-line import)
- Modify: `src/components/journey/WizardShell.tsx` (props and the top row, lines 18-29 and 62-67)
- Modify: `src/app/leaders/training/calling/page.tsx:34` and its `<WizardShell` call
- Modify: `src/app/leaders/training/launch/page.tsx` (its `<WizardShell` call)
- Modify: `src/app/leaders/training/calling/profile/page.tsx:57` and the top row
- Modify: `src/app/leaders/training/launch/plan/page.tsx` (the top row)
- Modify: `src/app/leaders/network/page.tsx`, `src/app/leaders/resources/page.tsx`, `src/app/leaders/study-guides/page.tsx`, `src/app/leaders/support/page.tsx` (headers)

**Interfaces:**
- Consumes: `initialsOf`, `avatarFromProfileResponse`, `type AvatarSummary` (Task 1); `ProfileCard` (props become `{ email; fallbackName }`: `collapsible` is removed in Step 3, its only caller is the dashboard block this task deletes); `leaderFetch`.
- Produces:
  - `HeaderAvatar` default export, props `{ user: { email: string; name: string } | null }`. Renders nothing while `user` is null.
  - `WizardShellProps` gains a required `user: { email: string; name: string } | null`.

- [ ] **Step 1: Panel CSS**

In `src/app/globals.css`, extend the focus-ring selector list:

```css
.avenue-night :focus-visible,
.av-moment :focus-visible {
```

becomes:

```css
.avenue-night :focus-visible,
.av-moment :focus-visible,
.av-sheet :focus-visible {
```

Then insert this block immediately before the `/* ============================================================ */` line that opens the `/* PRINT: Calling Profile and Launch Plan */` banner:

```css
/* The profile panel (round 2 spec 1): a native <dialog>, so the browser
   handles Escape, the focus trap and the top layer. A full-width sheet
   rising from the bottom on phones, a right-hand sheet from md. It sits
   outside .avenue-night on some pages, so it carries the night muted
   colour, the lamp focus ring (above) and the night panel itself. */
.av-sheet {
  --muted: #8b94a7;
  position: fixed;
  inset: 0;
  margin: auto 0 0 0;
  width: 100%;
  max-width: 100%;
  /* fit-content, not auto: with inset 0 an auto height would stretch to
     88vh even for a short card. The auto top margin then pins it to the
     bottom edge. */
  height: fit-content;
  max-height: 88vh;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 18px 18px 0 0;
  background: var(--night);
  color: var(--ink);
  overflow-y: auto;
}
.av-sheet::backdrop {
  background: rgba(0, 0, 0, 0.6);
}
.av-sheet-body {
  padding: 8px 16px 24px;
}
.av-sheet .panel {
  background: var(--night-2);
  border-color: var(--line);
  border-radius: 18px;
}
.av-sheet .eyebrow {
  color: var(--muted);
}
@media (min-width: 768px) {
  .av-sheet {
    margin: 0 0 0 auto;
    width: 480px;
    height: 100vh;
    max-height: 100vh;
    border-radius: 18px 0 0 18px;
  }
  .av-sheet-body {
    padding: 12px 24px 32px;
  }
}
```

- [ ] **Step 2: Write HeaderAvatar**

`src/components/avenue/HeaderAvatar.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import ProfileCard from "@/components/ui/ProfileCard";
import { leaderFetch } from "@/lib/leaderFetch";
import { avatarFromProfileResponse, initialsOf, type AvatarSummary } from "@/lib/profileAvatar";

export interface HeaderAvatarProps {
  user: { email: string; name: string } | null;
}

// Round 2 spec 1: the leader's photo (or initials), 36 px inside a 44 px
// button at the top right of every leader header. Tapping it opens the
// existing ProfileCard, unchanged, in a panel. Escape, the close button or
// a click on the backdrop closes it, and focus returns to the avatar.
export default function HeaderAvatar({ user }: HeaderAvatarProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AvatarSummary | null>(null);
  // Bumped each time the panel closes, so a photo saved inside it shows here.
  const [reloadKey, setReloadKey] = useState(0);

  const email = user?.email ?? null;
  const fallbackName = user?.name ?? "";

  // The same read ProfileCard makes. If it fails, the initials stay and the
  // failure is logged: a missing photo must never break a page.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    leaderFetch("/api/leader-profile")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Could not load your profile (${res.status})`);
        return json;
      })
      .then((json) => {
        if (!cancelled) setSummary(avatarFromProfileResponse(json, fallbackName));
      })
      .catch((e) => {
        console.error("HeaderAvatar: profile load failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [email, fallbackName, reloadKey]);

  // The dialog follows `open`. showModal() puts it in the top layer, traps
  // focus inside it and moves focus to its first control (the close button).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Runs for every way the dialog closes: Escape, the close button, the
  // backdrop.
  const handleClose = () => {
    setOpen(false);
    setReloadKey((k) => k + 1);
    buttonRef.current?.focus();
  };

  if (!user) return null;
  const name = summary?.name ?? user.name;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="My profile"
        aria-haspopup="dialog"
        className="no-print inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
      >
        {summary?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={summary.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full border border-[var(--line-2)] object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-2)] bg-[var(--night-2)] text-xs font-semibold text-[var(--ink)]"
          >
            {initialsOf(name)}
          </span>
        )}
      </button>
      <dialog
        ref={dialogRef}
        aria-label="My profile"
        className="av-sheet no-print"
        onClose={handleClose}
        onClick={(e) => {
          // A click on the ::backdrop reports the dialog as its target, but
          // so does a click on empty space inside the sheet (on desktop the
          // sheet is full height and the card is shorter). Only a click
          // outside the sheet's box closes it, so an unsaved edit is never
          // dropped by a stray click inside (pre-flight F3). Keyboard
          // activation reports 0,0 and never targets the dialog itself.
          if (e.target !== e.currentTarget) return;
          const box = e.currentTarget.getBoundingClientRect();
          const inside =
            e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
          if (!inside) setOpen(false);
        }}
      >
        <div className="av-sheet-body">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close my profile"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {/* Mounted only while open, so ProfileCard loads fresh each time. */}
          {open ? <ProfileCard email={user.email} fallbackName={user.name} /> : null}
        </div>
      </dialog>
    </>
  );
}
```

- [ ] **Step 3: ProfileCard uses the shared initials rule and loses its dead collapsed mode**

In `src/components/ui/ProfileCard.tsx`, delete the local function (lines 86-90):

```tsx
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
```

and add, after `import { leaderFetch } from "@/lib/leaderFetch";`:

```tsx
import { initialsOf } from "@/lib/profileAvatar";
```

The rule is character for character the same.

Then remove the collapsed mode (pre-flight F2). Its only caller was the dashboard's `collapsible` card, which Step 4 deletes; every remaining caller (the panel) already renders the always-open card, so nothing a leader sees changes.

1. Delete `  ChevronUp,` from the lucide-react import list.
2. In `interface ProfileCardProps`, delete `  collapsible?: boolean;`.
3. The signature becomes:

```tsx
export default function ProfileCard({ email, fallbackName }: ProfileCardProps) {
```

4. Delete these three lines:

```tsx
  // Collapsed by default only when the parent asks for it, so every other
  // caller keeps the old always-open behaviour.
  const [open, setOpen] = useState(!collapsible);
```

5. Delete the whole collapsed branch:

```tsx
  // ---------- Collapsed ----------
  // Just the avatar. The dashboard leads with actions, not with your own face.
  if (collapsible && !open && !editing) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Open my profile"
          title="My Profile"
          className="rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {avatar(profile.avatar_url, "w-14 h-14", "text-base")}
        </button>
      </div>
    );
  }

```

6. In display mode, delete the collapse button:

```tsx
        {collapsible && (
          <button
            onClick={() => setOpen(false)}
            aria-expanded
            aria-label="Collapse my profile"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted)] hover:text-white hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
```

Nothing else in ProfileCard changes: `load`, `save`, `pickPhoto`, edit mode and display mode are untouched. Confirm with `grep -n "collapsible\|setOpen\|ChevronUp" src/components/ui/ProfileCard.tsx` (no output).

- [ ] **Step 4: Dashboard: avatar in the header, collapsed card removed**

In `src/app/leaders/page.tsx`, replace the import line:

```tsx
import ProfileCard from "@/components/ui/ProfileCard";
```

with:

```tsx
import HeaderAvatar from "@/components/avenue/HeaderAvatar";
```

Replace the header's logout button:

```tsx
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
```

with:

```tsx
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </button>
            <HeaderAvatar user={user} />
          </div>
```

Delete the whole "My Profile" block:

```tsx
        {/* My Profile */}
        <div className="mb-12">
          <ProfileCard email={user.email} fallbackName={user.name} collapsible />
        </div>

```

- [ ] **Step 5: Journey hub: avatar at the right of the pill**

In `src/app/leaders/training/page.tsx`, add after `import ClampedText from "@/components/avenue/ClampedText";`:

```tsx
import HeaderAvatar from "@/components/avenue/HeaderAvatar";
```

In the pill header, change `px-6 py-2` to `pl-6 pr-2 py-2` in the `<header className=...>` so the avatar sits close to the pill's right edge, and add the avatar after the logout button, so the end of the header reads:

```tsx
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Logout</span>
          </button>
          <HeaderAvatar user={user} />
        </div>
      </header>
```

- [ ] **Step 6: Wizards: avatar at the right of the top row**

In `src/components/journey/WizardShell.tsx`, add the import after `import JourneyFooter from "@/components/avenue/JourneyFooter";`:

```tsx
import HeaderAvatar from "@/components/avenue/HeaderAvatar";
```

Add to `WizardShellProps`, after `phaseId: "phase2" | "phase3";`:

```tsx
  user: { email: string; name: string } | null; // the signed-in leader, for the header avatar
```

Change the destructuring line to:

```tsx
  const { phaseId, user, name, title, steps, lampLabels, current, onSelect, saving, saveError, children } = props;
```

Replace the top link:

```tsx
        <Link
          href="/leaders/training"
          className="no-print inline-flex min-h-[44px] items-center text-sm text-[var(--muted)] hover:text-white"
        >
          Back to your journey
        </Link>
```

with:

```tsx
        <div className="no-print flex items-center justify-between gap-4">
          <Link
            href="/leaders/training"
            className="inline-flex min-h-[44px] items-center text-sm text-[var(--muted)] hover:text-white"
          >
            Back to your journey
          </Link>
          <HeaderAvatar user={user} />
        </div>
```

In `src/app/leaders/training/calling/page.tsx`, line 34 becomes:

```tsx
  const { user, ready, error: gateError } = useLeaderGate();
```

and in its `<WizardShell` call add `user={user}` on the line after `phaseId="phase2"`. In `src/app/leaders/training/launch/page.tsx` (which already reads `user` from `useLeaderGate`), add `user={user}` on the line after `phaseId="phase3"`.

- [ ] **Step 7: Calling Profile and Launch Plan: avatar beside Print**

In both `src/app/leaders/training/calling/profile/page.tsx` and `src/app/leaders/training/launch/plan/page.tsx`, add after `import JourneyFooter from "@/components/avenue/JourneyFooter";`:

```tsx
import HeaderAvatar from "@/components/avenue/HeaderAvatar";
```

and in each file's top row replace the single line:

```tsx
        <PrintButton />
```

with:

```tsx
        <div className="flex items-center gap-2">
          <PrintButton />
          <HeaderAvatar user={user} />
        </div>
```

and let that row wrap at 375 px (pre-flight F5): its opening line

```tsx
      <div className="no-print flex items-center justify-between">
```

becomes

```tsx
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
```

(The row already has `no-print`, so none of it prints.) In `calling/profile/page.tsx`, line 57 becomes:

```tsx
  const { user, ready, error: gateError } = useLeaderGate();
```

`launch/plan/page.tsx` already reads `user`.

- [ ] **Step 8: The other leader pages**

Add `import HeaderAvatar from "@/components/avenue/HeaderAvatar";` as the last import in each file below.

`src/app/leaders/network/page.tsx`, replace:

```tsx
          <span className="text-sm text-[var(--muted)]">{user.name}</span>
```

with:

```tsx
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">{user.name}</span>
            <HeaderAvatar user={user} />
          </div>
```

`src/app/leaders/resources/page.tsx`, `src/app/leaders/study-guides/page.tsx` and `src/app/leaders/support/page.tsx` each have this identical logout button in the header; add the avatar straight after it, so it reads:

```tsx
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
              <HeaderAvatar user={user} />
```

In the same three files, hide the welcome line below `sm` so the avatar fits at 375 px (pre-flight F5, as Network does). Replace:

```tsx
              <span className="text-gray-400 text-sm">
                Welcome, {user.name}
              </span>
```

with:

```tsx
              <span className="hidden text-gray-400 text-sm sm:inline">
                Welcome, {user.name}
              </span>
```

Do not touch `src/app/leaders/admin/page.tsx` or the `src/app/leaders/workshops/**` pages (see the decisions table).

- [ ] **Step 9: Run the gates**

`npx tsc --noEmit` clean, `npm test` 267 passing (unchanged), `npm run lint` at most 54 (removing the dashboard's ProfileCard import and the dead collapsed branch cannot add a problem), `npm run build` passes.

In the task report, note (pre-flight F7) that HeaderAvatar is a new read-only call site of the existing `GET /api/leader-profile` (same auth; the dashboard's card already made this read), fired on each leader page and after each panel close.

- [ ] **Step 10: Commit**

```bash
git add src/app/globals.css src/components/avenue/HeaderAvatar.tsx src/components/ui/ProfileCard.tsx src/app/leaders/page.tsx src/app/leaders/training/page.tsx src/components/journey/WizardShell.tsx src/app/leaders/training/calling/page.tsx src/app/leaders/training/launch/page.tsx src/app/leaders/training/calling/profile/page.tsx src/app/leaders/training/launch/plan/page.tsx src/app/leaders/network/page.tsx src/app/leaders/resources/page.tsx src/app/leaders/study-guides/page.tsx src/app/leaders/support/page.tsx
git commit -m "Avenue at night 2: profile photo in every leader header, profile in a panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 11: Controller browser check**

At 375 px and at desktop, signed in as a test leader (`@example.invalid`, guard clean before and after):
- Dashboard `/leaders`: a round 36 px photo (or initials) at the top right of the header; the collapsed avatar that sat in the middle of the page is gone; nothing else moved.
- The same avatar at the top right on `/leaders/training` (inside the pill), `/leaders/training/calling`, `/leaders/training/launch`, `/leaders/training/calling/profile`, `/leaders/training/launch/plan`, `/leaders/network`, `/leaders/resources`, `/leaders/study-guides`, `/leaders/support`. No horizontal scroll at 375 px on any of them.
- Tap it: on the phone a full-width sheet rises from the bottom (about 88 percent of the height, scrolls inside); on desktop a 480 px sheet on the right, full height. The backdrop dims the page. The ProfileCard inside shows and its Edit and Save work exactly as before (edit the "About me" line, save, reopen: it stuck; then put it back).
- Keyboard: Tab to the avatar (lamp ring), Enter opens, focus lands on the close button, Tab stays inside the panel, Escape closes and focus is back on the avatar. The close button and a click on the dim backdrop also close it. On desktop, a click on the empty space below the card inside the sheet does not close it; start an edit, click there, and the edit is still open.
- At 375 px, `/leaders/resources`, `/leaders/study-guides`, `/leaders/support`: no "Welcome" line, the avatar fits, no horizontal scroll; the Profile and Plan top rows wrap cleanly if needed.
- Upload a new photo in the panel, save, close: the header avatar shows the new photo without a reload. Remove it again afterwards.
- Print preview of `/leaders/training/calling/profile` and `/leaders/training/launch/plan`: no avatar, output otherwise unchanged.

---

### Task 5: Growth as Leader health and Church health, with coloured RPMS sliders

**Files:**
- Modify: `src/app/globals.css` (four gauge variables in `:root`; the `.av-range` block before the `.av-sheet` block from Task 4)
- Create: `src/components/avenue/Expander.tsx`
- Create: `src/app/leaders/training/growth/RpmsSlider.tsx`
- Rewrite: `src/app/leaders/training/Phase4Growth.tsx` (whole file; props keep every existing name and gain `currentWeekStart`)
- Modify: `src/app/leaders/training/page.tsx` (the `hasCheckedInThisWeek` line, the Growth label block and the `<Phase4Growth` call; find them by content, Tasks 3 and 4 shifted the line numbers by a few)

**Interfaces:**
- Consumes: `GAUGES`, `type Gauge` (Task 1); `LEADER_HEALTH_INTRO`, `CHURCH_HEALTH_INTRO`, `leaderHealthSummary`, `leaderHealthStartsOpen`, `leaderHealthStatus`, `churchHealthSummary` (Task 1); `CheckinHistory` (today's props `{ weeks, checkins }`; Task 6 adds `currentWeekStart`).
- Produces:
  - `Expander` default export, props `{ id: string; title: string; intro?: string; summary?: string; open: boolean; onToggle: () => void; children: ReactNode }`. Task 8 uses it for "Why multiply?".
  - `RpmsSlider` default export, props `{ gauge: Gauge; value: number; onChange: (next: number) => void }`.
  - `Phase4Growth` gains the prop `currentWeekStart: string`. `CHECKIN_HISTORY_WEEKS` and `CheckinForm` stay exported unchanged.
  - CSS variables `--g-relational`, `--g-physical`, `--g-mental`, `--g-spiritual` (Task 6 uses them through `GAUGES[i].colour`).

- [ ] **Step 1: Gauge colours and the slider CSS**

In `src/app/globals.css`, inside `:root`, after the line `--accent-soft: rgba(79, 124, 255, 0.14);`, add:

```css

  /* ---- RPMS gauges (round 2 spec 3.1): Growth only ---- */
  --g-relational: #ff8fa3;
  --g-physical: #6fdca0;
  --g-mental: #7cc7ff;
  --g-spiritual: #b9a2ff;
```

Then insert this block immediately before the `/* The profile panel (round 2 spec 1)` comment that Task 4 added:

```css
/* RPMS slider (round 2 spec 3.1): a native range input, 44 px tall to
   touch, over a drawn track. The filled part is the gauge colour (--g),
   the rest --line-2. --p is the filled share, 0 to 100; the fill ends at
   the thumb's centre (thumb 24 px wide). */
.av-range {
  position: relative;
  height: 44px;
}
.av-range-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 6px;
  margin-top: -3px;
  border-radius: 999px;
  background: var(--line-2);
  overflow: hidden;
}
.av-range-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(12px + (100% - 24px) * var(--p) / 100);
  border-radius: 999px;
  background: var(--g);
}
.av-range-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 44px;
  margin: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}
.av-range-input::-webkit-slider-runnable-track {
  height: 44px;
  background: transparent;
}
.av-range-input::-moz-range-track {
  height: 44px;
  background: transparent;
}
.av-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  margin-top: 10px;
  border-radius: 50%;
  border: 3px solid var(--night-2);
  background: var(--g);
  box-shadow: 0 0 0 1px var(--g);
}
.av-range-input::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid var(--night-2);
  background: var(--g);
  box-shadow: 0 0 0 1px var(--g);
}
.av-range-input:focus-visible {
  border-radius: 12px;
}
```

(The lamp focus ring itself comes from `.avenue-night :focus-visible`.)

- [ ] **Step 2: Write Expander**

`src/components/avenue/Expander.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface ExpanderProps {
  id: string;
  title: string;
  intro?: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

// A button row that opens a section in place (round 2 spec 3 and 5): serif
// heading, an optional one-line intro, and, only while closed, a one-line
// summary. 44 px or taller, aria-expanded, a hairline above. The chevron
// turns without animating under reduced motion. The heading button holds
// only the title and chevron, so its accessible name stays short; the
// intro and summary sit below it and are read as its description
// (pre-flight F12).
export default function Expander({ id, title, intro, summary, open, onToggle, children }: ExpanderProps) {
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  const introId = `${id}-intro`;
  const summaryId = `${id}-summary`;
  const showSummary = !open && !!summary;
  const describedBy = [intro ? introId : null, showSummary ? summaryId : null].filter(Boolean).join(" ") || undefined;
  return (
    <section className="border-t border-[var(--line)]">
      <h3 className="m-0">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          aria-describedby={describedBy}
          onClick={onToggle}
          className="flex min-h-[44px] w-full items-center gap-4 pt-5 pb-1 text-left"
        >
          <span className="min-w-0 flex-1 font-serif text-2xl leading-tight text-[var(--ink)]">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 flex-shrink-0 text-[var(--muted)] motion-safe:transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      <div className="pb-5">
        {intro ? (
          <p id={introId} className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {intro}
          </p>
        ) : null}
        {showSummary ? (
          <p id={summaryId} className="mt-2 text-sm tabular-nums text-[var(--ink-2)]">
            {summary}
          </p>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="pb-10">
          {children}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Write RpmsSlider**

`src/app/leaders/training/growth/RpmsSlider.tsx`:

```tsx
import type { CSSProperties } from "react";
import type { Gauge } from "@/lib/rpms";

export interface RpmsSliderProps {
  gauge: Gauge;
  value: number;
  onChange: (next: number) => void;
}

// One gauge of the weekly check-in (round 2 spec 3.1): a native range, 1 to
// 10, step 1, so arrow keys, Home and End work. The value is shown large in
// the gauge's colour, with the gauge's one-line meaning under the label.
export default function RpmsSlider({ gauge, value, onChange }: RpmsSliderProps) {
  const inputId = `rpms-${gauge.key}`;
  const meaningId = `${inputId}-meaning`;
  const style = { "--g": gauge.colour, "--p": ((value - 1) / 9) * 100 } as CSSProperties;
  return (
    <div style={style}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-semibold text-[var(--ink)]">
          {gauge.label}
        </label>
        <output htmlFor={inputId} className="font-serif text-3xl leading-none tabular-nums" style={{ color: gauge.colour }}>
          {value}
        </output>
      </div>
      <p id={meaningId} className="mt-1 text-xs text-[var(--muted)]">
        {gauge.meaning}
      </p>
      <div className="av-range mt-1">
        <span className="av-range-track" aria-hidden="true">
          <span className="av-range-fill" />
        </span>
        <input
          id={inputId}
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={meaningId}
          aria-valuetext={`${value} out of 10`}
          className="av-range-input"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite Phase4Growth**

`src/app/leaders/training/Phase4Growth.tsx` (whole file):

```tsx
"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import CheckinHistory, { CheckinEntry } from "@/components/ui/CheckinHistory";
import TaggedPeople from "@/components/people/TaggedPeople";
import Glow from "@/components/avenue/Glow";
import Expander from "@/components/avenue/Expander";
import RpmsSlider from "./growth/RpmsSlider";
import { GAUGES } from "@/lib/rpms";
import {
  CHURCH_HEALTH_INTRO,
  churchHealthSummary,
  LEADER_HEALTH_INTRO,
  leaderHealthStartsOpen,
  leaderHealthStatus,
  leaderHealthSummary,
} from "@/lib/phaseSummaries";
import type { Metric, Person } from "@/lib/people";

// How many recent weeks the history shows.
export const CHECKIN_HISTORY_WEEKS = 12;

// The three named metrics, Henry's definitions from HANDOVER.md 3.3,
// verbatim. Three separate lists, not a ladder.
const METRIC_PANELS: { metric: Metric; title: string; definition: string; empty: string }[] = [
  {
    metric: "pathways",
    title: "Pathways",
    definition: "A new person feels like they belong in a Pathway and is comfortable inviting someone else into the community",
    empty: "No one named yet.",
  },
  {
    metric: "intersections",
    title: "Intersections",
    definition: "A person is baptised or makes a decision of faith and is then apprenticed to lead in a Pathway",
    empty: "No one named yet.",
  },
  {
    metric: "streetlights",
    title: "Streetlights",
    definition: "A disciple responds to the Holy Spirit by stepping out to plant, lead or serve in a new Pathways or Streetlights initiative",
    empty: "No one named yet.",
  },
];

// The week's RPMS scores plus the one-sentence reflection, as held by
// useCheckins while the leader edits them.
export interface CheckinForm {
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
  reflection: string;
}

interface Phase4GrowthProps {
  currentWeekLabel: string;
  currentWeekStart: string; // the Monday the form edits (useCheckins' editingWeekStart)
  historyWeeks: string[];
  checkins: CheckinEntry[];
  checkinsLoaded: boolean;
  setCheckinsLoaded: Dispatch<SetStateAction<boolean>>;
  checkinLoadError: string | null;
  setCheckinLoadAttempt: Dispatch<SetStateAction<number>>;
  checkinForm: CheckinForm;
  setCheckinForm: Dispatch<SetStateAction<CheckinForm>>;
  checkinSaving: boolean;
  checkinSaveError: string | null;
  checkinSaved: boolean;
  saveCheckin: () => Promise<void>;
  people: Person[];
  peopleLoaded: boolean;
  peopleError: string | null;
  onPersonChange: (person: Person) => void;
}

// Phase 4 (Growth), round 2 spec 3: two expanders. Leader health holds the
// weekly RPMS check-in and its history; Church health holds the three named
// lists. State and handlers come from useCheckins and useMyPeople via the
// page; saving is exactly as before (same form fields, same saveCheckin).
export default function Phase4Growth({
  currentWeekLabel,
  currentWeekStart,
  historyWeeks,
  checkins,
  checkinsLoaded,
  setCheckinsLoaded,
  checkinLoadError,
  setCheckinLoadAttempt,
  checkinForm,
  setCheckinForm,
  checkinSaving,
  checkinSaveError,
  checkinSaved,
  saveCheckin,
  people,
  peopleLoaded,
  peopleError,
  onPersonChange,
}: Phase4GrowthProps) {
  // null until check-ins first load, then decided once: open while this
  // week's check-in is unsaved, or when it failed to load so the retry
  // shows. Saving afterwards does not close it.
  const [leaderOpen, setLeaderOpen] = useState<boolean | null>(null);
  const [churchOpen, setChurchOpen] = useState(false);
  if (leaderOpen === null && checkinsLoaded) {
    setLeaderOpen(checkinLoadError !== null || leaderHealthStartsOpen(checkins, currentWeekStart));
  }
  const leaderIsOpen = leaderOpen ?? false;

  // A save in flight or a failed save wins (pre-flight F4): the closed
  // expander hides the Save button's own state, so it must say so here.
  const leaderSummary = !checkinsLoaded
    ? "Loading..."
    : checkinLoadError
      ? "Could not load"
      : leaderHealthStatus(leaderHealthSummary(checkins, currentWeekStart), checkinSaving, checkinSaveError);
  const churchSummary = !peopleLoaded ? "Loading..." : peopleError ? "Could not load" : churchHealthSummary(people);

  return (
    <div>
      <Expander
        id="growth-leader"
        title="Leader health"
        intro={LEADER_HEALTH_INTRO}
        summary={leaderSummary}
        open={leaderIsOpen}
        onToggle={() => setLeaderOpen(!leaderIsOpen)}
      >
        {/* The weekly check-in: a raised card because it takes input */}
        <div className="night-card p-6">
          <span className="eyebrow">This week</span>
          <h4 className="mt-1 mb-4 font-serif text-2xl text-[var(--ink)]">Week of {currentWeekLabel}</h4>
          {!checkinsLoaded ? (
            <p className="text-sm text-[var(--muted)]">Loading your check-in...</p>
          ) : checkinLoadError ? (
            // No form is rendered here on purpose. Rendering it
            // at its 5/5/5/5 defaults with Save enabled would
            // let a leader whose real scores simply failed to
            // load overwrite them with defaults they never saw.
            <div className="rounded-xl border border-dashed border-[var(--line-2)] p-6 text-center">
              <p className="text-sm text-[var(--ink)] mb-1">This week&rsquo;s check-in could not be loaded.</p>
              <p className="text-sm text-[var(--muted)] mb-4">{checkinLoadError}</p>
              <button
                type="button"
                onClick={() => {
                  setCheckinsLoaded(false);
                  setCheckinLoadAttempt((n) => n + 1);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-full border border-[var(--line-2)] text-[var(--ink)] text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-6 mb-6">
                {GAUGES.map((gauge) => (
                  <RpmsSlider
                    key={gauge.key}
                    gauge={gauge}
                    value={checkinForm[gauge.key]}
                    onChange={(next) => setCheckinForm((prev) => ({ ...prev, [gauge.key]: next }))}
                  />
                ))}
              </div>
              <div className="mb-4">
                <label htmlFor="checkin-reflection" className="text-sm text-[var(--ink)] mb-1.5 block">
                  One sentence
                </label>
                <textarea
                  id="checkin-reflection"
                  value={checkinForm.reflection}
                  onChange={(e) => setCheckinForm((prev) => ({ ...prev, reflection: e.target.value }))}
                  maxLength={2000}
                  rows={2}
                  placeholder="How this week actually went."
                  className="w-full rounded-lg bg-[var(--night)] border border-[var(--line-2)] p-3 text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveCheckin}
                  disabled={checkinSaving}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {checkinSaving ? "Saving..." : "Save check-in"}
                </button>
                {checkinSaved && !checkinSaving && <span className="text-xs text-[var(--lamp)]">Saved.</span>}
                {checkinSaveError && <span className="text-xs text-red-400">{checkinSaveError}</span>}
              </div>
            </>
          )}
        </div>

        {/* The history */}
        <div className="mt-10">
          <h4 className="night-h2 mb-4">Recent weeks</h4>
          <CheckinHistory weeks={historyWeeks} checkins={checkins} />
        </div>
      </Expander>

      <div className="border-b border-[var(--line)]">
        <Expander
          id="growth-church"
          title="Church health"
          intro={CHURCH_HEALTH_INTRO}
          summary={churchSummary}
          open={churchOpen}
          onToggle={() => setChurchOpen((o) => !o)}
        >
          <p className="text-sm text-[var(--muted)] mb-6">
            Three separate lists, not a ladder. Anyone can sit in more than one.
          </p>
          {!peopleLoaded ? (
            <p className="text-sm text-[var(--muted)]">Loading your people...</p>
          ) : peopleError ? (
            <p className="text-sm text-red-400">{peopleError}</p>
          ) : (
            <div className="grid grid-cols-1 border-t border-[var(--line)] md:grid-cols-3 md:divide-x md:divide-[var(--line)]">
              {METRIC_PANELS.map(({ metric, title, definition, empty }) => {
                const count = people.filter((p) => p.metrics.includes(metric)).length;
                return (
                  <div
                    key={metric}
                    className="border-b border-[var(--line)] py-6 md:border-b-0 md:px-5 md:first:pl-0 md:last:pr-0"
                  >
                    <h4 className="font-serif text-xl text-[var(--ink)]">{title}</h4>
                    <p className="mt-1 mb-3 text-xs text-[var(--muted)]">{definition}</p>
                    <Glow as="div" trigger={count} className="-mx-2 mb-3 inline-block rounded-lg px-2">
                      <p className="tabular-nums">
                        <span
                          className={`font-serif text-4xl ${count > 0 ? "text-[var(--lamp)]" : "text-[var(--dim)]"}`}
                        >
                          {count}
                        </span>
                        <span className="ml-2 text-sm text-[var(--muted)]">named</span>
                      </p>
                    </Glow>
                    <TaggedPeople
                      tag={{ kind: "metric", value: metric }}
                      people={people}
                      onChange={onPersonChange}
                      emptyText={empty}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Expander>
      </div>
    </div>
  );
}
```

What changed against today, so a reviewer can diff with intent: the `ScoreRow` buttons and the local `RPMS_GAUGES` are replaced by `RpmsSlider` over `GAUGES`; the "Four gauges from Dave Ferguson's Multiplier" line is gone (the Leader health intro says it); "Your three metrics" heading is replaced by the Church health expander; `text-white` on non-button text became `text-[var(--ink)]`. The form fields, `setCheckinForm` updates, the retry, `saveCheckin` and the metric lists are character for character the same logic. The per-metric `count` inside the columns is the unchanged old code and duplicates `churchHealthSummary`'s counting; that is accepted, do not refactor it (pre-flight F8).

- [ ] **Step 5: Hub: pass the week, drop the old label**

In `src/app/leaders/training/page.tsx`:

Delete this line (line 317 before Tasks 3 and 4):

```tsx
            const hasCheckedInThisWeek = checkins.some((c) => c.weekStart === currentWeekStart);
```

Delete this block (lines 331-333 before Tasks 3 and 4):

```tsx
                {isGrowthPhase ? (
                  <p className="night-label mt-4">{hasCheckedInThisWeek ? "Checked in this week" : "Not yet this week"}</p>
                ) : null}
```

In the `<Phase4Growth` call add, on the line after `currentWeekLabel={currentWeekLabel}`:

```tsx
                      currentWeekStart={currentWeekStart}
```

- [ ] **Step 6: Run the gates**

`npx tsc --noEmit` clean, `npm test` 267 passing (unchanged), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/components/avenue/Expander.tsx src/app/leaders/training/growth/RpmsSlider.tsx src/app/leaders/training/Phase4Growth.tsx src/app/leaders/training/page.tsx
git commit -m "Avenue at night 2: Growth as Leader health and Church health, RPMS sliders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

At 375 px and desktop, on `/leaders/training?phase=phase4` with a test leader:
- Two expanders, "Leader health" then "Church health", each with a serif heading, its intro line (exactly the spec's wording) and a chevron. No "Checked in this week" label remains under the opening.
- With no check-in this week: Leader health is open on load, Church health closed and showing "Named: n · n · n" with the real counts.
- Four sliders in rose, green, sky and violet. Each shows its meaning line, and the big number in its colour matches the thumb. Drag each to 1 and to 10: the fill ends under the thumb at both ends. Touch target is the full 44 px row.
- Keyboard: Tab to a slider (lamp ring), arrow keys move it one step, Home and End jump to 1 and 10.
- Save check-in: "Saved." appears as before; reload the page: Leader health now starts closed and its summary reads "This week: R 7 · P 5 · M 6 · S 8" with the saved numbers; opening it shows the form pre-filled.
- Expanders: Enter and Space toggle, `aria-expanded` flips, the summary line hides while open. With reduced motion on, the chevron flips without turning. read_page: each expander button's name is just its title ("Leader health", "Church health"), with the intro and closed summary as its description.
- Save state while closed: change a slider, tap Save, close Leader health at once: the summary reads "Saving..." then the new scores. With the network offline in dev tools, save then close: the summary reads "Could not save. Open to try again."
- Church health open: the three columns and name tagging work as before (tag and untag one name, then undo).

---

### Task 6: Recent weeks as a month calendar and a 12-week trend

**Files:**
- Create: `src/components/growth/CheckinCalendar.tsx`
- Create: `src/components/growth/CheckinTrend.tsx`
- Create: `src/components/growth/WeekDetail.tsx`
- Rewrite: `src/components/ui/CheckinHistory.tsx` (whole file; the `CheckinEntry` export stays byte for byte, because `useCheckins.ts` and `NextStepCard.tsx` import it)
- Modify: `src/app/leaders/training/Phase4Growth.tsx` (the `<CheckinHistory` line from Task 5)

**Interfaces:**
- Consumes: `GAUGES` (Task 1); from `src/lib/checkinCalendar.ts` (Task 2): `canShift`, `formatWeekLabel`, `monthBounds`, `monthLabel`, `monthOf`, `monthOfDate`, `monthWeeks`, `shiftMonth`, `type CalendarWeek`, `type MonthBounds`, `type MonthRef`; from `src/lib/checkinChart.ts` (Task 2): `CHART_BOX`, `gaugeSegments`, `labelIndexes`, `segmentPath`, `xFor`, `yFor`; the `--g-*` variables (Task 5).
- Produces: `CheckinHistory` props become `{ weeks: string[]; checkins: CheckinEntry[]; currentWeekStart: string }`.

- [ ] **Step 1: Write CheckinCalendar**

`src/components/growth/CheckinCalendar.tsx`:

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { GAUGES } from "@/lib/rpms";
import {
  canShift,
  formatWeekLabel,
  monthLabel,
  monthWeeks,
  shiftMonth,
  type CalendarWeek,
  type MonthBounds,
  type MonthRef,
} from "@/lib/checkinCalendar";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// The accessible name of a week row: when it is, and what was recorded.
function weekName(w: CalendarWeek<CheckinEntry>): string {
  const when = `Week of ${formatWeekLabel(w.weekStart, "long")}${w.isCurrent ? ", this week" : ""}`;
  const c = w.checkin;
  if (!c) return `${when}: no check-in`;
  return `${when}: checked in, ${GAUGES.map((g) => `${g.label} ${c[g.key]}`).join(", ")}`;
}

export interface CheckinCalendarProps {
  view: MonthRef;
  bounds: MonthBounds;
  onView: (next: MonthRef) => void;
  checkins: CheckinEntry[];
  currentWeekStart: string;
  selected: string | null;
  onSelect: (weekStart: string) => void;
}

// Round 2 spec 3.2: one month, Monday first, one tappable row per week. A
// checked-in week has a warm lamp dot at its start and a thin bar per gauge
// (its length is the score). The current week is ringed in blue. Weeks with
// no check-in stay quiet, never red; weeks still to come show but are
// disabled. The month buttons stop at the bounds.
export default function CheckinCalendar({
  view,
  bounds,
  onView,
  checkins,
  currentWeekStart,
  selected,
  onSelect,
}: CheckinCalendarProps) {
  const weeks = monthWeeks(view, checkins, currentWeekStart);
  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onView(shiftMonth(view, -1))}
          disabled={!canShift(view, -1, bounds)}
          aria-label="Previous month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="font-serif text-xl text-[var(--ink)]" aria-live="polite">
          {monthLabel(view)}
        </p>
        <button
          type="button"
          onClick={() => onView(shiftMonth(view, 1))}
          disabled={!canShift(view, 1, bounds)}
          aria-label="Next month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="night-label mt-3 grid grid-cols-7 px-3 text-center" aria-hidden="true">
        {DAY_LETTERS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <ul className="mt-1 space-y-1">
        {weeks.map((w) => {
          const isSelected = selected === w.weekStart;
          const checkin = w.checkin;
          return (
            <li key={w.weekStart}>
              <button
                type="button"
                disabled={w.isFuture}
                onClick={() => onSelect(w.weekStart)}
                aria-pressed={isSelected}
                aria-label={weekName(w)}
                className={`relative block min-h-[44px] w-full rounded-xl border-2 px-3 py-1.5 text-left disabled:cursor-default ${
                  w.isCurrent ? "border-[var(--accent)]" : "border-transparent"
                } ${isSelected ? "bg-[var(--night-2)]" : ""}`}
              >
                {checkin ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-1 top-3 h-1.5 w-1.5 rounded-full bg-[var(--lamp)] shadow-[0_0_8px_2px_rgba(255,197,107,0.45)]"
                  />
                ) : null}
                <span aria-hidden="true" className="grid grid-cols-7 text-center text-sm tabular-nums">
                  {w.days.map((d) => (
                    <span
                      key={d.iso}
                      className={d.inMonth && !w.isFuture ? "text-[var(--ink)]" : "text-[var(--dim)]"}
                    >
                      {d.day}
                    </span>
                  ))}
                </span>
                {checkin ? (
                  <span aria-hidden="true" className="mt-1 grid grid-cols-4 gap-1">
                    {GAUGES.map((g) => (
                      <span key={g.key} className="block h-[3px] rounded-full bg-[var(--line-2)]">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${checkin[g.key] * 10}%`, background: g.colour }}
                        />
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Write CheckinTrend**

`src/components/growth/CheckinTrend.tsx`:

```tsx
"use client";

import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { GAUGES } from "@/lib/rpms";
import { CHART_BOX, gaugeSegments, labelIndexes, segmentPath, xFor, yFor } from "@/lib/checkinChart";
import { formatWeekLabel } from "@/lib/checkinCalendar";

export interface CheckinTrendProps {
  weeks: string[]; // oldest first
  checkins: CheckinEntry[];
  selected: string | null;
  onSelect: (weekStart: string) => void;
}

const Y_TICKS = [1, 5, 10];

// Round 2 spec 3.2: an inline SVG line chart, one line per gauge in its
// colour, y from 1 to 10, a missed week leaves a gap. No chart library.
// A transparent button column over each week makes the whole column a tap
// target for that week's detail. The columns are narrower than 44 px at
// phone width; that is accepted because the calendar rows are the
// full-size, keyboard-first route to the same detail (pre-flight F10).
export default function CheckinTrend({ weeks, checkins, selected, onSelect }: CheckinTrendProps) {
  const box = CHART_BOX;
  const n = weeks.length;
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const selectedIndex = selected ? weeks.indexOf(selected) : -1;
  const inner = box.width - box.padLeft - box.padRight;
  const step = n > 1 ? inner / (n - 1) : inner;
  const plotBottom = box.height - box.padBottom;

  return (
    <figure>
      <figcaption className="sr-only">
        Your four gauges over the last {n} weeks, one line each. A missed week leaves a gap.
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${box.width} ${box.height}`} className="block h-auto w-full" aria-hidden="true">
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line
                x1={box.padLeft}
                x2={box.width - box.padRight}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text x={box.padLeft - 8} y={yFor(v)} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--dim)">
                {v}
              </text>
            </g>
          ))}
          {selectedIndex >= 0 ? (
            <line
              x1={xFor(selectedIndex, n)}
              x2={xFor(selectedIndex, n)}
              y1={box.padTop}
              y2={plotBottom}
              stroke="var(--line-2)"
              strokeWidth={1}
            />
          ) : null}
          {GAUGES.map((g) =>
            gaugeSegments(weeks, checkins, g.key).map((segment) => (
              <g key={`${g.key}-${segment[0].week}`}>
                {segment.length > 1 ? (
                  <path
                    d={segmentPath(segment)}
                    fill="none"
                    stroke={g.colour}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {segment.map((p) => (
                  <circle key={p.week} cx={p.x} cy={p.y} r={p.week === selected ? 4 : 2.5} fill={g.colour} />
                ))}
              </g>
            ))
          )}
          {labelIndexes(n).map((i) => (
            <text key={weeks[i]} x={xFor(i, n)} y={box.height - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">
              {formatWeekLabel(weeks[i])}
            </text>
          ))}
        </svg>
        {weeks.map((week, i) => {
          const x0 = Math.max(0, xFor(i, n) - step / 2);
          const x1 = Math.min(box.width, xFor(i, n) + step / 2);
          return (
            <button
              key={week}
              type="button"
              onClick={() => onSelect(week)}
              aria-pressed={selected === week}
              aria-label={`Week of ${formatWeekLabel(week, "long")}: ${byWeek.has(week) ? "checked in" : "no check-in"}`}
              className="absolute top-0 bottom-0 rounded-md"
              style={{ left: `${(x0 / box.width) * 100}%`, width: `${((x1 - x0) / box.width) * 100}%` }}
            />
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        {GAUGES.map((g) => (
          <li key={g.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: g.colour }} />
            {g.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
```

- [ ] **Step 3: Write WeekDetail**

`src/components/growth/WeekDetail.tsx`:

```tsx
import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { GAUGES } from "@/lib/rpms";
import { formatWeekLabel } from "@/lib/checkinCalendar";

export interface WeekDetailProps {
  week: string;
  checkin: CheckinEntry | null;
  onClose: () => void;
}

// The tapped week (round 2 spec 3.2): its four scores in their colours and
// the sentence, below the chart. A week with no check-in says so plainly,
// without implying the leader did anything wrong.
export default function WeekDetail({ week, checkin, onClose }: WeekDetailProps) {
  return (
    <div className="night-card mt-6 p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">Week of {formatWeekLabel(week, "long")}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Close
        </button>
      </div>
      {checkin ? (
        <>
          <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
            {GAUGES.map((g) => (
              <div key={g.key}>
                <dt className="text-xs text-[var(--muted)]">{g.label}</dt>
                <dd className="font-serif text-3xl tabular-nums" style={{ color: g.colour }}>
                  {checkin[g.key]}
                </dd>
              </div>
            ))}
          </dl>
          {checkin.reflection ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">{checkin.reflection}</p>
          ) : (
            <p className="mt-3 text-sm italic text-[var(--muted)]">No reflection written that week.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">No check-in recorded for this week.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite CheckinHistory**

`src/components/ui/CheckinHistory.tsx` (whole file):

```tsx
"use client";

import { useState } from "react";
import CheckinCalendar from "@/components/growth/CheckinCalendar";
import CheckinTrend from "@/components/growth/CheckinTrend";
import WeekDetail from "@/components/growth/WeekDetail";
import { monthBounds, monthOf, monthOfDate, type MonthRef } from "@/lib/checkinCalendar";

export interface CheckinEntry {
  weekStart: string; // YYYY-MM-DD, a Monday
  relational: number;
  physical: number;
  mental: number;
  spiritual: number;
  reflection: string | null;
  updatedAt: string;
}

interface CheckinHistoryProps {
  // The last twelve Mondays, oldest first: the trend's x axis.
  weeks: string[];
  checkins: CheckinEntry[];
  // The Monday the check-in form edits: ringed in the calendar.
  currentWeekStart: string;
}

// Recent weeks (round 2 spec 3.2): a month calendar and a 12-week trend,
// side by side from md, with the tapped week's detail below. Presentational:
// built only from the check-ins it is given, nothing is loaded or saved.
export default function CheckinHistory({ weeks, checkins, currentWeekStart }: CheckinHistoryProps) {
  const [today] = useState(() => new Date());
  const [view, setView] = useState<MonthRef>(() => monthOfDate(today));
  const [selected, setSelected] = useState<string | null>(null);

  if (weeks.length === 0) return null;

  const bounds = monthBounds(
    checkins.map((c) => c.weekStart),
    today,
    weeks.length
  );
  const byWeek = new Map(checkins.map((c) => [c.weekStart, c]));
  const toggle = (week: string) => setSelected((prev) => (prev === week ? null : week));

  return (
    <div>
      <div className="grid gap-10 md:grid-cols-2 md:gap-8">
        <CheckinCalendar
          view={view}
          bounds={bounds}
          onView={setView}
          checkins={checkins}
          currentWeekStart={currentWeekStart}
          selected={selected}
          onSelect={toggle}
        />
        <CheckinTrend
          weeks={weeks}
          checkins={checkins}
          selected={selected}
          onSelect={(week) => {
            toggle(week);
            // Show the tapped week in the calendar too.
            setView(monthOf(week));
          }}
        />
      </div>
      {selected ? (
        <WeekDetail week={selected} checkin={byWeek.get(selected) ?? null} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Pass the week from Phase4Growth**

In `src/app/leaders/training/Phase4Growth.tsx`, replace:

```tsx
          <CheckinHistory weeks={historyWeeks} checkins={checkins} />
```

with:

```tsx
          <CheckinHistory weeks={historyWeeks} checkins={checkins} currentWeekStart={currentWeekStart} />
```

- [ ] **Step 6: Run the gates**

`npx tsc --noEmit` clean, `npm test` 267 passing (unchanged), `npm run lint` at most 54, `npm run build` passes. Also confirm `git diff --stat src/app/leaders/training/useCheckins.ts src/components/journey/NextStepCard.tsx` prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/components/growth/CheckinCalendar.tsx src/components/growth/CheckinTrend.tsx src/components/growth/WeekDetail.tsx src/components/ui/CheckinHistory.tsx src/app/leaders/training/Phase4Growth.tsx
git commit -m "Avenue at night 2: Recent weeks as a month calendar and a 12-week trend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

At 375 px and desktop, `/leaders/training?phase=phase4`, Leader health open. Seed the test leader (`@example.invalid`) with check-ins through the page itself only for this week; for older weeks use the demo leader already holding history if one exists, otherwise check the empty states and one saved week.
- The calendar shows this month (for example "September 2026"), Monday first, day letters M T W T F S S. The current week's row has a blue ring. A checked-in week has a lamp dot at its left and four thin coloured bars whose lengths match the scores. Weeks without a check-in are plain (nothing red). Future weeks look dim and do nothing when tapped.
- "Next month" is disabled on the current month. "Previous month" goes back to the month twelve weeks ago (or the oldest check-in's month if older) and then disables.
- The trend: four coloured lines over twelve weeks, y labels 1, 5 and 10, four week labels along the bottom. A missed week leaves a gap in every line; a lone week shows as dots only.
- Tapping a calendar row or anywhere in a chart column shows the detail below: "Week of 14 September", the four scores in their colours, the sentence (or "No reflection written that week."); a week with no check-in says "No check-in recorded for this week." Tapping the same week again or "Close" hides it. Tapping a chart week from an earlier month moves the calendar to that month.
- Keyboard: Tab reaches month buttons, week rows and chart columns, each with the lamp ring; Enter selects.
- At 375 px: calendar above the chart, no horizontal scroll, the four detail columns fit. At desktop: calendar and chart side by side.

---

### Task 7: How the Arena keeps score

**Files:**
- Modify: `src/lib/arena.ts` (after `export type CounterKey` at line 9)
- Modify: `src/lib/arena.test.ts` (import list and one new `describe`)
- Modify: `src/app/leaders/training/launch/ArenaStep.tsx` (imports, `CountersBar`, a new `ScoreKey`, the start screen)

**Interfaces:**
- Consumes: `COUNTER_KEYS`, `type CounterKey` (existing, `["pathways", "intersections", "streetlights"]`).
- Produces: `ARENA_SCORE_INTRO: string`, `COUNTER_MEANINGS: Record<CounterKey, string>` from `src/lib/arena.ts`.

- [ ] **Step 1: Write the failing test**

In `src/lib/arena.test.ts`, replace the import block at the top:

```ts
import {
  arenaPlanFrom,
  bitesFor,
  detectGaps,
  parseCounters,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type Curveball,
} from "./arena";
```

with:

```ts
import {
  ARENA_SCORE_INTRO,
  arenaPlanFrom,
  bitesFor,
  COUNTER_KEYS,
  COUNTER_MEANINGS,
  detectGaps,
  parseCounters,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type Curveball,
} from "./arena";
```

then append at the end of the file:

```ts
describe("how the Arena keeps score", () => {
  it("gives each counter the spec's plain meaning, in counter order, with no em dash", () => {
    expect(Object.keys(COUNTER_MEANINGS)).toEqual([...COUNTER_KEYS]);
    expect(COUNTER_MEANINGS).toEqual({
      pathways: "People who feel they belong and invite others",
      intersections: "People who come to faith and are apprenticed",
      streetlights: "Disciples who step out to lead or serve",
    });
    expect(ARENA_SCORE_INTRO).toBe(
      "Every choice you make moves three counters, the same three things Avenue watches in real life."
    );
    expect(JSON.stringify(COUNTER_MEANINGS) + ARENA_SCORE_INTRO).not.toContain(String.fromCharCode(0x2014));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: FAIL: `COUNTER_MEANINGS` is undefined (`Object.keys` throws "Cannot convert undefined or null to object").

- [ ] **Step 3: Add the meanings**

In `src/lib/arena.ts`, directly after the line `export type CounterKey = (typeof COUNTER_KEYS)[number];`, add:

```ts

// The Arena's scoring in plain words (round 2 spec 4): one sentence before
// Month 1, and a one-line meaning under each counter.
// Henry to check wording
export const ARENA_SCORE_INTRO =
  "Every choice you make moves three counters, the same three things Avenue watches in real life.";

export const COUNTER_MEANINGS: Record<CounterKey, string> = {
  // Henry to check wording
  pathways: "People who feel they belong and invite others",
  // Henry to check wording
  intersections: "People who come to faith and are apprenticed",
  // Henry to check wording
  streetlights: "Disciples who step out to lead or serve",
};
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: PASS (every earlier arena test still passes, plus this one).

- [ ] **Step 5: Show them in the Arena**

In `src/app/leaders/training/launch/ArenaStep.tsx`, the arena import becomes:

```tsx
import {
  ARENA_SCORE_INTRO,
  bitesFor,
  COUNTER_KEYS,
  COUNTER_MEANINGS,
  detectGaps,
  GAP_TEXT,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type ArenaState,
  type CounterKey,
} from "@/lib/arena";
```

In `CountersBar`, replace:

```tsx
            <p className="night-label mt-1">{COUNTER_NAMES[k]}</p>
```

with:

```tsx
            <p className="night-label mt-1">{COUNTER_NAMES[k]}</p>
            <p className="mt-1 text-xs leading-snug text-[var(--muted)]">{COUNTER_MEANINGS[k]}</p>
```

Add this component directly after `CountersBar`:

```tsx
// Before Month 1 (round 2 spec 4): what the three counters mean, in plain
// words, so a leader knows what their choices move.
function ScoreKey() {
  return (
    <div className="border-y border-[var(--line)] py-5">
      <h4 className="font-serif text-xl text-[var(--ink)]">How the Arena keeps score</h4>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{ARENA_SCORE_INTRO}</p>
      <dl className="mt-4 space-y-3">
        {COUNTER_KEYS.map((k) => (
          <div key={k}>
            <dt className="text-sm font-semibold text-[var(--ink)]">{COUNTER_NAMES[k]}</dt>
            <dd className="text-sm text-[var(--muted)]">{COUNTER_MEANINGS[k]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

In the start screen (the `if (!entered)` branch), replace:

```tsx
        <MonthStreet state={state} />
        <OutcomeButton label="Enter the Arena" onClick={() => setEntered(true)} />
```

with:

```tsx
        <ScoreKey />
        <MonthStreet state={state} />
        <OutcomeButton label="Enter the Arena" onClick={() => setEntered(true)} />
```

- [ ] **Step 6: Run the gates**

`npx tsc --noEmit` clean, `npm test` 268 passing (267 + 1), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/arena.ts src/lib/arena.test.ts src/app/leaders/training/launch/ArenaStep.tsx
git commit -m "Avenue at night 2: how the Arena keeps score, a meaning under each counter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

At 375 px and desktop, `/leaders/training/launch`, go to the Arena step (step 8) with no picks (use "Play it again" first if a run is saved, then replay to leave the saved state as you found it, or use a fresh `@example.invalid` leader):
- The start screen shows "How the Arena keeps score", the one sentence, and Pathways, Intersections, Streetlights each with its meaning, before the month lamps and "Enter the Arena".
- During a month and on the result screen, each counter shows its meaning in small muted text under the label. At 375 px the three columns wrap their meanings without overlapping or scrolling sideways.
- The ending screen shows the same meanings under the counters.

---

### Task 8: Multiply, people first

**Files:**
- Modify: `src/app/leaders/training/Phase5Multiply.tsx` (imports at lines 3-9, the props interface at lines 48-64, and the whole default export at lines 183-355; `APPRENTICE_STEPS`, `apprenticeStepLabel`, `NetworkPerson`, `NetworkDepth`, `FIELD` and `AddPersonForm` stay exactly as they are)
- Modify: `src/app/leaders/training/page.tsx` (the subtitle and intro lines, the Multiply label, the `<Phase5Multiply` call)

**Interfaces:**
- Consumes: `Expander` (Task 5); `ClampedText` (Task 3, already on the hub); `multiplySummary` (Task 1).
- Produces: `Phase5Multiply` gains two props, `teachingTitle: string` (the phase subtitle, "Paul & Timothy Legacy") and `teaching: string` (the phase description). The hub no longer shows either above Multiply.

- [ ] **Step 1: Imports and props**

In `src/app/leaders/training/Phase5Multiply.tsx`, the imports become:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, ChevronDown, CheckCircle2, Circle, UserPlus } from "lucide-react";
import { rungAfterTap } from "@/lib/apprentice";
import { multiplySummary } from "@/lib/phaseSummaries";
import type { Person } from "@/lib/people";
import IcnuEditor from "./IcnuEditor";
import Glow from "@/components/avenue/Glow";
import Expander from "@/components/avenue/Expander";
```

In `interface Phase5MultiplyProps`, add after `addingPerson: boolean;`:

```tsx
  teachingTitle: string; // the phase subtitle, shown inside "Why multiply?"
  teaching: string; // the Paul and Timothy teaching (phase description)
```

- [ ] **Step 2: Replace the default export**

Replace the whole `export default function Phase5Multiply(...)` (from its leading comment `// Phase 5 (Multiply) content, shown instead of the modules grid.` to the end of the file) with:

```tsx
// Phase 5 (Multiply), round 2 spec 5: people first. The person list and the
// add form lead, then one summary line and the family tree link, then the
// teaching behind "Why multiply?". State and handlers come from
// useNetworkView and useMyPeople via the page. Each row is person-first: a
// private ICNU note plus a five-rung apprenticeship checklist, collapsed
// until tapped so the list stays scannable.
export default function Phase5Multiply({
  sentByViewer,
  networkLoaded,
  networkError,
  networkDepth,
  stepUpdatingId,
  stepError,
  setApprenticeStep,
  people,
  peopleLoaded,
  peopleError,
  ensurePersonForNetwork,
  patchPerson,
  icnuDrafts,
  addPerson,
  addingPerson,
  teachingTitle,
  teaching,
}: Phase5MultiplyProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <div className="space-y-10">
      {/* Your people: the core of the phase, a list on the night ground */}
      <div>
        <span className="eyebrow">Your people</span>
        <h3 className="night-h2 mt-1 mb-4">Who you&rsquo;re sending out</h3>
        {!networkLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your network...</p>
        ) : networkError ? (
          <p className="text-sm text-red-400">{networkError}</p>
        ) : sentByViewer.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--ink)]">
              No one yet. Add someone you&rsquo;re apprenticing, then tap their name for your
              &ldquo;What I see in you&rdquo; note and the five apprenticeship steps.
            </p>
            <AddPersonForm addPerson={addPerson} addingPerson={addingPerson} startOpen />
          </div>
        ) : (
          <div className="space-y-4">
            {peopleError && <p className="text-red-400 text-sm">{peopleError}</p>}
            <ul className="border-t border-[var(--line)]">
              {sentByViewer.map((person) => {
                const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
                const isOpen = expandedId === person.id;
                const isUpdating = stepUpdatingId === person.id;
                const linked = people.find((p) => p.networkPersonId === person.id);
                return (
                  <li key={person.id} className="border-b border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : person.id)}
                      aria-expanded={isOpen}
                      className="w-full min-h-[44px] flex items-center gap-3 text-left py-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-serif text-xl text-[var(--ink)]">{name}</p>
                        <p
                          className={`text-sm mt-0.5 ${
                            person.apprenticeStep >= 1 ? "text-[var(--lamp)]" : "text-[var(--muted)]"
                          }`}
                        >
                          {apprenticeStepLabel(person.apprenticeStep)}
                        </p>
                      </div>
                      <Glow
                        trigger={person.apprenticeStep}
                        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full p-1"
                      >
                        {[1, 2, 3, 4, 5].map((rung) => (
                          <span
                            key={rung}
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 rounded-full ${
                              rung <= person.apprenticeStep
                                ? "bg-[var(--lamp)] shadow-[0_0_8px_2px_rgba(255,197,107,0.45)]"
                                : "bg-[var(--line-2)]"
                            }`}
                          />
                        ))}
                      </Glow>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--muted)] transition-transform flex-shrink-0 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-5 space-y-4">
                        {peopleLoaded && !peopleError && (
                          <IcnuEditor
                            networkPerson={person}
                            linked={linked}
                            ensurePersonForNetwork={ensurePersonForNetwork}
                            patchPerson={patchPerson}
                            icnuDrafts={icnuDrafts}
                          />
                        )}
                        <div>
                          <span className="eyebrow">Apprenticeship steps</span>
                          <div className="space-y-1 mt-2">
                            {APPRENTICE_STEPS.filter((s) => s.value >= 1).map(({ value: rung, label }) => (
                              <button
                                key={rung}
                                type="button"
                                onClick={() => setApprenticeStep(person.id, rungAfterTap(person.apprenticeStep, rung))}
                                disabled={isUpdating}
                                aria-pressed={rung <= person.apprenticeStep}
                                className="min-h-[44px] w-full flex items-center gap-3 text-left disabled:opacity-50"
                              >
                                {rung <= person.apprenticeStep ? (
                                  <CheckCircle2 className="w-5 h-5 text-[var(--lamp)] flex-shrink-0" />
                                ) : (
                                  <Circle className="w-5 h-5 text-[var(--dim)] flex-shrink-0" />
                                )}
                                <span className="text-sm text-[var(--ink)]">{label}</span>
                              </button>
                            ))}
                          </div>
                          {stepError?.id === person.id && (
                            <p className="text-xs text-red-400 mt-1">{stepError.message}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <AddPersonForm addPerson={addPerson} addingPerson={addingPerson} startOpen={false} />
          </div>
        )}
      </div>

      {/* One summary line, then the family tree as a single link. A
          network error is already shown in the list above, so it is not
          repeated here. */}
      <div>
        {networkLoaded && !networkError ? (
          <p className="text-sm text-[var(--ink)]">{multiplySummary(networkDepth)}</p>
        ) : null}
        <Link
          href="/leaders/network"
          className="mt-1 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--accent)]"
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          See the family tree
        </Link>
      </div>

      {/* The teaching, behind an expander */}
      <div className="border-b border-[var(--line)]">
        <Expander id="multiply-why" title="Why multiply?" open={whyOpen} onToggle={() => setWhyOpen((o) => !o)}>
          <p className="night-label">{teachingTitle}</p>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">{teaching}</p>
          <p className="mt-6 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">
            Hero Maker&rsquo;s five practices: Multiplication Thinking, Permission Giving, Disciple
            Multiplying, Gift Activating, Kingdom Building.
          </p>
        </Expander>
      </div>
    </div>
  );
}
```

Against today: the person list, the rows and the add form are unchanged; the Hero Maker line moved into the expander; "This is the beginning: nobody is multiplying below you yet." and the depth sentence became the one `multiplySummary` line; the family tree card became a single link.

- [ ] **Step 3: Hub: move the teaching into Multiply**

In `src/app/leaders/training/page.tsx`, replace the two lines under `<PhaseOpening ... />`:

```tsx
                {phase.subtitle !== phase.scripture ? <p className="night-label mt-6">{phase.subtitle}</p> : null}
                <ClampedText text={phase.description} className="mt-4" />
```

with:

```tsx
                {/* Multiply shows its subtitle and teaching inside "Why multiply?" (round 2 spec 5). */}
                {!isMultiplyPhase && phase.subtitle !== phase.scripture ? (
                  <p className="night-label mt-6">{phase.subtitle}</p>
                ) : null}
                {!isMultiplyPhase ? <ClampedText text={phase.description} className="mt-4" /> : null}
```

Delete the Multiply label block:

```tsx
                {isMultiplyPhase ? (
                  <p className="night-label mt-4">
                    {/* Gated on networkLoaded/networkError so it never flashes
                        "Sending nobody yet" before the network has loaded. */}
                    {!networkLoaded
                      ? "Loading..."
                      : networkError
                        ? "Could not load"
                        : sentByViewer.length === 0
                          ? "Sending nobody yet"
                          : `Sending ${sentByViewer.length} out`}
                  </p>
                ) : null}
```

In the `<Phase5Multiply` call, add after `addingPerson={addingPerson}`:

```tsx
                      teachingTitle={phase.subtitle}
                      teaching={phase.description}
```

- [ ] **Step 4: Run the gates**

`npx tsc --noEmit` clean, `npm test` 268 passing (unchanged), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/leaders/training/Phase5Multiply.tsx src/app/leaders/training/page.tsx
git commit -m "Avenue at night 2: Multiply leads with people, teaching behind Why multiply

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Controller browser check**

At 375 px and desktop, `/leaders/training?phase=phase5`:
- Order: the phase opening, then straight to "Your people / Who you're sending out" and the list (or the empty instruction and the open add form), then one summary line ("Nobody sent out yet" or "1 person multiplying through 1 generation below you"), then a "See the family tree" link (44 px, goes to `/leaders/network`), then a closed "Why multiply?" row.
- No "SENDING NOBODY YET" label, no "Paul & Timothy Legacy" label and no teaching paragraph above the list; no family tree card.
- Opening "Why multiply?" shows "Paul & Timothy Legacy", the full teaching and the Hero Maker five practices; Enter and Space toggle it; `aria-expanded` flips.
- The list still works: open a person, tick and untick a rung (Glow plays unless reduced motion), edit the ICNU note; add a person with an `@example.invalid` email, then delete that fixture by exact email and run `npm run guard` (must print `clean`).
- Other phases still show their subtitle label and the Read more intro.

---

### Task 9: Leader Support and Workshop Hub move to Admin

**Files:**
- Modify: `src/app/leaders/page.tsx` (lucide imports, the `tools` list, the pending-access line)
- Modify: `src/app/leaders/training/calling/ConversationStep.tsx` (lines 3 and 34-39)
- Modify: `src/app/leaders/training/calling/content.ts:310` (`supportLink`)
- Modify: `src/app/leaders/admin/page.tsx` (imports, and the top of the unlocked view at about lines 146-149)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CONVERSATION_CONTENT` loses `supportLink` (its only user was ConversationStep; no test references it; `content.test.ts` only checks the whole module for em dashes, which still passes).

Spec 5b. The Support and Workshop pages and their access rules are unchanged: this task only moves links. Build it as specced: Henry's explicit decision was "remove everywhere" (pre-flight F6). In the task report, note that a leader waiting for access now has no in-app link to book the first pastor call.

- [ ] **Step 1: Dashboard Tools list**

In `src/app/leaders/page.tsx`, delete these two lines from the lucide-react import list:

```tsx
  HeadphonesIcon,
```

```tsx
  BarChart2,
```

Delete these two entries from `tools`:

```tsx
    { id: "support", title: "Leader Support", icon: HeadphonesIcon, href: "/leaders/support" },
```

```tsx
    { id: "workshops", title: "Workshop Hub", icon: BarChart2, href: "/leaders/workshops" },
```

Replace the pending-access line:

```tsx
          <p className="mt-6 text-sm italic text-[var(--muted)]">
            Your access opens after your first call with a pastor.{" "}
            <Link href="/leaders/support" className="inline-flex min-h-[44px] items-center not-italic text-[var(--accent)]">
              Book it through Leader Support
            </Link>
          </p>
```

with:

```tsx
          <p className="mt-6 text-sm italic text-[var(--muted)]">Your access opens after your first call with a pastor.</p>
```

(`Link` is still used by the Tools list, so its import stays.)

- [ ] **Step 2: Calling section 6**

In `src/app/leaders/training/calling/ConversationStep.tsx`, delete line 3:

```tsx
import Link from "next/link";
```

and delete the link under the body:

```tsx
        <Link
          href="/leaders/support"
          className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
        >
          {CONVERSATION_CONTENT.supportLink}
        </Link>
```

In `src/app/leaders/training/calling/content.ts`, delete the line:

```ts
  supportLink: "Book it through Leader Support",
```

Then confirm nothing else uses either: `grep -rn "supportLink\|/leaders/support\|/leaders/workshops" src --include=*.ts --include=*.tsx` must list only the Support and Workshop pages themselves (their own internal links) and the Admin row added in Step 3.

- [ ] **Step 3: Admin link row**

In `src/app/leaders/admin/page.tsx`, add after `import { useRouter } from "next/navigation";`:

```tsx
import Link from "next/link";
```

and add `BarChart2` and `HeadphonesIcon` to the lucide-react import list (after `ArrowLeft,`):

```tsx
  BarChart2,
  HeadphonesIcon,
```

In the unlocked view, replace:

```tsx
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
```

with:

```tsx
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Round 2 spec 5b: the two tools that left the leader dashboard. */}
        <nav aria-label="Admin tools" className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/leaders/support"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)] hover:text-white"
          >
            <HeadphonesIcon className="h-4 w-4" aria-hidden="true" />
            Leader Support
          </Link>
          <Link
            href="/leaders/workshops"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border)] px-4 text-sm text-[var(--muted)] hover:text-white"
          >
            <BarChart2 className="h-4 w-4" aria-hidden="true" />
            Workshop Hub
          </Link>
        </nav>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
```

If that three-line anchor is not unique in the file (it appears only once today, in the unlocked view), stop and report rather than guess.

- [ ] **Step 4: Run the gates**

`npx tsc --noEmit` clean, `npm test` 268 passing (unchanged), `npm run lint` at most 54, `npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/leaders/page.tsx src/app/leaders/training/calling/ConversationStep.tsx src/app/leaders/training/calling/content.ts src/app/leaders/admin/page.tsx
git commit -m "Avenue at night 2: Leader Support and Workshop Hub move to Admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Controller browser check**

At 375 px and desktop:
- `/leaders` Tools list: Leader Training, Discipleship Network, Weekly Pathways Topics, Resources, Admin. No Leader Support, no Workshop Hub.
- With a leader who has no full access yet: the italic line reads "Your access opens after your first call with a pastor." with no link.
- `/leaders/training/calling`, section 6: the title, the body, the checkbox and the date; no "Book it through Leader Support" link.
- `/leaders/admin` after the admin key: a row of two 44 px pill links, "Leader Support" and "Workshop Hub", above the Admin header; each opens its page, which works as before (same access rules). The lock screen is unchanged.

---

### Task 10: Final pass (controller-run)

**Files:** none new. Fixes found here go in their own small commits with exact paths.

- [ ] **Step 1: Gates on the whole branch**

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
npm run guard
```

Expected: tsc prints nothing; 268 tests pass; lint at most 54 problems; build passes; guard prints `clean`.

- [ ] **Step 2: Protected files untouched**

```bash
git diff --stat main...HEAD -- src/app/leaders/training/useTrainingProgress.ts src/app/leaders/training/progressMerge.ts src/lib/journey.ts src/lib/useWorksheet.ts src/app/leaders/training/useCheckins.ts src/app/leaders/training/useNetworkView.ts src/lib/useMyPeople.ts src/lib/auth.ts src/app/api
```

Expected: no output.

- [ ] **Step 3: No em dashes, and every new copy line is marked**

```bash
git diff main...HEAD | grep "^+" | python -c "import sys; print(sys.stdin.read().count(chr(0x2014)))"
grep -rn "Henry to check wording" src | wc -l
```

Expected: `0` em dashes added, and exactly 10 marker lines:

| File | Marked lines |
|---|---|
| `src/lib/rpms.ts` | 4 (Relational, Physical, Mental, Spiritual meanings) |
| `src/lib/phaseSummaries.ts` | 2 (Leader health and Church health intros) |
| `src/lib/arena.ts` | 4 (score intro, three counter meanings) |

- [ ] **Step 4: Whole-journey browser pass**

At 375 px and desktop, reduced motion on and off, walk: `/leaders` (avatar, Tools list), `/leaders/training` every phase (titles, Read more, Growth expanders, sliders, calendar, trend, Multiply order), both wizards (avatar, Arena scoring card), Calling Profile and Launch Plan (avatar on screen, print preview unchanged), `/leaders/admin` (link row). Keyboard through the avatar panel (Escape, focus return), one slider, one expander, one calendar row. Delete any `@example.invalid` fixture by exact email, then `npm run guard` prints `clean`.

- [ ] **Step 5: Update the ledger**

Mark every task done in `.superpowers/sdd/avenue-night-2/progress.md` with its commit hash and review verdict. Do not push.
