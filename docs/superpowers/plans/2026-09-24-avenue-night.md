# Avenue at Night Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Leadership Journey (hub, Calling and Launch wizards, Arena, Calling Profile, Launch Plan), the leader dashboard and the login page as "Avenue at night": a street with five stops, a streetlight lit for each phase walked, serif type for titles, questions and scripture, and animation only for milestones.

**Architecture:** Every rule that decides anything visual (which stop is walked, here or ahead, the greeting, the status line, when a moment or a glow plays, the verses) is a pure module with Vitest tests: `src/lib/avenue.ts`, `src/lib/moments.ts`, `src/app/leaders/training/verses.ts`. Six small presentational components live in `src/components/avenue/`. Night tokens and component CSS live in `globals.css`, scoped under `.avenue-night` so the public site is untouched. Screens swap their markup for the new components; no hook, API call, save path or completion rule changes.

**Tech Stack:** Next.js 16 (App Router, React Compiler on), React 19, TypeScript, Tailwind 4, `next/font/google` (Geist, Geist Mono, Newsreader), Vitest 4 (node environment, `src/**/*.test.ts` only, so components are checked by tsc, lint, build and the controller's browser pass), lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-24-avenue-night-design.md`. **Visual reference:** `docs/superpowers/specs/2026-09-24-avenue-night-mockup.html` (every colour, coordinate and timing below was copied from it). **Verses:** `.superpowers/sdd/avenue-night/verses.md` (overrides spec section 5: fill the text now). Read the spec before starting any task.

## Global Constraints

- **Branch `feat/avenue-night`.** It exists and holds the spec and mockup commits.
- **Never `git push`.** Commit locally only. Henry says "push" when he wants a deploy.
- **Never `git add`** `HANDOVER.md`, `HANDOVER-v2.md`, `HANDOVER_PROMPT*.md`, `.mcp.json`, `scripts/demo-network.mjs`. Always `git add` exact paths, never `git add -A` or `git add .`.
- **Presentation only.** Do not change saving, auth, API calls, completion rules, or `useTrainingProgress.ts` / `progressMerge.ts` (no edit to either file on this branch). Do not change `src/lib/journey.ts`, `src/lib/useWorksheet.ts`, `useCheckins.ts`, `useNetworkView.ts`, `useMyPeople.ts`, or any `src/app/api/**` file. Reading their values is fine.
- **Print output of the Calling Profile and Launch Plan stays black on white**, with the same boxes and the same content as today (`@media print` rules in `globals.css`).
- **Never use an em dash (U+2014)** anywhere: code, comments, UI copy, commit messages, this plan. Use a colon, a comma, or a new sentence. En dashes (U+2013) only in number ranges such as `Ephesians 4:11–12`. In tests build an em dash with `String.fromCharCode(0x2014)`; never type one (the Write tool turns a backslash-u 2014 escape into the real character).
- **Respect `prefers-reduced-motion`.** Moments only, pages still: no scroll reveals, no hover motion, no idle animation on journey screens. Under reduced motion a moment shows its lit end state instantly and a glow does not pulse.
- **Colour meaning:** blue `#4f7cff` (`--accent`) = you are here, primary buttons, focus of the current step. Warm lamp `#ffc56b` (`--lamp`) = walked, done, lit. Glow only on light (lamps, lit steps, the one lit card). No other gradients.
- **Type:** Newsreader (`font-serif`) for phase titles, big questions, scripture and section headings; Geist for everything else. Uppercase mono only for small status labels (`.night-label`, the stop line, the verse reference).
- **Mobile first at 375 px:** single column, 16 px side gutter, no horizontal page scroll, every tap target at least 44 px, keyboard focus ring in lamp colour (from `.avenue-night :focus-visible`).
- **`.panel` gotcha:** `.panel` and `.avenue-night .panel` set unlayered border colours, so a Tailwind border colour utility on a `.panel` needs the Tailwind 4 `!` suffix.
- **No staging DB.** This branch writes nothing. If the controller signs in a test leader for browser checks, fixtures use only `@example.invalid` emails, deleted by exact email, and `npm run guard` must print `clean` before and after.
- **Gates at the end of every task** (the implementer runs 1 to 4; stop the dev server before 4 because it shares `.next`):
  1. `npx tsc --noEmit` prints nothing.
  2. `npm test`: 187 passing at the start of the branch; the count only goes up.
  3. `npm run lint`: 55 to 56 problems. Never above 56. If a task legitimately removes an unused import and the count drops, record the new number in the report; do not chase lint elsewhere.
  4. `npm run build` passes.
- **Commits** end with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Browser checks are the controller's job.** Implementers have no browser. Each UI task ends with a "Controller browser check" step listing exactly what to look at, at 375 px and desktop, with reduced motion on and off where motion is involved.
- Use the Write tool for any file over a few lines; heredocs through Bash mangle backslashes. Keep scratch `.mjs` / `.txt` files out of `src/` and out of lint.

## Decisions made while planning (spec gaps)

| Where | Decision | Why |
|---|---|---|
| Spec 5 | Verse text filled from `verses.md` now, each entry commented `// NLT: Henry to verify wording` | Henry's override ("just put in NLT, I will check later") |
| Verse display | No outer quotation marks; the verse is serif italic followed by "(NLT)" | Three of the five passages start with or contain speech marks, so outer quotes would double up. The text stays verbatim |
| Stop line | "Stop N of 5 · Ephesians 4" uses a short chapter reference; the full reference sits under the verse | Matches the mockup (`Stop 2 of 5 · Ephesians 4`, then `EPHESIANS 4:11–12`) |
| Where a moment plays | A fixed card at the bottom of the viewport, with a "Carry on" button to close it | The leader may be scrolled far from the map when they tick the last module, and the wizard moves to the next step right after "Save my yes". A fixed card is always seen |
| Moment detection | A flag must be seen `false` and then `true` while the page is open. First load only records a baseline | Spec 3: "no stored seen flag". A reload never replays |
| Two moments at once | Phase walked wins over the smaller milestone (priority order in `MOMENT_KEYS`) | Finishing the last Calling section by booking the conversation is one moment, not two |
| Hub default phase | With no `?phase=`, the hub opens the "here" stop (all walked: Growth) instead of always Foundations | The map says "you are here"; opening somewhere else contradicts it |
| Hub header ring and phase rings | Removed (percentage rings are what the spec replaces) | Spec "Why" and 4.1 |
| Phone street on the dashboard | No here-panel button on the dashboard | The next-step card below is the one lit call to action; two buttons would compete |
| Dashboard Multiply status | Read from the dashboard's existing `/api/network` response (same request, now with an `ok` check) | No new API call. If it fails, the map still shows and one amber line says Multiply may read as ahead |
| Calling Profile and Launch Plan headers | Screen shows `PhaseOpening`; the old title block is kept `hidden print:block`; new serif section headings print like the old eyebrows via a print rule | Keeps print output unchanged |
| Arena counters | Warm numerals, no glow | Glow is reserved for the leader's own small actions (spec 3) |
| Lamp labels | Short labels (`CALLING_LAMP_LABELS`, `LAUNCH_LAMP_LABELS`) taken from the mockup where it has them | Full step titles do not fit a 72 px lamp |

## Pre-flight rulings (controller, 24 Sep; see `.superpowers/sdd/avenue-night/preflight.md`)

Already folded into the task text below.

- **F1 (Task 1):** CSS classes name `var(--font-newsreader), Georgia, serif` directly; `@theme` `--font-serif` only feeds the `font-serif` utility.
- **F2 (Task 1):** Task 1 rewrites the four existing em dash comments (globals.css x3, layout.tsx x1) so the Task 13 check can pass.
- **F3 (Task 6):** The hub waits for `journeyLoaded` (worksheets, check-ins, network) before drawing the status line and map, and before choosing the default phase.
- **F4 (Task 6):** `CallingCard` and `LaunchCard` render `LampSteps` only once their worksheet has loaded without error, so no lamp glows on load.
- **F5 (Task 8):** The launch-date moment needs a valid date whose year is this year or later.
- **F6 (Task 1):** The lamp focus ring and the night `--muted` also apply inside `.av-moment`, which sits outside `.avenue-night` in the wizards.
- **F7 (Tasks 1, 3):** Map stop buttons carry `av-map-hit`, whose focus outline sits inside the button (`outline-offset: -4px`).
- **F8 (Task 7):** Foundations section headers are a plain `night-label`, with no lamp colour.
- **F9 (Task 1):** `.avenue-night .eyebrow` is muted, not blue.
- **F10 (Task 10):** Print keeps `space-y-4` (`print:space-y-4`), and checkboxes print in their default colour (`print:accent-auto`).
- **F11 (Tasks 1, 9):** `.av-step h2` gets the full serif question style. `.av-step h3` gets family and weight only. The Arena h3s add `text-2xl`.
- **F12 (Task 11):** Remove the unused `Image` import from the dashboard and record the lint count.
- **F13 (Tasks 7, 8):** Line numbers corrected for Phase4Growth and the Calling page.
- **F14 (Task 10):** Eleven sections, not twelve; Step 6 also greps for em dashes.
- **F15 (Tasks 2, 6, 11):** New pure `apprenticesOnRung(people, viewerId)` in `avenue.ts` with tests, used by the hub and the dashboard. The other duplication is accepted as deliberate.
- **F16 (Tasks 1, 3, 6):** Text colours come from tokens (`--ink`, `--dim`, `--muted`, `--accent`, `--lamp`, new `--ink-2`). The hub video close button is 44 px with a label.
- **F17 (Tasks 7, 8, 11):** Accept that the next-step card waits on `/api/network`. Browser checks delete every fixture row by exact email, then `npm run guard` must print `clean`.

## File map

| File | Status | Task | Responsibility |
|---|---|---|---|
| `src/app/globals.css` | Modify | 1 | Night tokens, `--font-serif`, `.avenue-night`, night card/section/heading/label classes, lamp steps, phase opening, moment, glow, reduced motion, print rules |
| `src/app/layout.tsx` | Modify | 1 | Load Newsreader via `next/font/google` |
| `src/lib/avenue.ts` | Create | 2 | `avenueStops`, `stopWalked`, `streetStatusLine`, `hereActionFor`, `greetingFor`, `melbourneHour`, `partOfDay`, `apprenticesOnRung`, lamp labels |
| `src/lib/avenue.test.ts` | Create | 2 | Tests |
| `src/components/avenue/AvenueStreet.tsx` | Create | 3 | Vertical phone street |
| `src/components/avenue/AvenueMap.tsx` | Create | 3 | Map A SVG (md and up), AvenueStreet below md |
| `src/lib/moments.ts` | Create | 4 | `advanceFlags`, `flagsSignature`, `pickMoment`, `momentCopy`, `shouldGlow` |
| `src/lib/moments.test.ts` | Create | 4 | Tests |
| `src/components/avenue/useMoment.ts` | Create | 4 | Hook: flags in, moment to play out |
| `src/components/avenue/Moment.tsx` | Create | 4 | The ignite card |
| `src/components/avenue/Glow.tsx` | Create | 4 | 600 ms warm pulse wrapper |
| `src/app/leaders/training/verses.ts` | Create | 5 | Five NLT passages and the NLT notice |
| `src/app/leaders/training/verses.test.ts` | Create | 5 | Tests |
| `src/components/avenue/PhaseOpening.tsx` | Create | 5 | Stop line, serif phase name, verse |
| `src/components/avenue/LampSteps.tsx` | Create | 5 | Row of step lamps |
| `src/components/avenue/JourneyFooter.tsx` | Create | 5 | NLT notice footer |
| `src/app/leaders/training/page.tsx` | Modify | 6 | Hub: greeting, map, openings, footer, phase-walked moments |
| `src/app/leaders/training/CallingCard.tsx` | Rewrite | 6 | Lamp steps plus the two links |
| `src/app/leaders/training/LaunchCard.tsx` | Rewrite | 6 | Lamp steps plus the two links |
| `src/app/leaders/training/PhaseModules.tsx` | Modify | 7 | Foundations as a clean list with lamp ticks |
| `src/app/leaders/training/Phase4Growth.tsx` | Modify | 7 | Check-in card first, three metric columns, history |
| `src/app/leaders/training/Phase5Multiply.tsx` | Modify | 7 | Person list with lamp-dot rungs |
| `src/components/journey/WizardShell.tsx` | Modify | 8 | PhaseOpening plus LampSteps instead of "STEP n OF N" and the bar |
| `src/app/leaders/training/calling/page.tsx` | Modify | 8 | New shell props, Calling moments |
| `src/app/leaders/training/launch/page.tsx` | Modify | 8 | New shell props, Launch moments |
| `src/app/leaders/training/launch/ArenaStep.tsx` | Modify | 9 | Month street, warm counters, lit ending street |
| `src/app/leaders/training/calling/profile/page.tsx` | Modify | 10 | Night screen, print unchanged |
| `src/app/leaders/training/launch/plan/page.tsx` | Modify | 10 | Night screen, print unchanged |
| `src/components/journey/NextStepCard.tsx` | Modify | 11 | Compact map plus the one lit card |
| `src/app/leaders/page.tsx` | Modify | 11 | Greeting, order, hairline tool list, Multiply count from the existing network read |
| `src/app/login/page.tsx` | Modify | 12 | Night street behind the form, serif heading |

---

### Task 1: Night tokens, Newsreader and journey CSS

**Files:**
- Modify: `src/app/globals.css` (`:root` lines 3-19, `@theme inline` lines 21-26, the three comment lines 193, 225 and 240, new block inserted before the PRINT block at line 265, print block lines 268-299)
- Modify: `src/app/layout.tsx:2-14`, `:22` (comment) and `:118`

**Interfaces:**
- Consumes: nothing.
- Produces (every later task relies on these exact names):
  - CSS variables: `--night`, `--night-2`, `--line`, `--line-2`, `--ink`, `--ink-2`, `--dim`, `--lamp`, `--lamp-2`, `--lamp-soft`, `--accent-soft`, `--font-newsreader` (from layout), Tailwind `font-serif`.
  - Classes: `.avenue-night`, `.night-card`, `.night-card-lit`, `.night-section`, `.night-h2`, `.night-label`, `.av-step`, `.av-map-hit`, `.av-lamps`, `.av-lamps-dense`, `.av-lamp`, `.is-lit`, `.is-current`, `.av-lamp-glass`, `.av-lamp-post`, `.av-lamp-label`, `.av-opening`, `.av-opening-small`, `.av-stop`, `.av-bulb`, `.av-phase-title`, `.av-verse`, `.av-verse-ref`, `.av-moment`, `.av-halo`, `.av-bulbfill`, `.av-glow-a`, `.av-glow-b`.
  - CSS classes name the serif as `var(--font-newsreader), Georgia, serif` directly (F1); `--font-serif` exists only for Tailwind's `font-serif` utility.

- [ ] **Step 1: Add the night tokens to `:root`**

In `src/app/globals.css`, directly after the line `  --accent: #4f7cff;        /* single refined blue, used sparingly */` (line 18) and before the closing `}` of `:root`, insert:

```css

  /* ---- Avenue at night (spec 2026-09-24 avenue-night, section 1) ---- */
  --night: #05070c;        /* page ground on journey screens */
  --night-2: #0a0e16;      /* raised surfaces that take input */
  --line: #1b2230;         /* hairline */
  --line-2: #263042;       /* stronger hairline */
  --ink: #eef1f7;          /* primary text on night */
  --ink-2: #dfe4ee;        /* softer text: verses, the here-panel line */
  --dim: #566074;          /* things ahead */
  --lamp: #ffc56b;         /* walked, done, lit */
  --lamp-2: #ffdca0;
  --lamp-soft: rgba(255, 197, 107, 0.16);
  --accent-soft: rgba(79, 124, 255, 0.14);
```

- [ ] **Step 2: Add the serif font to the Tailwind theme**

Replace the `@theme inline` block (lines 21-26) with:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-serif: var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}
```

- [ ] **Step 3: Add the Avenue at night block**

Insert this whole block immediately before the comment line `/* PRINT: Calling Profile and Launch Plan                       */` block (that is, before the `/* ===...=== */` line that opens the PRINT section, currently line 265). Values are copied from the mockup.

```css
/* ============================================================ */
/* AVENUE AT NIGHT: leader journey, dashboard and login          */
/* Glow only on light. No gradients except the light itself.     */
/* ============================================================ */

.avenue-night {
  --muted: #8b94a7;
  background: var(--night);
  color: var(--ink);
  min-height: 100vh;
}
/* The moment card is fixed and, in the wizards, rendered outside
   .avenue-night, so it carries the same focus ring and muted colour (F6). */
.avenue-night :focus-visible,
.av-moment :focus-visible {
  outline: 2px solid var(--lamp);
  outline-offset: 3px;
}
/* Map stop buttons fill the clipped map, so their ring sits inside (F7). */
.av-map-hit:focus-visible {
  outline-offset: -4px;
}
/* Eyebrows are quiet labels on the night ground; blue means "you are here" (F9). */
.avenue-night .eyebrow {
  color: var(--muted);
}
/* Existing panels inside a journey screen take the night surface. */
.avenue-night .panel {
  background: var(--night-2);
  border-color: var(--line);
  border-radius: 18px;
}

/* A raised surface that takes input. */
.night-card {
  background: var(--night-2);
  border: 1px solid var(--line);
  border-radius: 18px;
}
/* The one lit card on a page: a pool of lamp light in its corner. */
.night-card-lit {
  background: radial-gradient(120% 90% at 85% -10%, rgba(255, 197, 107, 0.1), transparent 55%), var(--night-2);
  border: 1px solid rgba(255, 197, 107, 0.35);
  border-radius: 18px;
}
/* A section sitting on the night ground: a hairline above, no box.
   Screen only, so printed sections keep their .panel boxes. */
@media screen {
  .avenue-night .night-section {
    background: transparent;
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
    padding: 1.5rem 0 0;
  }
}
.night-h2 {
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 400;
  font-size: 1.5rem;
  line-height: 1.15;
  color: var(--ink);
}
/* Small status labels: the only uppercase mono on journey screens. */
.night-label {
  font-family: var(--font-geist-mono), ui-monospace, Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
/* Wizard steps: every question (h2) is a serif question. Smaller h3s keep
   their own size utilities and only take the serif face (F11). */
.av-step h2 {
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 400;
  font-size: 1.5rem;
  line-height: 1.2;
}
.av-step h3 {
  font-family: var(--font-newsreader), Georgia, serif;
  font-weight: 400;
}

/* Lamp steps (mockup section 2, .lamps) */
.av-lamps {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-end;
}
.av-lamp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 72px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
}
button.av-lamp {
  cursor: pointer;
}
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
/* Six Arena months must fit one row at 375 px. */
.av-lamps-dense {
  gap: 2px;
}
.av-lamps-dense .av-lamp {
  width: 46px;
}
.av-lamps-dense .av-lamp-label {
  font-size: 10.5px;
}

/* Phase opening (mockup section 2, .opening) */
.av-opening {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: clamp(24px, 5vw, 56px);
  background: radial-gradient(120% 90% at 85% -10%, rgba(255, 197, 107, 0.1), transparent 55%), var(--night-2);
}
.av-opening-small {
  padding: clamp(20px, 4vw, 32px);
}
.av-stop {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--muted);
  font-family: var(--font-geist-mono), ui-monospace, Consolas, monospace;
  font-size: 11.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.av-bulb {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--lamp);
  box-shadow: 0 0 0 4px var(--lamp-soft), 0 0 22px 4px rgba(255, 197, 107, 0.55);
}
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
.av-opening-small .av-phase-title {
  font-size: clamp(40px, 7vw, 64px);
  margin: 12px 0 14px;
}
.av-verse {
  font-family: var(--font-newsreader), Georgia, serif;
  font-style: italic;
  font-size: clamp(19px, 2.6vw, 26px);
  line-height: 1.4;
  max-width: 30ch;
  color: var(--ink-2);
  margin: 0;
}
.av-opening-small .av-verse {
  font-size: clamp(17px, 2vw, 20px);
  max-width: 44ch;
}
.av-verse-ref {
  margin: 10px 0 0;
  font-family: var(--font-geist-mono), ui-monospace, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lamp);
}

/* The moment (mockup section 2, .moment): a lamp that ignites. */
.av-moment {
  --muted: #8b94a7;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 24px 20px;
  text-align: center;
  background: var(--night-2);
  border: 1px solid var(--line-2);
  border-radius: 18px;
}
.av-moment::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(60% 55% at 50% 30%, rgba(255, 197, 107, 0.22) 0%, rgba(255, 197, 107, 0.05) 45%, transparent 70%);
  animation: av-pool 1.2s ease forwards;
}
.av-moment > * {
  position: relative;
}
.av-halo {
  opacity: 0;
  transform-origin: 60px 34px;
  transform: scale(0.6);
  animation: av-ignite 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
.av-bulbfill {
  animation: av-bulb 0.9s ease forwards;
}
@keyframes av-ignite {
  0% { opacity: 0; transform: scale(0.6); }
  35% { opacity: 1; }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes av-bulb {
  from { fill: #1a2130; }
  to { fill: #ffc56b; }
}
@keyframes av-pool {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Glow: a 600 ms warm pulse. Two identical keyframes so switching class
   restarts the animation without remounting the children. */
.av-glow-a {
  animation: av-glow-a 600ms ease-out;
}
.av-glow-b {
  animation: av-glow-b 600ms ease-out;
}
@keyframes av-glow-a {
  0% { box-shadow: 0 0 0 0 rgba(255, 197, 107, 0); }
  30% { box-shadow: 0 0 18px 4px rgba(255, 197, 107, 0.45); }
  100% { box-shadow: 0 0 0 0 rgba(255, 197, 107, 0); }
}
@keyframes av-glow-b {
  0% { box-shadow: 0 0 0 0 rgba(255, 197, 107, 0); }
  30% { box-shadow: 0 0 18px 4px rgba(255, 197, 107, 0.45); }
  100% { box-shadow: 0 0 0 0 rgba(255, 197, 107, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .av-halo,
  .av-bulbfill,
  .av-moment::before,
  .av-glow-a,
  .av-glow-b {
    animation: none;
  }
  .av-halo {
    opacity: 1;
    transform: none;
  }
  .av-bulbfill {
    fill: #ffc56b;
  }
}

```

- [ ] **Step 4: Keep print black on white**

Inside the existing `@media print { ... }` block, directly before its closing `}` (after the `.print-page a { text-decoration: none; }` rule), add:

```css
  .avenue-night {
    background: #fff !important;
    color: #000 !important;
  }
  /* New serif section headings print exactly like the old eyebrows. */
  .print-page .night-h2 {
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    line-height: 1.5;
    text-transform: uppercase;
  }
```

- [ ] **Step 5: Load Newsreader**

In `src/app/layout.tsx` change line 2 to:

```ts
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
```

After the `geistMono` block (after line 14) add:

```ts
// The serif for phase titles, big questions and scripture (Avenue at night).
// Variable font: weight 400 and 500 plus the optical size axis.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});
```

Change the body `className` (line 118) to:

```tsx
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased bg-black text-white`}
```

- [ ] **Step 5b: Remove the four existing em dashes (F2)**

Both files already contain an em dash in a comment, which would fail the Task 13 check. Rewrite only these comments. Below, `[dash]` stands for the U+2014 character on that line today; do not type one.

| File:line | Today | Becomes |
|---|---|---|
| `src/app/globals.css:193` | `/* FACELIFT [dash] shared primitives ... */` | `/* FACELIFT: shared primitives                                 */` |
| `src/app/globals.css:225` | `/* Solid panel [dash] replaces frosted glass (backdrop-blur bg-white/10) */` | `/* Solid panel: replaces frosted glass (backdrop-blur bg-white/10) */` |
| `src/app/globals.css:240` | `/* Eyebrow label [dash] small accent kicker above section headings. */` | `/* Eyebrow label: small accent kicker above section headings. */` |
| `src/app/layout.tsx:22` | `  // metadata.icons here [dash] it overrides those files.` | `  // metadata.icons here, because it overrides those files.` |

Then run: `grep -c $'\xe2\x80\x94' src/app/globals.css src/app/layout.tsx`. Expected: `0` for both.

- [ ] **Step 6: Run the gates**

Run: `npx tsc --noEmit` (expect no output), `npm test` (expect 187 passed), `npm run lint` (expect 55 to 56 problems), then with the dev server stopped `npm run build` (expect success; the build downloads Newsreader). If the build rejects `axes` for Newsreader, report the exact error rather than guessing a fix.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "Avenue at night: night tokens, Newsreader and journey CSS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

Nothing uses the classes yet. On any page at desktop, run in the console: `getComputedStyle(document.body).getPropertyValue('--font-newsreader')` (expect a non-empty family name), `getComputedStyle(document.documentElement).getPropertyValue('--lamp')` (expect `#ffc56b`), and `document.body.insertAdjacentHTML('beforeend','<h2 class="night-h2" id="t">x</h2>'); getComputedStyle(document.getElementById('t')).fontFamily` (expect it to start with the Newsreader family, not Geist; then remove `#t`). Check the public home page and `/leaders` look unchanged.

---

### Task 2: Stops, status line, next action and greeting (pure, TDD)

**Files:**
- Create: `src/lib/avenue.ts`
- Test: `src/lib/avenue.test.ts`

**Interfaces:**
- Consumes: `CALLING_TOTAL`, `LAUNCH_TOTAL`, `type CallingSectionId`, `type LaunchStepId` from `src/lib/journey.ts`.
- Produces:
  - `STOP_IDS = ["phase1","phase2","phase3","phase4","phase5"] as const`, `type StopId`, `type StopStatus = "walked" | "here" | "ahead"`, `STOP_NAMES: Record<StopId, string>`, `STATUS_LABEL: Record<StopStatus, string>`
  - `interface AvenueStop { id: StopId; number: number; name: string; status: StopStatus }`
  - `interface AvenueProgress { foundationsDone: number; foundationsTotal: number; callingDone: number; launchDone: number; checkinCount: number; apprenticesOnRung: number }`
  - `stopWalked(id: StopId, p: AvenueProgress): boolean`
  - `avenueStops(p: AvenueProgress): AvenueStop[]`
  - `streetStatusLine(stops: AvenueStop[]): string`
  - `interface HereAction { text: string; label: string; href: string }`, `hereActionFor(id: StopId, p: AvenueProgress): HereAction`
  - `melbourneHour(now: Date): number`, `partOfDay(hour: number): "morning" | "afternoon" | "evening"`, `greetingFor(now: Date, name: string | null | undefined): string`
  - `interface RungPerson { sentOutBy: string | null; apprenticeStep?: number }`, `apprenticesOnRung(people: RungPerson[], viewerId: string | null): number` (F15: the one count of "people this leader sent out on rung 1 or above", used by the hub and the dashboard)
  - `CALLING_LAMP_LABELS: Record<CallingSectionId, string>`, `LAUNCH_LAMP_LABELS: Record<LaunchStepId | "arena" | "plan", string>`

- [ ] **Step 1: Write the failing tests**

`src/lib/avenue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
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

const fresh: AvenueProgress = {
  foundationsDone: 0,
  foundationsTotal: 4,
  callingDone: 0,
  launchDone: 0,
  checkinCount: 0,
  apprenticesOnRung: 0,
};
const statuses = (p: AvenueProgress) => avenueStops(p).map((s) => s.status);

describe("avenueStops", () => {
  it("puts a new leader at Foundations with everything else ahead", () => {
    expect(statuses(fresh)).toEqual(["here", "ahead", "ahead", "ahead", "ahead"]);
  });
  it("matches the mockup leader: Foundations and Calling walked, standing at Launch", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 3 })).toEqual([
      "walked",
      "walked",
      "here",
      "ahead",
      "ahead",
    ]);
  });
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
  it("never walks Foundations with zero modules", () => {
    expect(statuses({ ...fresh, foundationsTotal: 0 })[0]).toBe("here");
  });
  it("needs every Calling section and every Launch step", () => {
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 5 })[1]).toBe("here");
    expect(statuses({ ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 6 })[2]).toBe("here");
  });
  it("numbers and names the five stops in order", () => {
    const stops = avenueStops(fresh);
    expect(stops.map((s) => s.id)).toEqual([...STOP_IDS]);
    expect(stops.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(stops.map((s) => s.name)).toEqual(["Foundations", "Calling", "Launch", "Growth", "Multiply"]);
  });
});

describe("streetStatusLine", () => {
  it("reads for nobody lit yet", () => {
    expect(streetStatusLine(avenueStops(fresh))).toBe("No streetlights on yet. Foundations is next.");
  });
  it("uses the singular for one light", () => {
    expect(streetStatusLine(avenueStops({ ...fresh, foundationsDone: 4 }))).toBe("One streetlight on. Calling is next.");
  });
  it("matches the mockup line", () => {
    expect(streetStatusLine(avenueStops({ ...fresh, foundationsDone: 4, callingDone: 6 }))).toBe(
      "Two streetlights on. Launch is next."
    );
  });
  it("says so when the whole street is lit", () => {
    const all = { ...fresh, foundationsDone: 4, callingDone: 6, launchDone: 7, checkinCount: 2, apprenticesOnRung: 1 };
    expect(streetStatusLine(avenueStops(all))).toBe("All five streetlights on.");
  });
});

describe("hereActionFor", () => {
  it("points Foundations at the hub phase", () => {
    expect(hereActionFor("phase1", { ...fresh, foundationsDone: 2 })).toEqual({
      text: "2 of 4 Foundations modules ticked.",
      label: "Continue Foundations",
      href: "/leaders/training?phase=phase1",
    });
    expect(hereActionFor("phase1", fresh).label).toBe("Start Foundations");
  });
  it("points Calling and Launch at their wizards", () => {
    expect(hereActionFor("phase2", fresh)).toEqual({
      text: "0 of 6 Calling sections done.",
      label: "Start Calling",
      href: "/leaders/training/calling",
    });
    expect(hereActionFor("phase3", { ...fresh, launchDone: 3 })).toEqual({
      text: "3 of 7 Launch steps done.",
      label: "Continue Launch",
      href: "/leaders/training/launch",
    });
  });
  it("points Growth and Multiply at their hub phases", () => {
    expect(hereActionFor("phase4", fresh).href).toBe("/leaders/training?phase=phase4");
    expect(hereActionFor("phase5", fresh).href).toBe("/leaders/training?phase=phase5");
  });
});

describe("greeting by Melbourne time", () => {
  // 24 Sep 2026 is AEST (UTC+10); daylight saving starts 4 Oct 2026.
  it("reads the Melbourne hour", () => {
    expect(melbourneHour(new Date("2026-09-24T00:00:00Z"))).toBe(10);
    expect(melbourneHour(new Date("2026-09-24T14:00:00Z"))).toBe(0);
  });
  it("splits the day at 5, 12 and 17", () => {
    expect(partOfDay(4)).toBe("evening");
    expect(partOfDay(5)).toBe("morning");
    expect(partOfDay(11)).toBe("morning");
    expect(partOfDay(12)).toBe("afternoon");
    expect(partOfDay(16)).toBe("afternoon");
    expect(partOfDay(17)).toBe("evening");
    expect(partOfDay(0)).toBe("evening");
  });
  it("greets by first name at the boundaries", () => {
    expect(greetingFor(new Date("2026-09-24T01:59:00Z"), "Sam")).toBe("Good morning, Sam.");
    expect(greetingFor(new Date("2026-09-24T02:00:00Z"), "Sam")).toBe("Good afternoon, Sam.");
    expect(greetingFor(new Date("2026-09-24T07:00:00Z"), "Sam")).toBe("Good evening, Sam.");
    expect(greetingFor(new Date("2026-09-24T18:59:00Z"), "Sam")).toBe("Good evening, Sam.");
    expect(greetingFor(new Date("2026-09-24T19:00:00Z"), "Sam")).toBe("Good morning, Sam.");
  });
  it("follows daylight saving", () => {
    // 1 Dec 2026 06:30 UTC is 17:30 AEDT (UTC+11), which would be 16:30 at UTC+10.
    expect(greetingFor(new Date("2026-12-01T06:30:00Z"), "Sam")).toBe("Good evening, Sam.");
  });
  it("uses only the first name, and copes with none", () => {
    expect(greetingFor(new Date("2026-09-24T09:00:00Z"), "  Sam Lee ")).toBe("Good evening, Sam.");
    expect(greetingFor(new Date("2026-09-24T09:00:00Z"), "")).toBe("Good evening.");
    expect(greetingFor(new Date("2026-09-24T09:00:00Z"), null)).toBe("Good evening.");
  });
});

describe("apprenticesOnRung", () => {
  const people = [
    { sentOutBy: "me", apprenticeStep: 0 },
    { sentOutBy: "me", apprenticeStep: 1 },
    { sentOutBy: "me", apprenticeStep: 4 },
    { sentOutBy: "me" },
    { sentOutBy: "someone-else", apprenticeStep: 3 },
    { sentOutBy: null, apprenticeStep: 2 },
  ];
  it("counts only people this leader sent out, on rung 1 or above", () => {
    expect(apprenticesOnRung(people, "me")).toBe(2);
  });
  it("counts nobody before the viewer is known", () => {
    expect(apprenticesOnRung(people, null)).toBe(0);
    expect(apprenticesOnRung([], "me")).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/avenue.test.ts`
Expected: FAIL, "Failed to resolve import ./avenue" (the module does not exist yet).

- [ ] **Step 3: Write the implementation**

`src/lib/avenue.ts`:

```ts
// The journey as an avenue at night (spec 2026-09-24 avenue-night, 2.1 and
// 4.1). Pure. Which stops are walked, where the leader stands, the one line
// of status, the next action at the stop they are at, and the greeting.
import { CALLING_TOTAL, LAUNCH_TOTAL, type CallingSectionId, type LaunchStepId } from "@/lib/journey";

export const STOP_IDS = ["phase1", "phase2", "phase3", "phase4", "phase5"] as const;
export type StopId = (typeof STOP_IDS)[number];
export type StopStatus = "walked" | "here" | "ahead";

export const STOP_NAMES: Record<StopId, string> = {
  phase1: "Foundations",
  phase2: "Calling",
  phase3: "Launch",
  phase4: "Growth",
  phase5: "Multiply",
};

export const STATUS_LABEL: Record<StopStatus, string> = {
  walked: "Walked",
  here: "You are here",
  ahead: "Ahead",
};

export interface AvenueStop {
  id: StopId;
  number: number;
  name: string;
  status: StopStatus;
}

export interface AvenueProgress {
  foundationsDone: number;
  foundationsTotal: number;
  callingDone: number;
  launchDone: number;
  checkinCount: number; // every saved weekly check-in, any week
  apprenticesOnRung: number; // people this leader sent out on rung 1 or above
}

// Spec 2.1. Growth and Multiply are rhythms, so they are walked once the
// rhythm has started: one check-in, or one apprentice on the first rung.
export function stopWalked(id: StopId, p: AvenueProgress): boolean {
  switch (id) {
    case "phase1":
      return p.foundationsTotal > 0 && p.foundationsDone >= p.foundationsTotal;
    case "phase2":
      return p.callingDone >= CALLING_TOTAL;
    case "phase3":
      return p.launchDone >= LAUNCH_TOTAL;
    case "phase4":
      return p.checkinCount >= 1;
    case "phase5":
      return p.apprenticesOnRung >= 1;
  }
}

// The first stop not walked is "here"; every other stop not walked is
// "ahead". Nothing is locked: this only decides how each lamp is drawn.
export function avenueStops(p: AvenueProgress): AvenueStop[] {
  let hereTaken = false;
  return STOP_IDS.map((id, i) => {
    let status: StopStatus = "walked";
    if (!stopWalked(id, p)) {
      status = hereTaken ? "ahead" : "here";
      hereTaken = true;
    }
    return { id, number: i + 1, name: STOP_NAMES[id], status };
  });
}

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five"];

// "Two streetlights on. Launch is next."
export function streetStatusLine(stops: AvenueStop[]): string {
  const here = stops.find((s) => s.status === "here");
  if (!here) return "All five streetlights on.";
  const lit = stops.filter((s) => s.status === "walked").length;
  const lights =
    lit === 0 ? "No streetlights on yet." : `${COUNT_WORDS[lit]} ${lit === 1 ? "streetlight" : "streetlights"} on.`;
  return `${lights} ${here.name} is next.`;
}

export interface HereAction {
  text: string;
  label: string;
  href: string;
}

// The one next action shown where the leader stands (phone street).
export function hereActionFor(id: StopId, p: AvenueProgress): HereAction {
  switch (id) {
    case "phase1":
      return {
        text: `${p.foundationsDone} of ${p.foundationsTotal} Foundations modules ticked.`,
        label: p.foundationsDone === 0 ? "Start Foundations" : "Continue Foundations",
        href: "/leaders/training?phase=phase1",
      };
    case "phase2":
      return {
        text: `${p.callingDone} of ${CALLING_TOTAL} Calling sections done.`,
        label: p.callingDone === 0 ? "Start Calling" : "Continue Calling",
        href: "/leaders/training/calling",
      };
    case "phase3":
      return {
        text: `${p.launchDone} of ${LAUNCH_TOTAL} Launch steps done.`,
        label: p.launchDone === 0 ? "Start Launch" : "Continue Launch",
        href: "/leaders/training/launch",
      };
    case "phase4":
      return {
        text: "Your first weekly check-in lights this streetlight.",
        label: "Check in now",
        href: "/leaders/training?phase=phase4",
      };
    case "phase5":
      return {
        text: "Move someone you're apprenticing onto the first rung to light this one.",
        label: "Open Multiply",
        href: "/leaders/training?phase=phase5",
      };
  }
}

// The hour (0 to 23) in Melbourne, daylight saving included.
export function melbourneHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour");
  if (!hour) throw new Error("Could not read the Melbourne hour");
  return Number(hour.value);
}

export function partOfDay(hour: number): "morning" | "afternoon" | "evening" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// "Good evening, Sam." by Melbourne time, first name only.
export function greetingFor(now: Date, name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const part = partOfDay(melbourneHour(now));
  return first ? `Good ${part}, ${first}.` : `Good ${part}.`;
}

export interface RungPerson {
  sentOutBy: string | null;
  apprenticeStep?: number;
}

// People this leader sent out who are on the first apprenticeship rung or
// above (spec 2.1, Multiply). One definition for the hub and the dashboard.
// No viewer yet means nobody can be counted as theirs.
export function apprenticesOnRung(people: RungPerson[], viewerId: string | null): number {
  if (viewerId === null) return 0;
  return people.filter((p) => p.sentOutBy === viewerId && (p.apprenticeStep ?? 0) >= 1).length;
}

// Short labels for the lamp steps (a lamp is 72 px wide).
export const CALLING_LAMP_LABELS: Record<CallingSectionId, string> = {
  layers: "What is a calling",
  callable: "Callable",
  shared: "Shared call",
  apest: "Specific call",
  seasonal: "Seasonal call",
  conversation: "Conversation",
};

export const LAUNCH_LAMP_LABELS: Record<LaunchStepId | "arena" | "plan", string> = {
  prayer: "Pray first",
  mission: "Mission group",
  space: "Space",
  team: "Launch team",
  intentional: "Live it",
  rhythm: "Launch date",
  invite: "Invite",
  arena: "The Arena",
  plan: "Your plan",
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/avenue.test.ts`
Expected: PASS, 21 tests.

- [ ] **Step 5: Run the gates**

`npx tsc --noEmit` clean, `npm test` (187 + 21 = 208 passing), `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/avenue.ts src/lib/avenue.test.ts
git commit -m "Avenue at night: stops, status line, next action and greeting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

No browser check: pure logic.

---

### Task 3: AvenueMap (map A) and AvenueStreet (phone)

**Files:**
- Create: `src/components/avenue/AvenueStreet.tsx`
- Create: `src/components/avenue/AvenueMap.tsx`

**Interfaces:**
- Consumes: `STATUS_LABEL`, `type AvenueStop`, `type HereAction`, `type StopId` from `src/lib/avenue.ts` (Task 2); CSS tokens (`--ink`, `--ink-2`, `--dim`, `--lamp`, `--accent`) and `.av-map-hit` from Task 1.
- Produces:
  - `AvenueStreet` default export, props `{ stops: AvenueStop[]; selectedId: StopId | null; onSelect: (id: StopId) => void; hereAction: HereAction | null; onAction?: () => void }`
  - `AvenueMap` default export, props `{ stops: AvenueStop[]; selectedId: StopId | null; onSelect: (id: StopId) => void; hereAction: HereAction | null; onAction?: () => void; compact?: boolean }`. Renders the SVG from `md` up and `AvenueStreet` below `md`.

- [ ] **Step 1: Write AvenueStreet**

`src/components/avenue/AvenueStreet.tsx` (geometry from mockup section 3: dot 14 px at left 5 px, line 2 px at left 11 px, serif 24 px names, 12.5 px status):

```tsx
"use client";

import Link from "next/link";
import { STATUS_LABEL, type AvenueStop, type HereAction, type StopId } from "@/lib/avenue";

export interface AvenueStreetProps {
  stops: AvenueStop[];
  selectedId: StopId | null;
  onSelect: (id: StopId) => void;
  hereAction: HereAction | null;
  onAction?: () => void;
}

// The phone street (spec 2, mockup section 3): one street running down the
// screen, lit in lamp light from each walked stop to the next. The stop the
// leader is at opens in place with its one next action. Every stop name is
// a button that opens that phase.
export default function AvenueStreet({ stops, selectedId, onSelect, hereAction, onAction }: AvenueStreetProps) {
  return (
    <ol className="relative mt-2" aria-label="Your journey">
      {stops.map((stop, i) => {
        const last = i === stops.length - 1;
        const walked = stop.status === "walked";
        const here = stop.status === "here";
        const selected = selectedId === stop.id;
        return (
          <li key={stop.id} className="relative pb-6 pl-10">
            {!last ? (
              <span
                aria-hidden="true"
                className={`absolute left-[11px] top-[13px] -bottom-[13px] w-[2px] ${
                  walked ? "bg-[var(--lamp)]" : "bg-[var(--line-2)]"
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`absolute left-[5px] top-[6px] h-[14px] w-[14px] rounded-full ${
                walked
                  ? "bg-[var(--lamp)] shadow-[0_0_16px_4px_rgba(255,197,107,0.5)]"
                  : here
                    ? "border-2 border-[var(--accent)] bg-[var(--night-2)] shadow-[0_0_0_5px_var(--accent-soft)]"
                    : "border border-[var(--line-2)] bg-[#131926]"
              }`}
            />
            <button
              type="button"
              onClick={() => onSelect(stop.id)}
              aria-current={selected ? "true" : undefined}
              className="block min-h-[44px] w-full text-left"
            >
              <span
                className={`block font-serif text-2xl leading-tight ${
                  stop.status === "ahead" ? "text-[var(--dim)]" : "text-[var(--ink)]"
                } ${selected ? "underline decoration-[var(--line-2)] underline-offset-8" : ""}`}
              >
                {stop.name}
              </span>
              <span className={`mt-0.5 block text-[12.5px] ${here ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {STATUS_LABEL[stop.status]}
              </span>
            </button>
            {here && hereAction ? (
              <div className="mt-3 rounded-[14px] border border-[var(--line-2)] p-4">
                <p className="mb-3 text-[13.5px] text-[var(--ink-2)]">{hereAction.text}</p>
                <Link
                  href={hereAction.href}
                  onClick={onAction}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
                >
                  {hereAction.label}
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Write AvenueMap**

`src/components/avenue/AvenueMap.tsx` (every coordinate and colour from mockup option A, `viewBox 0 0 1000 420`, lamps at x 120, 310, 500, 690, 880):

```tsx
"use client";

import { useId } from "react";
import { STATUS_LABEL, type AvenueStop, type HereAction, type StopId } from "@/lib/avenue";
import AvenueStreet from "./AvenueStreet";

export interface AvenueMapProps {
  stops: AvenueStop[];
  selectedId: StopId | null;
  onSelect: (id: StopId) => void;
  hereAction: HereAction | null;
  onAction?: () => void;
  compact?: boolean; // dashboard: crops the sky
}

const LAMP_X = [120, 310, 500, 690, 880];
const STARS: [number, number, number][] = [
  [60, 40, 1],
  [180, 80, 1.2],
  [320, 30, 0.9],
  [470, 70, 1],
  [610, 26, 1.3],
  [760, 60, 0.9],
  [900, 34, 1.1],
  [960, 96, 0.8],
  [120, 120, 0.7],
  [540, 110, 0.8],
];
// Text colours come from the tokens (spec 2: text colours from tokens only).
// SVG presentation attributes do not take var(), so text sets fill via style.
const STATUS_FILL = { walked: "var(--lamp)", here: "var(--accent)", ahead: "var(--dim)" } as const;

// Map A (spec 2): the avenue seen from the side, five lamp posts in a row.
// Walked stops are lit (warm head, halo, cone of light), the current stop
// has a blue outlined head and a blue "you are here" dot, stops ahead are
// dim. The SVG is decoration; a transparent button over each lamp is the
// real control (av-map-hit keeps its focus ring inside the clipped map).
// Below md the vertical AvenueStreet is shown instead.
export default function AvenueMap({ stops, selectedId, onSelect, hereAction, onAction, compact = false }: AvenueMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glowId = `av-cone-${uid}`;
  const haloId = `av-halo-${uid}`;
  if (stops.length !== LAMP_X.length) throw new Error(`AvenueMap needs exactly five stops, got ${stops.length}`);

  return (
    <div>
      <div className="relative hidden overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--night-2)] md:block">
        <svg viewBox={compact ? "0 70 1000 350" : "0 0 1000 420"} aria-hidden="true" className="block h-auto w-full">
          <defs>
            <radialGradient id={glowId} cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#ffc56b" stopOpacity={0.55} />
              <stop offset="60%" stopColor="#ffc56b" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={haloId}>
              <stop offset="0%" stopColor="#ffdca0" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width="1000" height="420" fill="#07090f" />
          <g fill="#c9d3ea" opacity={0.55}>
            {STARS.map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
          <rect x="0" y="300" width="1000" height="120" fill="#0b0f18" />
          <line x1="0" y1="300" x2="1000" y2="300" stroke="#1f2736" />
          <line x1="0" y1="350" x2="1000" y2="350" stroke="#2b3446" strokeDasharray="18 16" />
          {stops.map((stop, i) => {
            const x = LAMP_X[i];
            if (stop.status === "walked") {
              return (
                <g key={stop.id}>
                  <polygon points={`${x},120 ${x - 60},300 ${x + 60},300`} fill={`url(#${glowId})`} />
                  <circle cx={x} cy={112} r={34} fill={`url(#${haloId})`} />
                  <rect x={x - 2} y={112} width={4} height={188} fill="#3a4458" />
                  <rect x={x - 16} y={104} width={32} height={10} rx={3} fill="#ffc56b" />
                </g>
              );
            }
            if (stop.status === "here") {
              return (
                <g key={stop.id}>
                  <rect x={x - 2} y={112} width={4} height={188} fill="#3a4458" />
                  <rect x={x - 16} y={104} width={32} height={10} rx={3} fill="#1a2130" stroke="#4f7cff" strokeWidth={2} />
                  <circle cx={x} cy={322} r={9} fill="#4f7cff" />
                  <circle cx={x} cy={322} r={18} fill="none" stroke="#4f7cff" strokeOpacity={0.35} strokeWidth={2} />
                </g>
              );
            }
            return (
              <g key={stop.id}>
                <rect x={x - 2} y={112} width={4} height={188} fill="#252d3c" />
                <rect x={x - 16} y={104} width={32} height={10} rx={3} fill="#161c28" />
              </g>
            );
          })}
          <g style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }} fontSize={26} textAnchor="middle">
            {stops.map((stop, i) => (
              <text key={stop.id} x={LAMP_X[i]} y={392} style={{ fill: stop.status === "ahead" ? "var(--dim)" : "var(--ink)" }}>
                {stop.name}
              </text>
            ))}
          </g>
          <g style={{ fontFamily: "var(--font-geist-mono), monospace" }} fontSize={11} letterSpacing={2} textAnchor="middle">
            {stops.map((stop, i) => (
              <text key={stop.id} x={LAMP_X[i]} y={410} style={{ fill: STATUS_FILL[stop.status] }}>
                {STATUS_LABEL[stop.status].toUpperCase()}
              </text>
            ))}
          </g>
          {stops.map((stop, i) =>
            stop.id === selectedId ? (
              <line
                key={`sel-${stop.id}`}
                x1={LAMP_X[i] - 44}
                x2={LAMP_X[i] + 44}
                y1={417}
                y2={417}
                stroke="#eef1f7"
                strokeOpacity={0.5}
                strokeWidth={2}
              />
            ) : null
          )}
        </svg>
        {stops.map((stop, i) => (
          <button
            key={stop.id}
            type="button"
            onClick={() => onSelect(stop.id)}
            aria-label={`${stop.name}: ${STATUS_LABEL[stop.status]}`}
            aria-current={selectedId === stop.id ? "true" : undefined}
            className="av-map-hit absolute top-0 h-full rounded-xl"
            style={{ left: `${(LAMP_X[i] - 95) / 10}%`, width: "19%" }}
          />
        ))}
      </div>
      <div className="md:hidden">
        <AvenueStreet
          stops={stops}
          selectedId={selectedId}
          onSelect={onSelect}
          hereAction={hereAction}
          onAction={onAction}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the gates**

`npx tsc --noEmit` clean, `npm test` 208 passing, `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/avenue/AvenueStreet.tsx src/components/avenue/AvenueMap.tsx
git commit -m "Avenue at night: the avenue map and the phone street

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Controller browser check**

Not wired to a page until Task 6; the reviewer compares the SVG numbers with mockup option A. The visual check happens in Task 6.

---

### Task 4: Moments and glow (pure rules with TDD, then the components)

**Files:**
- Create: `src/lib/moments.ts`
- Test: `src/lib/moments.test.ts`
- Create: `src/components/avenue/useMoment.ts`
- Create: `src/components/avenue/Moment.tsx`
- Create: `src/components/avenue/Glow.tsx`

**Interfaces:**
- Consumes: `STOP_NAMES`, `type StopId` from `src/lib/avenue.ts`; `formatIsoDate` from `src/lib/launch.ts`; CSS classes `.av-moment`, `.av-halo`, `.av-bulbfill`, `.av-glow-a`, `.av-glow-b` (Task 1).
- Produces:
  - `type Flags = Record<string, boolean>`
  - `MOMENT_KEYS` (priority order) and `type MomentKey = "walked:phase1" | "walked:phase2" | "walked:phase3" | "walked:phase4" | "walked:phase5" | "sharedYes" | "conversationBooked" | "launchDate"`
  - `advanceFlags(seen: Flags | null, now: Flags): { seen: Flags; fired: string[] }`
  - `flagsSignature(flags: Flags): string`
  - `pickMoment(fired: string[]): MomentKey | null`
  - `interface MomentCopy { title: string; caption: string }`, `momentCopy(key: MomentKey, ctx: { today: Date; launchDate?: string }): MomentCopy`
  - `type GlowTrigger = string | number | null`, `shouldGlow(prev: GlowTrigger, next: GlowTrigger): boolean`
  - `useMoment(flags: Flags, launchDate?: string): { moment: ActiveMoment | null; dismiss: () => void }` with `interface ActiveMoment extends MomentCopy { key: MomentKey; n: number }`
  - `Moment` default export, props `{ title: string; caption: string; play: boolean; playKey?: number; onDismiss: () => void }`
  - `Glow` default export, props `{ trigger: GlowTrigger; children: ReactNode; className?: string; as?: "span" | "div" }`

- [ ] **Step 1: Write the failing tests**

`src/lib/moments.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { advanceFlags, flagsSignature, momentCopy, pickMoment, shouldGlow } from "./moments";

describe("advanceFlags", () => {
  it("only records a baseline the first time", () => {
    expect(advanceFlags(null, { sharedYes: true })).toEqual({ seen: { sharedYes: true }, fired: [] });
  });
  it("fires a flag seen false and now true", () => {
    expect(advanceFlags({ sharedYes: false }, { sharedYes: true }).fired).toEqual(["sharedYes"]);
  });
  it("does not fire a flag that was already true, or turns false", () => {
    expect(advanceFlags({ sharedYes: true }, { sharedYes: true }).fired).toEqual([]);
    expect(advanceFlags({ sharedYes: true }, { sharedYes: false }).fired).toEqual([]);
  });
  it("baselines a flag that appears late (its data just loaded) without firing", () => {
    const first = advanceFlags(null, {});
    const second = advanceFlags(first.seen, { "walked:phase4": true });
    expect(second.fired).toEqual([]);
    expect(advanceFlags(second.seen, { "walked:phase4": true }).fired).toEqual([]);
  });
  it("keeps a flag it has seen when the flag drops out while reloading", () => {
    const seen = advanceFlags(null, { "walked:phase5": false }).seen;
    const reloading = advanceFlags(seen, {});
    expect(reloading.seen).toEqual({ "walked:phase5": false });
    expect(advanceFlags(reloading.seen, { "walked:phase5": true }).fired).toEqual(["walked:phase5"]);
  });
});

describe("flagsSignature", () => {
  it("ignores key order", () => {
    expect(flagsSignature({ a: true, b: false })).toBe(flagsSignature({ b: false, a: true }));
  });
  it("changes when a value changes", () => {
    expect(flagsSignature({ a: true })).not.toBe(flagsSignature({ a: false }));
  });
});

describe("pickMoment", () => {
  it("prefers a phase walked over a smaller milestone", () => {
    expect(pickMoment(["conversationBooked", "walked:phase2"])).toBe("walked:phase2");
  });
  it("returns the milestone when it is alone, and null for nothing or unknown keys", () => {
    expect(pickMoment(["sharedYes"])).toBe("sharedYes");
    expect(pickMoment([])).toBeNull();
    expect(pickMoment(["somethingElse"])).toBeNull();
  });
});

describe("momentCopy", () => {
  const today = new Date(2026, 8, 24);
  it("dates the yes to the Shared Call, as in the mockup", () => {
    expect(momentCopy("sharedYes", { today })).toEqual({
      title: "You said yes.",
      caption: "24 September 2026 · the Shared Call",
    });
  });
  it("names the phase walked", () => {
    expect(momentCopy("walked:phase3", { today }).title).toBe("Launch is walked.");
    expect(momentCopy("walked:phase1", { today }).caption).toBe("A streetlight is on, and it stays on.");
  });
  it("gives the launch date when it has one", () => {
    expect(momentCopy("launchDate", { today, launchDate: "2026-10-03" })).toEqual({
      title: "Your launch date is set.",
      caption: "Launching 3 October 2026",
    });
  });
  it("never contains an em dash", () => {
    const keys = ["walked:phase1", "walked:phase2", "walked:phase3", "walked:phase4", "walked:phase5", "sharedYes", "conversationBooked", "launchDate"] as const;
    for (const key of keys) {
      expect(JSON.stringify(momentCopy(key, { today, launchDate: "2026-10-03" }))).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe("shouldGlow", () => {
  it("glows when a lamp lights, not when it goes out", () => {
    expect(shouldGlow(null, "lit")).toBe(true);
    expect(shouldGlow("lit", null)).toBe(false);
    expect(shouldGlow("lit", "lit")).toBe(false);
  });
  it("glows when a number goes up, not down", () => {
    expect(shouldGlow(2, 3)).toBe(true);
    expect(shouldGlow(3, 2)).toBe(false);
    expect(shouldGlow(3, 3)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/moments.test.ts`
Expected: FAIL, "Failed to resolve import ./moments".

- [ ] **Step 3: Write the pure module**

`src/lib/moments.ts`:

```ts
// When a milestone plays its moment and when a small action glows (spec 3).
// Pure. Nothing is stored: a moment plays only when a flag is seen false and
// then true while the page is open, so a reload never replays one.
import { STOP_NAMES, type StopId } from "@/lib/avenue";
import { formatIsoDate } from "@/lib/launch";

export type Flags = Record<string, boolean>;

// Priority order: a phase walked outranks the smaller milestones.
export const MOMENT_KEYS = [
  "walked:phase1",
  "walked:phase2",
  "walked:phase3",
  "walked:phase4",
  "walked:phase5",
  "sharedYes",
  "conversationBooked",
  "launchDate",
] as const;
export type MomentKey = (typeof MOMENT_KEYS)[number];

// The first call records a baseline and fires nothing. A key that appears
// later (its data has just loaded) is recorded without firing. A key that
// drops out while its data reloads keeps its last seen value.
export function advanceFlags(seen: Flags | null, now: Flags): { seen: Flags; fired: string[] } {
  const fired = seen === null ? [] : Object.keys(now).filter((k) => seen[k] === false && now[k] === true);
  return { seen: { ...(seen ?? {}), ...now }, fired };
}

// A stable string for a set of flags, so a hook can tell when they changed.
export function flagsSignature(flags: Flags): string {
  return JSON.stringify(
    Object.keys(flags)
      .sort()
      .map((k) => [k, flags[k]])
  );
}

export function pickMoment(fired: string[]): MomentKey | null {
  for (const key of MOMENT_KEYS) if (fired.includes(key)) return key;
  return null;
}

export interface MomentCopy {
  title: string;
  caption: string;
}

export function momentCopy(key: MomentKey, ctx: { today: Date; launchDate?: string }): MomentCopy {
  switch (key) {
    case "sharedYes": {
      const day = ctx.today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
      return { title: "You said yes.", caption: `${day} · the Shared Call` };
    }
    case "conversationBooked":
      return { title: "Conversation booked.", caption: "Your theology and character conversation with a pastor." };
    case "launchDate":
      return {
        title: "Your launch date is set.",
        caption: ctx.launchDate ? `Launching ${formatIsoDate(ctx.launchDate)}` : "Your streetlight has a date.",
      };
    default: {
      const id = key.slice("walked:".length) as StopId;
      return { title: `${STOP_NAMES[id]} is walked.`, caption: "A streetlight is on, and it stays on." };
    }
  }
}

export type GlowTrigger = string | number | null;

// A lamp glows when it lights (null to a value), a count glows when it goes
// up. Going out, going down or staying the same never glows.
export function shouldGlow(prev: GlowTrigger, next: GlowTrigger): boolean {
  if (next === null || Object.is(prev, next)) return false;
  if (typeof prev === "number" && typeof next === "number") return next > prev;
  return true;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/moments.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Write the hook**

`src/components/avenue/useMoment.ts`. It compares against the flags seen on the previous render, held in state and adjusted during render (React's documented "storing information from previous renders" pattern, which the React Compiler and `eslint-plugin-react-hooks` 7 accept because the `setState` is conditional). No effect, no ref, no storage.

```ts
"use client";

import { useState } from "react";
import {
  advanceFlags,
  flagsSignature,
  momentCopy,
  pickMoment,
  type Flags,
  type MomentCopy,
  type MomentKey,
} from "@/lib/moments";

export interface ActiveMoment extends MomentCopy {
  key: MomentKey;
  n: number; // bumps on every new moment so the card replays
}

// Watches milestone flags and returns the moment to play when one has just
// turned true. Pass only flags whose data has loaded; see advanceFlags.
export function useMoment(flags: Flags, launchDate?: string): { moment: ActiveMoment | null; dismiss: () => void } {
  const sig = flagsSignature(flags);
  const [today] = useState(() => new Date());
  const [tracked, setTracked] = useState<{ sig: string | null; seen: Flags | null }>({ sig: null, seen: null });
  const [moment, setMoment] = useState<ActiveMoment | null>(null);

  if (tracked.sig !== sig) {
    const { seen, fired } = advanceFlags(tracked.seen, flags);
    setTracked({ sig, seen });
    const key = pickMoment(fired);
    if (key) setMoment({ key, n: (moment?.n ?? 0) + 1, ...momentCopy(key, { today, launchDate }) });
  }

  return { moment, dismiss: () => setMoment(null) };
}
```

- [ ] **Step 6: Write the Moment card**

`src/components/avenue/Moment.tsx` (lamp SVG from mockup section 2: `viewBox 0 0 120 150`, halo `cx 60 cy 34 r 46`, post `x 57 y 40 w 6 h 104 #3a4458`, bulb `x 40 y 28 w 40 h 13 rx 4 #1a2130`):

```tsx
"use client";

import { useId } from "react";

export interface MomentProps {
  title: string;
  caption: string;
  play: boolean;
  playKey?: number; // change to replay the ignite
  onDismiss: () => void;
}

// A milestone (spec 2 and 3): a lamp that ignites over about 1.4 s, a serif
// line and a small caption, in a card fixed to the bottom of the screen so
// it is seen wherever the leader has scrolled. Under reduced motion the CSS
// shows the lit state at once. The live region stays mounted so the text is
// announced when a moment appears.
export default function Moment({ title, caption, play, playKey, onDismiss }: MomentProps) {
  const haloId = `av-moment-halo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm"
    >
      {play ? (
        <div key={playKey} className="av-moment pointer-events-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <svg viewBox="0 0 120 150" aria-hidden="true" className="h-auto w-[96px]">
            <defs>
              <radialGradient id={haloId}>
                <stop offset="0%" stopColor="#ffdca0" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle className="av-halo" cx="60" cy="34" r="46" fill={`url(#${haloId})`} />
            <rect x="57" y="40" width="6" height="104" fill="#3a4458" />
            <rect className="av-bulbfill" x="40" y="28" width="40" height="13" rx="4" fill="#1a2130" />
          </svg>
          <p className="mt-1 font-serif text-[26px] leading-tight text-[var(--ink)] md:text-[32px]">{title}</p>
          <p className="text-sm text-[var(--muted)]">{caption}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 min-h-[44px] px-4 text-sm font-semibold text-[var(--accent)]"
          >
            Carry on
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: Write Glow**

`src/components/avenue/Glow.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { shouldGlow, type GlowTrigger } from "@/lib/moments";

export interface GlowProps {
  trigger: GlowTrigger;
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
}

// The gentle version of a moment (spec 2): a 600 ms warm pulse on the thing
// that just changed. Pass trigger "lit" or null for a lamp, or a count that
// glows when it goes up. Never glows on first render. Alternating two
// identical animations restarts the pulse without remounting the children,
// so an input inside keeps its focus.
export default function Glow({ trigger, children, className = "inline-block rounded-full", as = "span" }: GlowProps) {
  const [last, setLast] = useState<GlowTrigger>(trigger);
  const [pulses, setPulses] = useState(0);

  if (!Object.is(last, trigger)) {
    setLast(trigger);
    if (shouldGlow(last, trigger)) setPulses((n) => n + 1);
  }

  const pulse = pulses === 0 ? "" : pulses % 2 === 1 ? "av-glow-a" : "av-glow-b";
  const Tag = as;
  return <Tag className={`${className} ${pulse}`}>{children}</Tag>;
}
```

- [ ] **Step 8: Run the gates**

`npx tsc --noEmit` clean, `npm test` (208 + 15 = 223 passing), `npm run lint` 55 to 56 (if the React Compiler lint flags the render-phase `setState` in `useMoment` or `Glow`, stop and report the exact message instead of rewriting to an effect), `npm run build` passes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/moments.ts src/lib/moments.test.ts src/components/avenue/useMoment.ts src/components/avenue/Moment.tsx src/components/avenue/Glow.tsx
git commit -m "Avenue at night: moment and glow rules, the ignite card and the glow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Controller browser check**

Not wired until Tasks 6 to 8; the reviewer compares the CSS timings (1.4 s ignite, 0.9 s bulb, 600 ms glow) with the mockup. Visual check in Task 8.

---

### Task 5: Verses, PhaseOpening, LampSteps and the NLT footer

**Files:**
- Create: `src/app/leaders/training/verses.ts`
- Test: `src/app/leaders/training/verses.test.ts`
- Create: `src/components/avenue/PhaseOpening.tsx`
- Create: `src/components/avenue/LampSteps.tsx`
- Create: `src/components/avenue/JourneyFooter.tsx`

**Interfaces:**
- Consumes: `STOP_IDS`, `type StopId` (Task 2); `Glow` (Task 4); CSS classes from Task 1.
- Produces:
  - `interface PhaseVerse { reference: string; short: string; text: string | null }`, `VERSES: Record<StopId, PhaseVerse>`, `NLT_NOTICE: string`
  - `PhaseOpening` default export, props `{ stop: number; name: string; reference: string; short: string; verse?: string | null; size?: "large" | "small"; headingLevel?: 1 | 2; children?: ReactNode }`
  - `interface LampStep { id: string; label: string; done: boolean }`; `LampSteps` default export, props `{ steps: LampStep[]; currentIndex: number | null; onSelect?: (index: number) => void; label: string; dense?: boolean }`
  - `JourneyFooter` default export, no props.

- [ ] **Step 1: Write the failing tests**

`src/app/leaders/training/verses.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STOP_IDS } from "@/lib/avenue";
import { NLT_NOTICE, VERSES } from "./verses";

const EM_DASH = String.fromCharCode(0x2014);
const source = readFileSync(fileURLToPath(new URL("./verses.ts", import.meta.url)), "utf8");

describe("verses", () => {
  it("has one passage per stop, in the spec's order", () => {
    expect(Object.keys(VERSES)).toEqual([...STOP_IDS]);
    expect(STOP_IDS.map((id) => VERSES[id].reference)).toEqual([
      "Acts 2:42",
      "Ephesians 4:11–12",
      "Nehemiah 2:17–18",
      "Exodus 18:17–18",
      "2 Timothy 2:2",
    ]);
  });
  it("fills every passage with the staged NLT text", () => {
    for (const id of STOP_IDS) expect((VERSES[id].text ?? "").length).toBeGreaterThan(50);
    expect(VERSES.phase5.text).toBe(
      "You have heard me teach things that have been confirmed by many reliable witnesses. Now teach these truths to other trustworthy people who will be able to pass them on to others."
    );
  });
  it("marks every passage for Henry to verify", () => {
    expect(source.split("// NLT: Henry to verify wording").length - 1).toBe(5);
  });
  it("leaves (NLT) to the page, never inside the text", () => {
    for (const id of STOP_IDS) expect(VERSES[id].text).not.toContain("(NLT)");
  });
  it("renders the Exodus 18:18 dash as a comma", () => {
    expect(VERSES.phase4.text).toContain("wear yourself out, and the people, too.");
  });
  it("contains no em dash anywhere", () => {
    expect(source).not.toContain(EM_DASH);
    expect(NLT_NOTICE).not.toContain(EM_DASH);
  });
  it("carries the NLT notice for web use", () => {
    expect(NLT_NOTICE).toContain("Tyndale House Foundation");
    expect(NLT_NOTICE).toContain("All rights reserved.");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/leaders/training/verses.test.ts`
Expected: FAIL, "Failed to resolve import ./verses".

- [ ] **Step 3: Write verses.ts**

`src/app/leaders/training/verses.ts`. The text is copied exactly from `.superpowers/sdd/avenue-night/verses.md`. The references use an en dash (U+2013) in the verse range; type the character, do not use an escape.

```ts
// One passage per phase (spec 5), New Living Translation. Henry, 24 Sep:
// "just put in NLT, I will check later". The text was typed from memory,
// so every entry carries a marker for his check. Each quote is followed by
// "(NLT)" where it is shown, and the journey footer carries NLT_NOTICE.
import type { StopId } from "@/lib/avenue";

export interface PhaseVerse {
  reference: string; // full reference, shown under the verse
  short: string; // chapter only, for the "Stop N of 5" line
  text: string | null; // null shows the reference as the headline instead
}

export const VERSES: Record<StopId, PhaseVerse> = {
  phase1: {
    reference: "Acts 2:42",
    short: "Acts 2",
    // NLT: Henry to verify wording
    text: "All the believers devoted themselves to the apostles' teaching, and to fellowship, and to sharing in meals (including the Lord's Supper), and to prayer.",
  },
  phase2: {
    reference: "Ephesians 4:11–12",
    short: "Ephesians 4",
    // NLT: Henry to verify wording
    text: "Now these are the gifts Christ gave to the church: the apostles, the prophets, the evangelists, and the pastors and teachers. Their responsibility is to equip God's people to do his work and build up the church, the body of Christ.",
  },
  phase3: {
    reference: "Nehemiah 2:17–18",
    short: "Nehemiah 2",
    // NLT: Henry to verify wording
    text: "But now I said to them, \"You know very well what trouble we are in. Jerusalem lies in ruins, and its gates have been destroyed by fire. Let us rebuild the wall of Jerusalem and end this disgrace!\" Then I told them about how the gracious hand of God had been on me, and about my conversation with the king. They replied at once, \"Yes, let's rebuild the wall!\" So they began the good work.",
  },
  phase4: {
    reference: "Exodus 18:17–18",
    short: "Exodus 18",
    // NLT: Henry to verify wording
    // The NLT has a dash after "wear yourself out"; this site uses no long
    // dashes, so it is a comma here.
    text: "\"This is not good!\" Moses' father-in-law exclaimed. \"You're going to wear yourself out, and the people, too. This job is too heavy a burden for you to handle all by yourself.\"",
  },
  phase5: {
    reference: "2 Timothy 2:2",
    short: "2 Timothy 2",
    // NLT: Henry to verify wording
    text: "You have heard me teach things that have been confirmed by many reliable witnesses. Now teach these truths to other trustworthy people who will be able to pass them on to others.",
  },
};

export const NLT_NOTICE =
  "Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/leaders/training/verses.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write PhaseOpening**

`src/components/avenue/PhaseOpening.tsx`:

```tsx
import type { ReactNode } from "react";

export interface PhaseOpeningProps {
  stop: number;
  name: string;
  reference: string;
  short: string;
  verse?: string | null;
  size?: "large" | "small";
  headingLevel?: 1 | 2;
  children?: ReactNode;
}

// The opening of a stop (spec 2, mockup section 2): "Stop N of 5 · Ephesians
// 4" with a small lit bulb, the phase name in large serif, the verse in serif
// italic followed by (NLT) and the full reference in mono. With no verse
// text, the reference itself is the headline: never guessed text.
export default function PhaseOpening({
  stop,
  name,
  reference,
  short,
  verse,
  size = "large",
  headingLevel = 2,
  children,
}: PhaseOpeningProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={`av-opening ${size === "small" ? "av-opening-small" : ""}`}>
      <p className="av-stop">
        <span className="av-bulb" aria-hidden="true" />
        Stop {stop} of 5 · {short}
      </p>
      <Heading className="av-phase-title">{name}</Heading>
      {verse ? (
        <>
          <p className="av-verse">
            {verse} <span className="text-sm not-italic text-[var(--muted)]">(NLT)</span>
          </p>
          <p className="av-verse-ref">{reference}</p>
        </>
      ) : (
        <p className="av-verse">{reference}</p>
      )}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
```

- [ ] **Step 6: Write LampSteps**

`src/components/avenue/LampSteps.tsx`:

```tsx
"use client";

import Glow from "./Glow";

export interface LampStep {
  id: string;
  label: string;
  done: boolean;
}

export interface LampStepsProps {
  steps: LampStep[];
  currentIndex: number | null;
  onSelect?: (index: number) => void; // omit for a display-only row
  label: string; // accessible name for the whole row
  dense?: boolean; // six narrow lamps for the Arena months
}

// A row of small lamps, one per step (spec 2): lit when complete, a blue ring
// on the current one, wrapping on phones. With onSelect each lamp is a
// button that jumps to its step. A lamp that lights glows once.
export default function LampSteps({ steps, currentIndex, onSelect, label, dense = false }: LampStepsProps) {
  return (
    <ol className={`av-lamps ${dense ? "av-lamps-dense" : ""}`} aria-label={label}>
      {steps.map((step, i) => {
        const current = i === currentIndex;
        const cls = `av-lamp ${step.done ? "is-lit" : ""} ${current ? "is-current" : ""}`;
        const inner = (
          <>
            <Glow trigger={step.done ? "lit" : null}>
              <span className="av-lamp-glass" aria-hidden="true" />
            </Glow>
            <span className="av-lamp-post" aria-hidden="true" />
            <span className="av-lamp-label">{step.label}</span>
            <span className="sr-only">
              {step.done ? ", done" : ", not done yet"}
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

- [ ] **Step 7: Write JourneyFooter**

`src/components/avenue/JourneyFooter.tsx`:

```tsx
import { NLT_NOTICE } from "@/app/leaders/training/verses";

// The NLT copyright notice required for web use (spec 5), at the foot of
// every journey screen that quotes a verse. Not printed.
export default function JourneyFooter() {
  return (
    <footer className="no-print mt-16 border-t border-[var(--line)] pt-6">
      <p className="max-w-[70ch] text-xs leading-relaxed text-[var(--dim)]">{NLT_NOTICE}</p>
    </footer>
  );
}
```

- [ ] **Step 8: Run the gates**

`npx tsc --noEmit` clean, `npm test` (223 + 7 = 230 passing), `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 9: Commit**

```bash
git add src/app/leaders/training/verses.ts src/app/leaders/training/verses.test.ts src/components/avenue/PhaseOpening.tsx src/components/avenue/LampSteps.tsx src/components/avenue/JourneyFooter.tsx
git commit -m "Avenue at night: NLT verses, phase opening, lamp steps and footer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Controller browser check**

Not wired until Task 6. Controller confirms the five verse texts in `verses.ts` match `.superpowers/sdd/avenue-night/verses.md` character for character.

---

### Task 6: Journey hub: greeting, map, phase openings and phase-walked moments

**Files:**
- Rewrite: `src/app/leaders/training/page.tsx` (whole file; every hook call and its arguments are kept exactly)
- Rewrite: `src/app/leaders/training/CallingCard.tsx`
- Rewrite: `src/app/leaders/training/LaunchCard.tsx`

**Interfaces:**
- Consumes: `avenueStops`, `hereActionFor`, `streetStatusLine`, `greetingFor`, `stopWalked`, `apprenticesOnRung`, `STOP_IDS`, `CALLING_LAMP_LABELS`, `LAUNCH_LAMP_LABELS`, `type AvenueProgress`, `type StopId` (Task 2); `AvenueMap` (Task 3); `useMoment`, `Moment` (Task 4); `VERSES`, `PhaseOpening`, `LampSteps`, `JourneyFooter` (Task 5); from `src/lib/journey.ts`: `CALLING_SECTION_IDS`, `CALLING_TOTAL`, `LAUNCH_STEP_IDS`, `LAUNCH_TOTAL`, `callingSectionComplete`, `launchStepComplete`, `callingCompleteCount`, `launchCompleteCount`.
- Produces:
  - `CallingCard` props change to `{ data: Partial<CallingData>; loaded: boolean; error: string | null }`.
  - `LaunchCard` props change to `{ data: Partial<LaunchData>; loaded: boolean; error: string | null }`.
  - The hub keeps passing the same props to `Phase4Growth`, `Phase5Multiply` and `PhaseModules` (Task 7 restyles those).

- [ ] **Step 1: Rewrite CallingCard**

`src/app/leaders/training/CallingCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LampSteps from "@/components/avenue/LampSteps";
import { CALLING_LAMP_LABELS } from "@/lib/avenue";
import { CALLING_SECTION_IDS, CALLING_TOTAL, callingSectionComplete, type CallingData } from "@/lib/journey";

export interface CallingCardProps {
  data: Partial<CallingData>;
  loaded: boolean;
  error: string | null;
}

// Phase 2 on the hub (spec 4.1): one "continue" block on the night ground.
// A lamp per section (tap one to open that section), the count, and the two
// ways in: the wizard and the Calling Profile.
export default function CallingCard({ data, loaded, error }: CallingCardProps) {
  const router = useRouter();
  const ok = loaded && !error;
  const lamps = CALLING_SECTION_IDS.map((id) => ({
    id,
    label: CALLING_LAMP_LABELS[id],
    done: ok && callingSectionComplete(id, data),
  }));
  const completed = lamps.filter((l) => l.done).length;
  const firstOpen = lamps.findIndex((l) => !l.done);

  return (
    <div className="space-y-6">
      <p className="font-serif text-2xl text-[var(--ink)]">Six sections, about 37 minutes</p>
      {!loaded ? (
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          {completed} of {CALLING_TOTAL} sections complete
        </p>
      )}
      {/* Only once loaded (F4): the lamps' first render is already the real
          state, so Glow never pulses on page load. */}
      {ok ? (
        <LampSteps
          steps={lamps}
          currentIndex={firstOpen >= 0 ? firstOpen : null}
          onSelect={(i) => router.push(`/leaders/training/calling?step=${i + 1}`)}
          label={`Calling: ${completed} of ${CALLING_TOTAL} sections complete`}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/leaders/training/calling"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          {completed === 0 ? "Start Calling" : "Continue Calling"}
        </Link>
        <Link
          href="/leaders/training/calling/profile"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)]"
        >
          View my Calling Profile
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite LaunchCard**

`src/app/leaders/training/LaunchCard.tsx` (the seven `LAUNCH_STEP_IDS` are wizard steps 1 to 7, in the same order):

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LampSteps from "@/components/avenue/LampSteps";
import { LAUNCH_LAMP_LABELS } from "@/lib/avenue";
import { LAUNCH_STEP_IDS, LAUNCH_TOTAL, launchStepComplete, type LaunchData } from "@/lib/journey";

export interface LaunchCardProps {
  data: Partial<LaunchData>;
  loaded: boolean;
  error: string | null;
}

// Phase 3 on the hub (spec 4.1): a lamp per planning step (tap one to open
// that step), the count, and the two ways in: the wizard and the Launch Plan.
export default function LaunchCard({ data, loaded, error }: LaunchCardProps) {
  const router = useRouter();
  const ok = loaded && !error;
  const lamps = LAUNCH_STEP_IDS.map((id) => ({
    id,
    label: LAUNCH_LAMP_LABELS[id],
    done: ok && launchStepComplete(id, data),
  }));
  const completed = lamps.filter((l) => l.done).length;
  const firstOpen = lamps.findIndex((l) => !l.done);

  return (
    <div className="space-y-6">
      <p className="font-serif text-2xl text-[var(--ink)]">Seven steps, then your plan</p>
      {!loaded ? (
        <p className="text-sm text-[var(--muted)]">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          {completed} of {LAUNCH_TOTAL} steps complete
        </p>
      )}
      {/* Only once loaded (F4), so no lamp glows on page load. */}
      {ok ? (
        <LampSteps
          steps={lamps}
          currentIndex={firstOpen >= 0 ? firstOpen : null}
          onSelect={(i) => router.push(`/leaders/training/launch?step=${i + 1}`)}
          label={`Launch: ${completed} of ${LAUNCH_TOTAL} steps complete`}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/leaders/training/launch"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          {completed === 0 ? "Start Launch" : "Continue Launch"}
        </Link>
        <Link
          href="/leaders/training/launch/plan"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-[var(--ink)]"
        >
          View my Launch Plan
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite the hub page**

Replace the whole of `src/app/leaders/training/page.tsx` with the code below. What changes: the orbit, phone tabs, "Hide Phases" toggle, both percentage rings and the "Welcome" text are gone; the greeting, status line, `AvenueMap`, `PhaseOpening` per phase, `JourneyFooter` and the `Moment` card are added; with no `?phase=` the hub opens the "here" stop. What must not change: every hook call and its arguments, the access effect, the video modal, the load and error screens' logic, the save indicators, and the props passed to `Phase4Growth`, `Phase5Multiply` and `PhaseModules`.

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { recentMondays } from "@/lib/weeks";
import { LogOut, ArrowLeft, X } from "lucide-react";

import Phase4Growth, { CHECKIN_HISTORY_WEEKS } from "./Phase4Growth";
import Phase5Multiply from "./Phase5Multiply";
import PhaseModules from "./PhaseModules";
import CallingCard from "./CallingCard";
import LaunchCard from "./LaunchCard";
import { VERSES } from "./verses";
import { useTrainingProgress } from "./useTrainingProgress";
import { useCheckins } from "./useCheckins";
import { useNetworkView } from "./useNetworkView";
import { useMyPeople } from "@/lib/useMyPeople";
import { useWorksheet } from "@/lib/useWorksheet";
import { leaderFetch } from "@/lib/leaderFetch";
import { callingCompleteCount, launchCompleteCount, type CallingData, type LaunchData } from "@/lib/journey";
import {
  apprenticesOnRung,
  avenueStops,
  greetingFor,
  hereActionFor,
  stopWalked,
  streetStatusLine,
  STOP_IDS,
  type AvenueProgress,
  type StopId,
} from "@/lib/avenue";
import AvenueMap from "@/components/avenue/AvenueMap";
import PhaseOpening from "@/components/avenue/PhaseOpening";
import JourneyFooter from "@/components/avenue/JourneyFooter";
import Moment from "@/components/avenue/Moment";
import { useMoment } from "@/components/avenue/useMoment";

function isStopId(value: string | null): value is StopId {
  return value !== null && (STOP_IDS as readonly string[]).includes(value);
}

export default function TrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  // null means "not chosen": the hub then opens the stop the leader is at.
  const [expandedPhase, setExpandedPhase] = useState<StopId | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("phase");
    return isStopId(p) ? p : null;
  });
  // The stop opened when none was chosen: the "here" stop, set once (F3).
  const [defaultPhase, setDefaultPhase] = useState<StopId | null>(null);
  const [videoModal, setVideoModal] = useState<{ youtubeId: string; title: string } | null>(null);
  const [greetingTime] = useState(() => new Date());

  const {
    phases,
    progressLoaded,
    loadError,
    saving,
    saveError,
    conflictNotice,
    toggleModuleComplete,
    toggleEpisodeWatched,
  } = useTrainingProgress(user, accessChecked, hasAccess);
  const {
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
    editingWeekStart,
    saveCheckin,
  } = useCheckins(user, accessChecked, hasAccess);
  const {
    networkPeople,
    networkViewerId,
    networkDepth,
    networkLoaded,
    networkError,
    stepUpdatingId,
    stepError,
    setApprenticeStep,
    addPerson,
    addingPerson,
  } = useNetworkView(user, accessChecked, hasAccess);
  const ready = accessChecked && hasAccess && !!user;
  const { people, peopleLoaded, peopleError, upsertPerson, patchPerson, ensurePersonForNetwork, icnuDrafts } =
    useMyPeople(ready);
  const calling = useWorksheet<CallingData>("calling", ready);
  const launch = useWorksheet<LaunchData>("launch", ready);
  const callingDone = callingCompleteCount(calling.data);
  const launchDone = launchCompleteCount(launch.data);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
      leaderFetch("/api/leader-access")
        .then((res) => res.json())
        .then((data) => {
          setHasAccess(data.full_access === true);
          setAccessChecked(true);
          if (!data.full_access) {
            router.push("/leaders");
          }
        })
        .catch(() => {
          setAccessChecked(true);
          router.push("/leaders");
        });
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const openVideo = (youtubeId: string, title: string) => {
    setVideoModal({ youtubeId, title });
  };

  const closeVideo = () => {
    setVideoModal(null);
  };

  // Phase 5's own content below. The map's Multiply count uses
  // apprenticesOnRung (avenue.ts), the one definition shared with the dashboard.
  const sentByViewer = networkPeople.filter((p) => p.sentOutBy === networkViewerId);

  // The avenue (spec 2.1): which stops are walked, and where the leader is.
  const foundations = phases.find((p) => p.id === "phase1");
  const avenueProgress: AvenueProgress = {
    foundationsDone: foundations ? foundations.modules.filter((m) => m.completed).length : 0,
    foundationsTotal: foundations ? foundations.modules.length : 0,
    callingDone,
    launchDone,
    checkinCount: checkins.length,
    apprenticesOnRung: apprenticesOnRung(networkPeople, networkViewerId),
  };
  // The map, the status line and the default stop wait for every read the
  // stops depend on (F3). Without this they would first show Calling or
  // Launch as unwalked, then jump once the worksheets arrived. A failed read
  // still counts as loaded, so an error never leaves the page waiting.
  const journeyLoaded = calling.loaded && launch.loaded && checkinsLoaded && networkLoaded;
  const stops = avenueStops(avenueProgress);
  const hereStop = stops.find((s) => s.status === "here") ?? null;
  const hereAction = hereStop ? hereActionFor(hereStop.id, avenueProgress) : null;
  // Latched the first time everything has loaded (adjusted during render,
  // like useMoment). Latching keeps the open stop still when a later reload
  // (check-in retry) flips a loaded flag, or when walking a stop moves "here"
  // while its moment plays.
  if (journeyLoaded && defaultPhase === null) setDefaultPhase(hereStop?.id ?? "phase4");
  const journeyReady = defaultPhase !== null;
  const openPhase: StopId | null = expandedPhase ?? defaultPhase;

  // Phase-walked moments that can happen on this page (spec 3): the last
  // Foundations module, the first check-in, the first apprentice on rung 1.
  // A flag is only passed once its data has loaded, so loading never plays one.
  const momentFlags: Record<string, boolean> = {};
  if (progressLoaded) momentFlags["walked:phase1"] = stopWalked("phase1", avenueProgress);
  if (checkinsLoaded && !checkinLoadError) momentFlags["walked:phase4"] = stopWalked("phase4", avenueProgress);
  if (networkLoaded && !networkError) momentFlags["walked:phase5"] = stopWalked("phase5", avenueProgress);
  const { moment, dismiss } = useMoment(momentFlags);

  if (!mounted || !user || !accessChecked || !hasAccess) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  // A load failure is shown plainly rather than silently rendering an empty
  // journey, which would look identical to having lost every tick.
  if (loadError) {
    return (
      <div className="avenue-night flex items-center justify-center px-6">
        <div className="max-w-md text-center text-[var(--ink)]">
          <p className="mb-2">{loadError}</p>
          <p className="text-sm text-[var(--muted)]">Your saved progress has not been touched.</p>
        </div>
      </div>
    );
  }

  if (!progressLoaded) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="avenue-night relative">
      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={closeVideo}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">{videoModal.title}</h3>
              <button
                type="button"
                onClick={closeVideo}
                aria-label="Close video"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full rounded-xl"
                src={`https://www.youtube.com/embed/${videoModal.youtubeId}?autoplay=1`}
                title={videoModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Header: the sticky pill, quieter */}
      <header className="sticky top-4 z-50 mx-4 mt-4 flex max-w-5xl items-center justify-between rounded-full border border-[var(--line)] bg-[var(--night-2)] px-6 py-2 lg:mx-auto">
        <span className="text-sm font-semibold text-[var(--ink)]">Leadership Journey</span>
        <div className="flex items-center gap-4">
          {saving && <span className="hidden text-xs text-[var(--muted)] sm:inline">Saving...</span>}
          {!saving && saveError && (
            <span className="hidden max-w-[220px] text-xs text-red-400 sm:inline">{saveError}</span>
          )}
          {!saving && !saveError && conflictNotice && (
            // Visible at every width: a leader whose tick just silently
            // reverted needs the explanation most on the device most likely
            // to be the "second device" in a conflict.
            <span className="inline-block max-w-[200px] text-xs text-amber-400 sm:max-w-[260px]">{conflictNotice}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden text-sm sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/leaders"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Greeting (spec 4.1) */}
        <div className="mb-8 mt-6">
          <p className="eyebrow">Your journey</p>
          <h1 className="mt-2 font-serif text-[34px] leading-[1.05] text-[var(--ink)] md:text-[52px]">
            {greetingFor(greetingTime, user.name)}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {journeyReady ? streetStatusLine(stops) : "Finding where you are on the street..."}
          </p>
        </div>

        {/* The avenue: map A from md, the vertical street on phones. Drawn
            only once every read has landed (F3), so no lamp flips on load. */}
        {journeyReady ? (
          <AvenueMap
            stops={stops}
            selectedId={openPhase}
            onSelect={setExpandedPhase}
            hereAction={hereAction}
            onAction={() => {
              if (hereStop) setExpandedPhase(hereStop.id);
            }}
          />
        ) : null}

        {/* The open stop */}
        <div className="mt-12 space-y-10">
          {phases.map((phase) => {
            if (phase.id !== openPhase) return null;

            // Growth and Multiplication are ongoing rhythms, not checklists:
            // each gets its own content instead of the modules list.
            const isGrowthPhase = phase.id === "phase4";
            const isMultiplyPhase = phase.id === "phase5";
            const isCallingPhase = phase.id === "phase2";
            const isLaunchPhase = phase.id === "phase3";
            // editingWeekStart, not a fresh mondayOf(new Date()) here: this
            // label is shown next to the form that edits it, and saveCheckin
            // sends this exact same value.
            const currentWeekStart = editingWeekStart;
            const currentWeekLabel = new Date(`${currentWeekStart}T00:00:00`).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
            });
            const historyWeeks = recentMondays(CHECKIN_HISTORY_WEEKS, new Date()).slice().reverse();
            const hasCheckedInThisWeek = checkins.some((c) => c.weekStart === currentWeekStart);
            const verse = VERSES[phase.id as StopId];

            return (
              <section key={phase.id} aria-label={phase.title}>
                <PhaseOpening
                  stop={phase.number}
                  name={phase.title}
                  reference={verse.reference}
                  short={verse.short}
                  verse={verse.text}
                />
                {phase.subtitle !== phase.scripture ? <p className="night-label mt-6">{phase.subtitle}</p> : null}
                <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">{phase.description}</p>
                {isGrowthPhase ? (
                  <p className="night-label mt-4">{hasCheckedInThisWeek ? "Checked in this week" : "Not yet this week"}</p>
                ) : null}
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

                <div className="mt-10">
                  {isGrowthPhase ? (
                    <Phase4Growth
                      currentWeekLabel={currentWeekLabel}
                      historyWeeks={historyWeeks}
                      checkins={checkins}
                      checkinsLoaded={checkinsLoaded}
                      setCheckinsLoaded={setCheckinsLoaded}
                      checkinLoadError={checkinLoadError}
                      setCheckinLoadAttempt={setCheckinLoadAttempt}
                      checkinForm={checkinForm}
                      setCheckinForm={setCheckinForm}
                      checkinSaving={checkinSaving}
                      checkinSaveError={checkinSaveError}
                      checkinSaved={checkinSaved}
                      saveCheckin={saveCheckin}
                      people={people}
                      peopleLoaded={peopleLoaded}
                      peopleError={peopleError}
                      onPersonChange={upsertPerson}
                    />
                  ) : isMultiplyPhase ? (
                    <Phase5Multiply
                      sentByViewer={sentByViewer}
                      networkLoaded={networkLoaded}
                      networkError={networkError}
                      networkDepth={networkDepth}
                      stepUpdatingId={stepUpdatingId}
                      stepError={stepError}
                      setApprenticeStep={setApprenticeStep}
                      people={people}
                      peopleLoaded={peopleLoaded}
                      peopleError={peopleError}
                      ensurePersonForNetwork={ensurePersonForNetwork}
                      patchPerson={patchPerson}
                      icnuDrafts={icnuDrafts}
                      addPerson={addPerson}
                      addingPerson={addingPerson}
                    />
                  ) : isCallingPhase ? (
                    <CallingCard data={calling.data} loaded={calling.loaded} error={calling.error} />
                  ) : isLaunchPhase ? (
                    <LaunchCard data={launch.data} loaded={launch.loaded} error={launch.error} />
                  ) : (
                    <PhaseModules
                      phase={phase}
                      toggleModuleComplete={toggleModuleComplete}
                      toggleEpisodeWatched={toggleEpisodeWatched}
                      openVideo={openVideo}
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <JourneyFooter />
      </main>

      <Moment
        play={moment !== null}
        playKey={moment?.n}
        title={moment?.title ?? ""}
        caption={moment?.caption ?? ""}
        onDismiss={dismiss}
      />
    </div>
  );
}
```

Notes for the implementer:
- `recentMondays(..., new Date())` inside the map is unchanged from today; leave it.
- `overallPercent`, `CALLING_TOTAL`, `LAUNCH_TOTAL`, `Phase`, `ChevronDown`, `Heart`, `Users`, `sidebarOpen`, `togglePhase`, `getPhaseProgress`, `getOverallProgress` are removed on purpose (only the rings used them). `overallPercent` stays exported and tested in `journey.ts`; do not touch that file.
- If lint reports `react-hooks/purity` on `recentMondays(..., new Date())`, that line was already there; report the count, do not move it.
- `defaultPhase` is set during render under a condition (the same pattern as `useMoment`). If lint objects, stop and report the exact message; do not move it into an effect.
- The map and status line wait for `journeyReady` (F3); the video close button is now 44 px with `aria-label` (F16); the Multiply count uses `apprenticesOnRung` (F15).

- [ ] **Step 4: Run the gates**

`npx tsc --noEmit` clean, `npm test` 230 passing, `npm run lint` 55 to 56 (record the number), `npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/leaders/training/page.tsx src/app/leaders/training/CallingCard.tsx src/app/leaders/training/LaunchCard.tsx
git commit -m "Avenue at night: journey hub greeting, avenue map and phase openings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Controller browser check**

Sign in a fixture leader (`@example.invalid`, see HANDOVER-v2 section 5). At desktop (1280 px) and 375 px on `/leaders/training`:
- Serif greeting "Good morning/afternoon/evening, {first name}." matching Melbourne time, and the status line (for a new fixture: "No streetlights on yet. Foundations is next.").
- Desktop: map A matches mockup option A (stars, dashed centre line, lit lamps with cones, blue "YOU ARE HERE" dot, dim ahead lamps, serif names). Clicking each lamp opens that phase below and underlines it. Tab through the five lamp buttons: lamp-coloured focus ring.
- 375 px: vertical street, no map; the here stop shows its panel and button; tapping a stop name opens that phase; no horizontal scroll.
- Each phase opens with "Stop N of 5 · short ref", big serif name (Foundations fits at 375 px), italic verse then "(NLT)" and the reference in lamp colour; the NLT notice sits at the foot of the page.
- Calling and Launch show lamp rows; tapping a lamp opens the wizard at that step.
- `?phase=phase4` opens Growth; no param opens the here stop. On a slow load (DevTools throttling "Slow 4G") the map and status line appear once, already right: no lamp flips and the open stop never jumps. Opening Calling or Launch: their lamps appear lit without a pulse.
- Tick the last unticked Foundations module: the moment card appears at the bottom ("Foundations is walked."), the lamp ignites; "Carry on" closes it. Reload: no moment. Untick and retick to replay. With reduced motion on (DevTools Rendering panel), the card appears already lit.
- Save indicators still show on a tick; the logout button works.

---

### Task 7: Hub phase content: Foundations list, Growth columns, Multiply lamp rungs

**Files:**
- Rewrite: `src/app/leaders/training/PhaseModules.tsx`
- Modify: `src/app/leaders/training/Phase4Growth.tsx:1-4` (imports) and `:133-251` (the returned JSX of the `Phase4Growth` function; the file is 251 lines)
- Modify: `src/app/leaders/training/Phase5Multiply.tsx:5` (imports), `:206-344` (the returned JSX of `Phase5Multiply`)

**Interfaces:**
- Consumes: `Glow` (Task 4). Props of all three components are unchanged.
- Produces: nothing new.

- [ ] **Step 1: Rewrite PhaseModules**

`src/app/leaders/training/PhaseModules.tsx` (same props, same handlers; the tick becomes a lamp that glows when it lights; no green, no line-through):

```tsx
import EpisodeCarousel from "@/components/ui/EpisodeCarousel";
import Glow from "@/components/avenue/Glow";
import { CheckCircle2, Video, FileText, Lightbulb } from "lucide-react";
import { Module, Phase } from "./phases";

// Module Type Icons
const ModuleTypeIcon = ({ type }: { type: Module["type"] }) => {
  switch (type) {
    case "video":
      return <Video className="w-4 h-4" />;
    case "quiz":
      return <Lightbulb className="w-4 h-4" />;
    case "document":
      return <FileText className="w-4 h-4" />;
    case "action":
      return <CheckCircle2 className="w-4 h-4" />;
  }
};

interface PhaseModulesProps {
  phase: Phase;
  toggleModuleComplete: (phaseId: string, moduleId: string) => void;
  toggleEpisodeWatched: (phaseId: string, moduleId: string, episodeId: string) => void;
  openVideo: (youtubeId: string, title: string) => void;
}

// The modules list used by Foundations, as a clean list on the night ground
// (spec 4.1). Progress state and the tick handlers come from
// useTrainingProgress via the page. A ticked module's lamp is lit.
export default function PhaseModules({
  phase,
  toggleModuleComplete,
  toggleEpisodeWatched,
  openVideo,
}: PhaseModulesProps) {
  return (
    <div>
      <h3 className="night-h2 mb-4">Training modules</h3>
      <ul className="border-t border-[var(--line)]">
        {phase.modules.map((module) => (
          <li key={module.id} className="border-b border-[var(--line)] py-5">
            {module.sectionHeader && <p className="night-label mb-3">{module.sectionHeader}</p>}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleModuleComplete(phase.id, module.id)}
                aria-pressed={module.completed}
                aria-label={module.completed ? `${module.title}: done. Tap to untick.` : `${module.title}: mark done`}
                className="-ml-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
              >
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
              </button>
              <div className="min-w-0 flex-1 pt-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className={module.completed ? "text-[var(--lamp)]" : "text-[var(--muted)]"}>
                    <ModuleTypeIcon type={module.type} />
                  </span>
                  <h4 className="font-serif text-xl text-[var(--ink)]">{module.title}</h4>
                </div>
                <p className="text-sm text-[var(--muted)]">{module.description}</p>
                {module.duration && <span className="night-label mt-2 inline-block">{module.duration}</span>}
              </div>
            </div>
            {/* Episode carousel: thumbnails with watched progress */}
            {module.episodes && (
              <EpisodeCarousel
                episodes={module.episodes}
                onPlay={openVideo}
                onToggleWatched={(episodeId) => toggleEpisodeWatched(phase.id, module.id, episodeId)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Growth: import Glow**

In `src/app/leaders/training/Phase4Growth.tsx`, after the line `import TaggedPeople from "@/components/people/TaggedPeople";` add:

```ts
import Glow from "@/components/avenue/Glow";
```

- [ ] **Step 3: Growth: replace the returned JSX**

Replace everything from the `  return (` inside `export default function Phase4Growth` (line 133) to the end of that function (its closing `}` on line 251, the last line of the file) with the block below. Do not touch `ScoreRow`, which has its own `  return (` at line 53. Anchor on the function, not only the line number. The check-in form's inner markup (score rows, textarea, save button, retry) is unchanged; only its wrapper and heading change. The metrics become three columns of names on the night ground with a warm count that glows when someone is named.

```tsx
  return (
    <div className="space-y-12">
      {/* The weekly check-in: a raised card because it takes input */}
      <div className="night-card p-6">
        <span className="eyebrow">This week</span>
        <h3 className="mt-1 mb-2 font-serif text-2xl text-[var(--ink)]">Week of {currentWeekLabel}</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          Four gauges from Dave Ferguson&rsquo;s Multiplier: Relational, Physical, Mental and Spiritual.
        </p>
        {!checkinsLoaded ? (
          <p className="text-sm text-[var(--muted)]">Loading your check-in...</p>
        ) : checkinLoadError ? (
          // No form is rendered here on purpose. Rendering it
          // at its 5/5/5/5 defaults with Save enabled would
          // let a leader whose real scores simply failed to
          // load overwrite them with defaults they never saw.
          <div className="rounded-xl border border-dashed border-[var(--line-2)] p-6 text-center">
            <p className="text-sm text-white mb-1">This week&rsquo;s check-in could not be loaded.</p>
            <p className="text-sm text-[var(--muted)] mb-4">{checkinLoadError}</p>
            <button
              type="button"
              onClick={() => {
                setCheckinsLoaded(false);
                setCheckinLoadAttempt((n) => n + 1);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-full border border-[var(--line-2)] text-white text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-5">
              {RPMS_GAUGES.map(({ key, label }) => (
                <ScoreRow
                  key={key}
                  label={label}
                  value={checkinForm[key]}
                  onChange={(next) => setCheckinForm((prev) => ({ ...prev, [key]: next }))}
                />
              ))}
            </div>
            <div className="mb-4">
              <label htmlFor="checkin-reflection" className="text-sm text-white mb-1.5 block">
                One sentence
              </label>
              <textarea
                id="checkin-reflection"
                value={checkinForm.reflection}
                onChange={(e) => setCheckinForm((prev) => ({ ...prev, reflection: e.target.value }))}
                maxLength={2000}
                rows={2}
                placeholder="How this week actually went."
                className="w-full rounded-lg bg-[var(--night)] border border-[var(--line-2)] p-3 text-sm text-white placeholder-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
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

      {/* Your three metrics: three columns of names, no card per metric */}
      <div>
        <h3 className="night-h2">Your three metrics</h3>
        <p className="text-sm text-[var(--muted)] mt-1 mb-6">
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
      </div>

      {/* The history */}
      <div>
        <h3 className="night-h2 mb-4">Recent weeks</h3>
        <CheckinHistory weeks={historyWeeks} checkins={checkins} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Multiply: the rung row, checklist and wrappers**

In `src/app/leaders/training/Phase5Multiply.tsx`:

(a) After line 8 (`import IcnuEditor from "./IcnuEditor";`) add:

```ts
import Glow from "@/components/avenue/Glow";
```

(b) Replace the whole returned JSX of `Phase5Multiply` (from `  return (` on line 206 to the matching `  );` on line 343) with:

```tsx
  return (
    <div className="space-y-10">
      <p className="text-sm text-[var(--muted)]">
        Hero Maker&rsquo;s five practices: Multiplication Thinking, Permission Giving, Disciple
        Multiplying, Gift Activating, Kingdom Building.
      </p>

      <p className="text-sm text-[var(--ink)]">
        {!networkLoaded ? (
          "Loading your network..."
        ) : networkError ? (
          <span className="text-red-400">{networkError}</span>
        ) : networkDepth.people === 0 ? (
          "This is the beginning: nobody is multiplying below you yet."
        ) : (
          `${networkDepth.people} ${networkDepth.people === 1 ? "person" : "people"} multiplying through ${networkDepth.generations} ${networkDepth.generations === 1 ? "generation" : "generations"} below you`
        )}
      </p>

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

      {/* The family tree link */}
      <Link
        href="/leaders/network"
        className="panel p-6 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-[var(--accent)]" />
          <span className="eyebrow">Family tree</span>
        </div>
        <h3 className="text-base font-semibold text-white mb-2">See the whole network</h3>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          The same steps, seen as a chart: everyone sent out, and everyone they have sent
          out in turn.
        </p>
      </Link>
    </div>
  );
```

- [ ] **Step 5: Run the gates**

`npx tsc --noEmit` clean, `npm test` 230 passing, `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 6: Commit**

```bash
git add src/app/leaders/training/PhaseModules.tsx src/app/leaders/training/Phase4Growth.tsx src/app/leaders/training/Phase5Multiply.tsx
git commit -m "Avenue at night: Foundations list, Growth columns and Multiply lamp rungs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Controller browser check**

With the fixture leader, at 375 px and desktop, reduced motion off then on:
- Foundations: a hairline list, serif module titles, lamp ticks (warm when done, no green, no strike-through); tick one: its lamp glows once (no glow with reduced motion). Episode carousels still play and tick.
- Growth: the check-in is the only raised card; save a first check-in: saves as before and the "Growth is walked." moment plays. Three metric columns (stacked at 375 px) with warm counts; name someone under Pathways: the count rises and glows once. History below.
- Multiply: add a person through the form with an `@example.invalid` email (writes a `network_people` row sent by the fixture leader). Tap them, tick rung 1: the dots turn warm and glow once, the "Multiply is walked." moment plays. ICNU note still saves.
- Foundations section headers read as muted labels, not lamp-coloured (F8).
- Cleanup (F17): this check writes training progress, a check-in, My People metric tags, an ICNU note and a `network_people` row for the fixture. Delete every fixture row by its exact `@example.invalid` email, then run `npm run guard`, which must print `clean`.

---

### Task 8: Wizard shell with lamp steps, and the Calling and Launch moments

**Files:**
- Rewrite: `src/components/journey/WizardShell.tsx`
- Modify: `src/app/leaders/training/calling/page.tsx` (import line 6; hook block after `goTo`, which ends at line 47; loading screen lines 66-72; error panels lines 49-64 and 74-89; the `return` at lines 134-153; the file is 154 lines)
- Modify: `src/app/leaders/training/launch/page.tsx` (imports lines 1-29; hook block after line 104; loading screen lines 108-114; the `return` at lines 244-260)

**Interfaces:**
- Consumes: `PhaseOpening`, `LampSteps`, `JourneyFooter`, `VERSES` (Task 5); `useMoment`, `Moment` (Task 4); `CALLING_LAMP_LABELS`, `LAUNCH_LAMP_LABELS`, `STOP_IDS` (Task 2); `progressLabel`, `timeLabel`, `type WizardStepMeta` from `src/lib/wizard.ts`; from `src/lib/journey.ts`: `CALLING_TOTAL`, `LAUNCH_TOTAL`, `callingCompleteCount`, `launchCompleteCount`, `isIsoDate`.
- Produces: `WizardShellProps` becomes `{ phaseId: "phase2" | "phase3"; name: string; title: string; steps: WizardStepMeta[]; lampLabels: Record<string, string>; current: number; onSelect: (index: number) => void; saving: boolean; saveError: string | null; children: React.ReactNode }` (`eyebrow` is replaced by `name`). `StepProps<T>` and `OutcomeButton` are unchanged.

- [ ] **Step 1: Rewrite WizardShell**

`src/components/journey/WizardShell.tsx`. `StepProps` and `OutcomeButton` are copied unchanged; the shell swaps "STEP n OF N", the bar and the "All steps" list for `PhaseOpening` (small) with `LampSteps`. `progressLabel` stays for screen readers.

```tsx
"use client";

import Link from "next/link";
import { progressLabel, timeLabel, type WizardStepMeta } from "@/lib/wizard";
import { STOP_IDS } from "@/lib/avenue";
import { VERSES } from "@/app/leaders/training/verses";
import PhaseOpening from "@/components/avenue/PhaseOpening";
import LampSteps from "@/components/avenue/LampSteps";
import JourneyFooter from "@/components/avenue/JourneyFooter";

// Each step component receives its own saved section and two callbacks.
export interface StepProps<T> {
  value: T | undefined; // this step's saved section
  save: (value: T) => void; // saveSection for this step's section
  finish: () => void; // flush this section, then go to the next step
}

export interface WizardShellProps {
  phaseId: "phase2" | "phase3";
  name: string; // "Calling" or "Launch"
  title: string; // "Discover your calling" or "Plan your launch"
  steps: WizardStepMeta[];
  lampLabels: Record<string, string>; // short lamp label per step id
  current: number;
  onSelect: (index: number) => void;
  saving: boolean; // savingSection !== null
  saveError: string | null;
  children: React.ReactNode;
}

// The forward button on every step. Outcome-phrased labels only.
export function OutcomeButton(props: { label: string; onClick: () => void; disabled?: boolean; hint?: string }) {
  const { label, onClick, disabled, hint } = props;
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full sm:w-auto min-h-[44px] px-6 rounded-full bg-[var(--accent)] text-white font-semibold disabled:opacity-50"
      >
        {label}
      </button>
      {disabled && hint ? <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

// Layout for the Calling and Launch wizards (spec 4.2). The page owns
// navigation and data; the shell draws the phase opening, a lamp per step
// (lit when complete, blue ring on the current one, tap to jump), one quiet
// time line, the save state, and the step itself on a raised night card.
export default function WizardShell(props: WizardShellProps) {
  const { phaseId, name, title, steps, lampLabels, current, onSelect, saving, saveError, children } = props;
  const verse = VERSES[phaseId];
  const stop = STOP_IDS.indexOf(phaseId) + 1;
  const completeCount = steps.filter((s) => s.complete).length;

  return (
    <div className="avenue-night">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/leaders/training"
          className="no-print inline-flex min-h-[44px] items-center text-sm text-[var(--muted)] hover:text-white"
        >
          Back to your journey
        </Link>

        <div className="mt-4">
          <PhaseOpening
            size="small"
            headingLevel={1}
            stop={stop}
            name={name}
            reference={verse.reference}
            short={verse.short}
            verse={verse.text}
          >
            <p className="mb-6 text-sm text-[var(--muted)]">{title}</p>
            <LampSteps
              steps={steps.map((s) => ({ id: s.id, label: lampLabels[s.id] ?? s.title, done: s.complete }))}
              currentIndex={current}
              onSelect={onSelect}
              label={`${name}: ${completeCount} of ${steps.length} steps complete`}
            />
          </PhaseOpening>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="night-label">{timeLabel(steps)}</p>
          <p className="text-xs" aria-live="polite">
            {saving ? (
              <span className="text-[var(--muted)]">Saving...</span>
            ) : saveError ? (
              <span className="text-amber-400">{saveError}</span>
            ) : (
              <span className="text-[var(--muted)]">All changes saved</span>
            )}
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {progressLabel(current, steps.length)}
        </p>

        <div className="av-step night-card mt-4 p-5 md:p-8">{children}</div>

        <JourneyFooter />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Calling page: imports**

In `src/app/leaders/training/calling/page.tsx` replace line 6 (`import { callingSectionComplete, type CallingData, type CallingSectionId } from "@/lib/journey";`) with:

```ts
import {
  CALLING_TOTAL,
  callingCompleteCount,
  callingSectionComplete,
  type CallingData,
  type CallingSectionId,
} from "@/lib/journey";
import { CALLING_LAMP_LABELS } from "@/lib/avenue";
import { useMoment } from "@/components/avenue/useMoment";
import Moment from "@/components/avenue/Moment";
```

- [ ] **Step 3: Calling page: the moments hook**

Directly after the `goTo` function (after the line `  };` that closes `goTo`, before `if (gateError) {`), add:

```ts
  // Moments that happen in this wizard (spec 3): yes to the Shared Call,
  // booking the pastor conversation, and Calling walked (all six sections).
  // Empty until the worksheet has loaded, so loading never plays one.
  const momentFlags: Record<string, boolean> =
    loaded && !error
      ? {
          sharedYes: data.shared?.yes === true,
          conversationBooked: data.conversation?.booked === true,
          "walked:phase2": callingCompleteCount(data) === CALLING_TOTAL,
        }
      : {};
  const { moment, dismiss } = useMoment(momentFlags);
```

- [ ] **Step 4: Calling page: loading screen and return**

Replace the loading screen (lines 66-72):

```tsx
  if (!ready || !loaded) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }
```

Replace the final `return ( <WizardShell ...> ... </WizardShell> );` (lines 134-153) with:

```tsx
  return (
    <>
      <WizardShell
        phaseId="phase2"
        name="Calling"
        title="Discover your calling"
        steps={steps}
        lampLabels={CALLING_LAMP_LABELS}
        current={current}
        onSelect={goTo}
        saving={savingSection !== null}
        saveError={saveError}
      >
        <div className="space-y-6">
          <h2 className="text-[var(--ink)]">
            Section {section.number}: {section.title}
          </h2>
          <SectionVideo section={section} />
          {/* key resets local step state (selection, typed text) when the section changes */}
          <div key={section.id}>{activity}</div>
        </div>
      </WizardShell>
      <Moment
        play={moment !== null}
        playKey={moment?.n}
        title={moment?.title ?? ""}
        caption={moment?.caption ?? ""}
        onDismiss={dismiss}
      />
    </>
  );
```

(The `h2` gets its serif size from `.av-step h2`.)

- [ ] **Step 5: Launch page: imports**

In `src/app/leaders/training/launch/page.tsx` replace the import block from `@/lib/journey` (lines 6-13) with:

```ts
import {
  filled,
  isIsoDate,
  launchCompleteCount,
  launchStepComplete,
  LAUNCH_STEP_IDS,
  LAUNCH_TOTAL,
  type CallingData,
  type LaunchData,
  type LaunchStepId,
} from "@/lib/journey";
import { LAUNCH_LAMP_LABELS } from "@/lib/avenue";
import { useMoment } from "@/components/avenue/useMoment";
import Moment from "@/components/avenue/Moment";
```

- [ ] **Step 6: Launch page: the moments hook**

Directly after the `goTo` function (before `if (gateError) return <ErrorPanel message={gateError} />;`), add:

```ts
  // Moments that happen in this wizard (spec 3): setting a launch date, and
  // Launch walked (all seven planning steps). Empty until loaded.
  // RhythmStep saves on every change, and typing a year into a date input
  // passes through values like "0002-10-03", which are valid ISO dates. Only
  // a date in this year or later counts as set (F5), so the moment waits for
  // the real year.
  const launchDate = data.rhythm?.launchDate;
  const launchDateSet = isIsoDate(launchDate) && Number(launchDate.slice(0, 4)) >= new Date().getFullYear();
  const momentFlags: Record<string, boolean> =
    loaded && !launch.error
      ? {
          launchDate: launchDateSet,
          "walked:phase3": launchCompleteCount(data) === LAUNCH_TOTAL,
        }
      : {};
  const { moment, dismiss } = useMoment(momentFlags, launchDateSet ? launchDate : undefined);
```

- [ ] **Step 7: Launch page: loading screen and return**

Replace the loading screen (lines 108-114) with the same `avenue-night` version as Step 4. Also change `ErrorPanel`'s outer `<div className="max-w-3xl mx-auto px-4 py-8">` to `<div className="avenue-night"><div className="max-w-3xl mx-auto px-4 py-8">` and close the extra `</div>`.

Replace the final `return ( <WizardShell ...> ... </WizardShell> );` (lines 244-260) with:

```tsx
  return (
    <>
      <WizardShell
        phaseId="phase3"
        name="Launch"
        title="Plan your launch"
        steps={steps}
        lampLabels={LAUNCH_LAMP_LABELS}
        current={current}
        onSelect={goTo}
        saving={launch.savingSection !== null}
        saveError={launch.saveError}
      >
        <div className="space-y-6">
          <h2 className="text-[var(--ink)]">{step.title}</h2>
          {/* key resets local step state (typed text, choices) when the step changes */}
          <div key={step.id}>{activity}</div>
        </div>
      </WizardShell>
      <Moment
        play={moment !== null}
        playKey={moment?.n}
        title={moment?.title ?? ""}
        caption={moment?.caption ?? ""}
        onDismiss={dismiss}
      />
    </>
  );
```

In the Calling page apply the same `avenue-night` wrapper to the two error panels (`gateError` and `error`): wrap each returned `<div className="max-w-3xl mx-auto px-4 py-8">` in `<div className="avenue-night">...</div>`.

- [ ] **Step 8: Check nothing else uses the old prop**

Run: `npx tsc --noEmit`. Expected: no output. Any remaining `eyebrow=` on `WizardShell` is a type error; there are only the two call sites above.

- [ ] **Step 9: Run the gates**

`npm test` 230 passing (`wizard.test.ts` still passes: `progressLabel` and `timeLabel` are unchanged), `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 10: Commit**

```bash
git add src/components/journey/WizardShell.tsx src/app/leaders/training/calling/page.tsx src/app/leaders/training/launch/page.tsx
git commit -m "Avenue at night: wizard lamp steps and the Calling and Launch moments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 11: Controller browser check**

Fixture leader, 375 px and desktop, reduced motion off then on:
- `/leaders/training/calling`: small phase opening (Stop 2 of 5 · Ephesians 4, serif "Calling", verse, "(NLT)", reference), "Discover your calling", a row of six lamps (wraps at 375 px, no horizontal scroll), blue ring on the current step, lit lamps for done steps; tapping a lamp jumps to that step. One quiet time line and the save state. Step questions are serif. NLT notice at the foot.
- Section 3: tap "Save my yes": the wizard moves on and the moment card "You said yes." with today's date "· the Shared Call" ignites at the bottom (about 1.4 s); the Shared call lamp glows once. "Carry on" closes it. Reload: nothing replays. Reduced motion: the card appears already lit, no glow.
- Section 6: tick "booked": "Conversation booked." moment. If that was the last section: "Calling is walked." instead.
- `/leaders/training/launch`: nine lamps with short labels; step 6: pick a launch date: "Your launch date is set." with "Launching {date}". Also clear the date and type one with the keyboard: no moment while the year is part-typed (F5), one moment once the four-digit year is this year or later. Completing the seventh planning step: "Launch is walked.".
- Tab to the moment card's "Carry on": lamp-coloured focus ring (F6).
- Wizard headings: the step question is large serif; small h3s (ApestStep role names, SeasonalMap labels, "Your invite list") keep their own size in serif (F11).
- Saving still works exactly as before (type, wait, reload, text is there).
- Cleanup (F17): this check writes Calling and Launch worksheet answers for the fixture. Delete every fixture row by its exact `@example.invalid` email, then run `npm run guard`, which must print `clean`.

---

### Task 9: The Arena as a street of months

**Files:**
- Rewrite: `src/app/leaders/training/launch/ArenaStep.tsx`

**Interfaces:**
- Consumes: `LampSteps` (Task 5). Everything from `src/lib/arena.ts` and `./arenaContent` exactly as today. Props `{ plan, value, save, onShowPlan }` unchanged.
- Produces: nothing new.

- [ ] **Step 1: Rewrite ArenaStep**

`src/app/leaders/training/launch/ArenaStep.tsx`. Every rule, save call and piece of copy is unchanged; what changes is how it is drawn: six month lamps across the top (dim to lit), the three counters as warm serif numerals, and the ending as a lit vertical street with each principle beneath its month's lamp. Headings inside get the serif face from `.av-step h3` (Task 1), which sets only family and weight (F11), so each h3 carries its own `text-2xl leading-tight`.

```tsx
"use client";

import { useState } from "react";
import { OutcomeButton } from "@/components/journey/WizardShell";
import LampSteps from "@/components/avenue/LampSteps";
import {
  bitesFor,
  COUNTER_KEYS,
  detectGaps,
  GAP_TEXT,
  playArena,
  thinSentence,
  thinSpots,
  type ArenaPlan,
  type ArenaState,
  type CounterKey,
} from "@/lib/arena";
import type { LaunchData } from "@/lib/journey";
import { CURVEBALLS, DEFAULT_ORDER } from "./arenaContent";

type Arena = NonNullable<LaunchData["arena"]>;

interface ArenaStepProps {
  plan: ArenaPlan;
  value: Arena | undefined;
  save: (value: Arena) => void;
  onShowPlan: () => void;
}

const COUNTER_NAMES: Record<CounterKey, string> = {
  pathways: "Pathways",
  intersections: "Intersections",
  streetlights: "Streetlights",
};

const MONTHS = DEFAULT_ORDER.length;

// The six months as a street of small lamps: lit once played, a blue ring
// on the month being played. Display only.
function MonthStreet({ state }: { state: ArenaState }) {
  const steps = DEFAULT_ORDER.map((id, i) => ({ id: `month-${i + 1}-${id}`, label: `Month ${i + 1}`, done: i < state.month }));
  return (
    <LampSteps
      dense
      steps={steps}
      currentIndex={state.finished ? null : state.month}
      label={`The Arena: ${state.month} of ${MONTHS} months played`}
    />
  );
}

// The three counters as warm numerals (dim at zero).
function CountersBar({ state }: { state: ArenaState }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 border-y border-[var(--line)] py-4">
        {COUNTER_KEYS.map((k) => (
          <div key={k} className="text-center">
            <p
              className={`font-serif text-4xl tabular-nums ${
                state.counters[k] > 0 ? "text-[var(--lamp)]" : "text-[var(--dim)]"
              }`}
            >
              {state.counters[k]}
            </p>
            <p className="night-label mt-1">{COUNTER_NAMES[k]}</p>
          </div>
        ))}
      </div>
      {state.capacity ? <p className="mt-2 text-sm text-gray-300">Leader capacity: {state.capacity}</p> : null}
    </div>
  );
}

// Step 8 (spec 5.1): the Arena. Six months played against the leader's own
// plan, one curveball a month. Picks are saved and replayed from zero, so
// the counters are never stored. No score, grade or ranking anywhere.
export default function ArenaStep({ plan, value, save, onShowPlan }: ArenaStepProps) {
  const picks = value?.picks ?? [];
  const [entered, setEntered] = useState(picks.length > 0);
  const [resultMonth, setResultMonth] = useState<number | null>(null);

  const gaps = detectGaps(plan);
  let state: ArenaState;
  try {
    state = playArena(CURVEBALLS, DEFAULT_ORDER, picks);
  } catch {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-300">Your saved Arena run no longer matches the current months.</p>
        <OutcomeButton label="Start the Arena again" onClick={() => save({ picks: [], done: false })} />
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">The Arena</p>
          <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">Six months, before you commit</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            Six months of rehearsal, played against your own plan. Each month brings a curveball and four choices. No
            grade at the end: just the principles you learned and where your plan is thinnest.
          </p>
        </div>
        <MonthStreet state={state} />
        <OutcomeButton label="Enter the Arena" onClick={() => setEntered(true)} />
      </div>
    );
  }

  const byId = new Map(CURVEBALLS.map((c) => [c.id, c]));

  // A result: the month just played.
  if (resultMonth !== null) {
    const pick = picks[resultMonth];
    const chosen = pick ? byId.get(pick.curveball)?.choices[pick.choice] : undefined;
    return (
      <div className="space-y-6">
        <MonthStreet state={state} />
        <CountersBar state={state} />
        {chosen ? (
          <div>
            <p className="font-serif text-2xl leading-snug text-[var(--ink)]">{chosen.verdict}</p>
            <p className="mt-3 text-sm text-gray-300">Effect: {chosen.counters}</p>
            <p className="eyebrow mt-5">Principle</p>
            <p className="mt-2 text-base font-semibold leading-relaxed text-[var(--ink)]">{chosen.principle}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{chosen.anchor}</p>
          </div>
        ) : null}
        <OutcomeButton
          label={resultMonth < MONTHS - 1 ? `On to month ${resultMonth + 2}` : "See what I learned"}
          onClick={() => {
            setResultMonth(null);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  // The ending: a lit street, each principle beneath its month, then where
  // the plan is thinnest.
  if (state.finished) {
    const spots = thinSpots(CURVEBALLS, DEFAULT_ORDER, gaps);
    return (
      <div className="space-y-8">
        <MonthStreet state={state} />
        <CountersBar state={state} />
        <div>
          <h3 className="text-2xl leading-tight text-[var(--ink)]">The principles you learned</h3>
          <ol className="mt-5">
            {state.earned.map((e, i) => (
              <li key={e.month} className="relative pb-6 pl-10">
                {i < state.earned.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[11px] top-[9px] -bottom-[9px] w-[2px] bg-[var(--lamp)]"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute left-[5px] top-[2px] h-[14px] w-[14px] rounded-full bg-[var(--lamp)] shadow-[0_0_16px_4px_rgba(255,197,107,0.5)]"
                />
                <p className="night-label">Month {e.month}</p>
                <p className="mt-1 font-serif text-xl leading-snug text-[var(--ink)]">{e.principle}</p>
                <p className="mt-1 text-sm text-gray-300">{e.choiceLabel}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{e.anchor}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-[var(--line)] pt-6">
          <h3 className="text-2xl leading-tight text-[var(--ink)]">Where your plan is thinnest</h3>
          {spots.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-300">Nothing in your plan stood out as thin. Keep it that way.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {spots.map((s) => (
                <li key={s.gap}>
                  <p className="text-sm leading-relaxed text-[var(--ink)]">{thinSentence(s)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-300">Next: {GAP_TEXT[s.gap].action}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <OutcomeButton label="Show my launch plan" onClick={onShowPlan} />
        <button
          type="button"
          onClick={() => {
            save({ picks: [], done: false });
            setEntered(false);
          }}
          className="min-h-[44px] px-2 text-sm font-semibold text-[var(--accent)]"
        >
          Play it again
        </button>
      </div>
    );
  }

  // A month: the next curveball in the order.
  const curveball = byId.get(DEFAULT_ORDER[state.month]);
  if (!curveball) throw new Error(`Unknown curveball ${DEFAULT_ORDER[state.month]}`);
  const bites = bitesFor(curveball, gaps);

  return (
    <div className="space-y-6">
      <MonthStreet state={state} />
      <CountersBar state={state} />
      <div>
        <p className="night-label">
          Month {state.month + 1} of {MONTHS}
        </p>
        <h3 className="mt-2 text-2xl leading-tight text-[var(--ink)]">{curveball.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-300">{curveball.situation}</p>
        {bites.length > 0 ? (
          <div className="mt-4 rounded-lg border border-[var(--accent)] p-3">
            <p className="text-sm font-semibold text-white">Bites harder because:</p>
            <ul className="mt-2 space-y-1">
              {bites.map((g) => (
                <li key={g} className="text-sm leading-relaxed text-gray-300">
                  {GAP_TEXT[g].bites}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3">
        {curveball.choices.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              save({ picks: [...picks, { curveball: curveball.id, choice: i }], done: picks.length + 1 === MONTHS });
              setResultMonth(state.month);
              window.scrollTo({ top: 0 });
            }}
            className="min-h-[44px] w-full text-left rounded-lg border border-[var(--line-2)] bg-[var(--night)] px-4 py-3 text-sm font-semibold text-white"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the gates**

`npx tsc --noEmit` clean, `npm test` 230 passing (`arena.test.ts`, `arenaContent.test.ts` untouched), `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/leaders/training/launch/ArenaStep.tsx
git commit -m "Avenue at night: the Arena as a street of months with warm counters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Controller browser check**

Fixture leader, `/leaders/training/launch?step=8` (`ARENA_ENABLED` is true), 375 px and desktop:
- Before entering: six dim month lamps on one row at 375 px (no wrap, no horizontal scroll).
- Play month 1: the verdict in serif, the counters as warm numerals (zero is dim), month 1 lamp lit, blue ring on month 2 when back on the curveball.
- Finish six months: a lit vertical street, each principle under "MONTH n" with its choice and anchor; "Where your plan is thinnest" below; "Show my launch plan" and "Play it again" work as before.

---

### Task 10: Calling Profile and Launch Plan on screen (print unchanged)

**Files:**
- Modify: `src/app/leaders/training/calling/profile/page.tsx` (imports lines 1-19; wrapper line 123; title block lines 131-136; the six `section` openings)
- Modify: `src/app/leaders/training/launch/plan/page.tsx` (imports lines 1-13; wrapper line 146; title block lines 157-160; the eleven `section` openings; the checkboxes at lines 395-401 and 422-428)

**Interfaces:**
- Consumes: `PhaseOpening`, `JourneyFooter`, `VERSES` (Task 5); CSS `.avenue-night`, `.night-section`, `.night-h2` and the print rules (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Profile: imports**

In `src/app/leaders/training/calling/profile/page.tsx`, after `import PrintButton from "@/components/journey/PrintButton";` add:

```ts
import PhaseOpening from "@/components/avenue/PhaseOpening";
import JourneyFooter from "@/components/avenue/JourneyFooter";
import { VERSES } from "../../verses";
```

- [ ] **Step 2: Profile: night wrapper and header**

Replace the opening wrapper line `    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-4">` with:

```tsx
    <div className="avenue-night">
    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-8 print:space-y-4">
```

and add one more `</div>` right after the page's final `</div>` (before `  );`), so the wrapper closes.

Replace the title block (lines 131-136):

```tsx
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Calling Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Private to you. Your sender and the admins cannot see it.
        </p>
      </div>
```

with:

```tsx
      {/* Print keeps the original title block; the screen shows the phase opening. */}
      <div className="hidden print:block">
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Calling Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Private to you. Your sender and the admins cannot see it.
        </p>
      </div>
      <div className="no-print">
        <PhaseOpening
          size="small"
          headingLevel={1}
          stop={2}
          name="My Calling Profile"
          reference={VERSES.phase2.reference}
          short={VERSES.phase2.short}
          verse={VERSES.phase2.text}
        >
          <p className="text-sm text-[var(--muted)]">Private to you. Your sender and the admins cannot see it.</p>
        </PhaseOpening>
      </div>
```

Directly before the wrapper's closing `</div>` of `print-page` (after the "My conversation" section) add `<JourneyFooter />`.

- [ ] **Step 3: Profile: sections as serif headings on the night ground**

Every `<section className="panel p-5">` in this file (six of them) becomes `<section className="panel night-section p-5">` (use replace-all on that exact string). Then replace each section's eyebrow line with a serif heading, exactly:

| Old | New |
|---|---|
| `<p className="eyebrow">My three layers</p>` | `<h2 className="night-h2">My three layers</h2>` |
| `<p className="eyebrow">My availability</p>` | `<h2 className="night-h2">My availability</h2>` |
| `<p className="eyebrow">My yes to the Shared Call</p>` | `<h2 className="night-h2">My yes to the Shared Call</h2>` |
| `<p className="eyebrow">My gifts</p>` | `<h2 className="night-h2">My gifts</h2>` |
| `<p className="eyebrow">My mission field</p>` | `<h2 className="night-h2">My mission field</h2>` |
| `<p className="eyebrow">My conversation</p>` | `<h2 className="night-h2">My conversation</h2>` |

On screen `.avenue-night .night-section` drops the box for a hairline (Task 1, screen only); in print `.print-page .panel` still draws the black-bordered white box, and `.print-page .night-h2` prints the heading like the old eyebrow.

Also wrap the gate, loading and error returns (lines 59-85) in `avenue-night` the same way as Task 8 (outer `<div className="avenue-night">`; loading screen `avenue-night flex items-center justify-center`).

- [ ] **Step 4: Plan: imports, wrapper and header**

In `src/app/leaders/training/launch/plan/page.tsx`, after `import PrintButton from "@/components/journey/PrintButton";` add:

```ts
import PhaseOpening from "@/components/avenue/PhaseOpening";
import JourneyFooter from "@/components/avenue/JourneyFooter";
import { VERSES } from "../../verses";
```

Replace `    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-4">` with:

```tsx
    <div className="avenue-night">
    <div className="print-page max-w-3xl mx-auto px-4 py-8 space-y-8 print:space-y-4">
```

and add the matching extra `</div>` before `  );`. Replace the title block (lines 157-160):

```tsx
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Launch Plan</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Private to you.</p>
      </div>
```

with:

```tsx
      {/* Print keeps the original title block; the screen shows the phase opening. */}
      <div className="hidden print:block">
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Launch Plan</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Private to you.</p>
      </div>
      <div className="no-print">
        <PhaseOpening
          size="small"
          headingLevel={1}
          stop={3}
          name="My Launch Plan"
          reference={VERSES.phase3.reference}
          short={VERSES.phase3.short}
          verse={VERSES.phase3.text}
        >
          <p className="text-sm text-[var(--muted)]">Private to you.</p>
        </PhaseOpening>
      </div>
```

Add `<JourneyFooter />` directly after the "Next actions" section, inside `print-page`.

- [ ] **Step 5: Plan: sections as serif headings**

Replace-all `<section className="panel p-5">` with `<section className="panel night-section p-5">` (eleven sections; the inner tiles are `panel p-4` and are not touched). Then:

| Old | New |
|---|---|
| `<p className="eyebrow">Why and prayer</p>` | `<h2 className="night-h2">Why and prayer</h2>` |
| `<p className="eyebrow">Mission group</p>` | `<h2 className="night-h2">Mission group</h2>` |
| `<p className="eyebrow">Space</p>` | `<h2 className="night-h2">Space</h2>` |
| `<p className="eyebrow">Launch team</p>` | `<h2 className="night-h2">Launch team</h2>` |
| `<p className="eyebrow">Commitments</p>` | `<h2 className="night-h2">Commitments</h2>` |
| `<p className="eyebrow">Rhythm and launch date</p>` | `<h2 className="night-h2">Rhythm and launch date</h2>` |
| `<p className="eyebrow">Invite list</p>` | `<h2 className="night-h2">Invite list</h2>` |
| `<p className="eyebrow">Shepherding</p>` | `<h2 className="night-h2">Shepherding</h2>` |
| `<p className="eyebrow">Principles learned</p>` | `<h2 className="night-h2">Principles learned</h2>` |
| `<p className="eyebrow">Where your plan is thin</p>` | `<h2 className="night-h2">Where your plan is thin</h2>` |
| `<p className="eyebrow">Next actions</p>` | `<h2 className="night-h2">Next actions</h2>` |

(The `Weeks until launch` and `Gatherings in the first six months` eyebrows inside the tiles stay.) Both checkbox inputs (`className="mt-1 h-4 w-4"`, two places) become `className="mt-1 h-4 w-4 accent-[var(--lamp)] print:accent-auto"`: a done action is lit on screen, and prints in the default colour as today (F10). Wrap the gate, loading and error returns in `avenue-night` as in Step 3.

- [ ] **Step 6: Check no em dash and no stray eyebrow heading**

Run: `grep -n 'className="eyebrow">\(My \|Why\|Mission\|Space\|Launch team\|Commitments\|Rhythm\|Invite\|Shepherding\|Principles\|Where\|Next\)' src/app/leaders/training/calling/profile/page.tsx src/app/leaders/training/launch/plan/page.tsx`
Expected: no output.

Run: `grep -c $'\xe2\x80\x94' src/app/leaders/training/calling/profile/page.tsx src/app/leaders/training/launch/plan/page.tsx`
Expected: `0` for both (F14).

Run: `grep -c 'panel night-section p-5' src/app/leaders/training/calling/profile/page.tsx src/app/leaders/training/launch/plan/page.tsx`
Expected: `6` and `11`.

- [ ] **Step 7: Run the gates**

`npx tsc --noEmit` clean, `npm test` 230 passing, `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 8: Commit**

```bash
git add src/app/leaders/training/calling/profile/page.tsx src/app/leaders/training/launch/plan/page.tsx
git commit -m "Avenue at night: Calling Profile and Launch Plan on screen, print unchanged

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Controller browser check**

Fixture leader with some Calling and Launch answers, 375 px and desktop:
- Screen: small phase opening ("Stop 2 of 5", serif "My Calling Profile", verse, "(NLT)"), sections as serif headings over hairlines (no boxes), NLT notice at the foot. Same for the Launch Plan (Stop 3); checkboxes warm when ticked, still saving.
- Print preview (Ctrl+P) of both, before and after this commit: white page, black text, one black-bordered box per section with the same gaps as before (F10), ticked checkboxes in the default colour, not amber (F10), headings small uppercase as before, the old title block ("My Calling Profile" / "My Launch Plan"), no phase opening, no footer, no buttons. Compare with a print preview from `main` if in doubt.

---

### Task 11: Leader dashboard

**Files:**
- Rewrite: `src/components/journey/NextStepCard.tsx`
- Rewrite: `src/app/leaders/page.tsx`

**Interfaces:**
- Consumes: `avenueStops`, `greetingFor`, `apprenticesOnRung`, `type AvenueProgress` (Task 2); `AvenueMap` (Task 3); `nextStep` (`src/lib/nextStep.ts`, unchanged); the same three reads NextStepCard already makes (`/api/leader-training`, `/api/leader-checkins`, the two worksheets) and the dashboard's existing `/api/network` read.
- Produces: `NextStepCard` props become `{ enabled: boolean; apprenticesOnRung: number | null; networkFailed: boolean }`.

- [ ] **Step 1: Rewrite NextStepCard**

`src/components/journey/NextStepCard.tsx`. The requests and `nextStep` choice are unchanged. Added: it keeps the check-in count from the response it already reads, and draws the compact map above the one lit card. The phone street shows no here-panel button (the card is the call to action).

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { leaderFetch } from "@/lib/leaderFetch";
import { useWorksheet } from "@/lib/useWorksheet";
import { callingCompleteCount, launchCompleteCount, type CallingData, type LaunchData } from "@/lib/journey";
import { reconcilePhases } from "@/app/leaders/training/progressMerge";
import { mondayOf } from "@/lib/weeks";
import type { CheckinEntry } from "@/components/ui/CheckinHistory";
import { nextStep } from "@/lib/nextStep";
import { avenueStops, type AvenueProgress } from "@/lib/avenue";
import AvenueMap from "@/components/avenue/AvenueMap";

export interface NextStepCardProps {
  enabled: boolean;
  apprenticesOnRung: number | null; // from the dashboard's network read; null while loading
  networkFailed: boolean;
}

// The dashboard's journey (spec 4.4): a compact avenue showing where the
// leader is, then "Your next step" as the one lit card on the page. The
// next step is the first unfinished thing among Foundations, Calling,
// Launch and this week's check-in. Full access only; the caller gates it.
export default function NextStepCard({ enabled, apprenticesOnRung, networkFailed }: NextStepCardProps) {
  const router = useRouter();
  const calling = useWorksheet<CallingData>("calling", enabled);
  const launch = useWorksheet<LaunchData>("launch", enabled);

  const [foundations, setFoundations] = useState<{ done: number; total: number } | null>(null);
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null);
  const [checkinCount, setCheckinCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    leaderFetch("/api/leader-training")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        const progress = body.progress ?? {};
        const phases = reconcilePhases(progress.watchedEpisodes ?? [], progress.completedModules ?? []);
        const phase1 = phases.find((p) => p.id === "phase1");
        const done = phase1 ? phase1.modules.filter((m) => m.completed).length : 0;
        const total = phase1 ? phase1.modules.length : 0;
        setFoundations({ done, total });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
      });

    leaderFetch("/api/leader-checkins")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
        return body;
      })
      .then((data) => {
        if (cancelled) return;
        const list: CheckinEntry[] = data.checkins ?? [];
        const thisWeek = mondayOf(new Date());
        setCheckedIn(list.some((c) => c.weekStart === thisWeek));
        setCheckinCount(list.length);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const ready =
    calling.loaded &&
    launch.loaded &&
    foundations !== null &&
    checkedIn !== null &&
    checkinCount !== null &&
    (apprenticesOnRung !== null || networkFailed);
  const failed = Boolean(calling.error || launch.error || loadError);

  if (!ready && !failed) return null;

  if (failed) {
    return (
      <div className="night-card p-5">
        <p className="text-sm text-[var(--muted)]">Could not work out your next step.</p>
      </div>
    );
  }

  const callingDone = callingCompleteCount(calling.data as CallingData);
  const launchDone = launchCompleteCount(launch.data as LaunchData);
  const step = nextStep({
    foundationsDone: foundations!.done,
    foundationsTotal: foundations!.total,
    callingDone,
    launchDone,
    checkedInThisWeek: checkedIn === true,
  });
  const progress: AvenueProgress = {
    foundationsDone: foundations!.done,
    foundationsTotal: foundations!.total,
    callingDone,
    launchDone,
    checkinCount: checkinCount!,
    apprenticesOnRung: apprenticesOnRung ?? 0,
  };

  return (
    <div className="space-y-6">
      <AvenueMap
        compact
        stops={avenueStops(progress)}
        selectedId={null}
        onSelect={(id) => router.push(`/leaders/training?phase=${id}`)}
        hereAction={null}
      />
      {networkFailed ? (
        <p className="text-xs text-amber-400">We couldn&rsquo;t load your network, so Multiply may show as ahead.</p>
      ) : null}
      <div className="night-card-lit p-6">
        <span className="eyebrow">Your next step</span>
        <h2 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)]">{step.title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>
        <Link
          href={step.href}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
        >
          {step.button}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the dashboard page**

Replace the whole of `src/app/leaders/page.tsx` with the code below. What changes: `avenue-night` ground, serif greeting, order (greeting, pending-sender banner, map and next-step card, profile, tools), tools as one hairline list instead of two grids of boxes, no `Reveal` (pages are still), and the existing `/api/network` read now checks `res.ok` and also counts apprentices on rung 1 or above for the map with `apprenticesOnRung` (F15). The access check, the pending-sender logic and `answerPending` are unchanged. The unused `Image` import is removed (F12); record the new lint count. The next-step card now waits for the network read to settle (success or failure) before it shows; that wait is accepted (F17).

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logout, User } from "@/lib/auth";
import { leaderFetch } from "@/lib/leaderFetch";
import { apprenticesOnRung as countApprenticesOnRung, greetingFor } from "@/lib/avenue";
import ProfileCard from "@/components/ui/ProfileCard";
import NextStepCard from "@/components/journey/NextStepCard";
import {
  GraduationCap,
  BookOpen,
  HeadphonesIcon,
  FolderOpen,
  LogOut,
  ExternalLink,
  Calendar,
  Globe,
  BarChart2,
  Lock,
  ChevronDown,
  ChevronRight,
  Network,
} from "lucide-react";

// Calendar URLs
const AVENUE_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";
const LEADERS_CALENDAR_URL =
  "https://calendar.google.com/calendar/embed?src=c_f77b62d0efa5c8f706f97ed58b880dc6bdbd9ca0a67d4b413748de6f0b2f612e%40group.calendar.google.com&ctz=Australia%2FSydney";

interface DashboardNetworkPerson {
  id: string;
  firstName?: string;
  sentOutBy: string | null;
  linkStatus?: string;
  apprenticeStep?: number;
}

export default function LeadersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [pendingSender, setPendingSender] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [apprenticesOnRung, setApprenticesOnRung] = useState<number | null>(null);
  const [networkFailed, setNetworkFailed] = useState(false);
  const [greetingTime] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
    } else {
      setUser(currentUser);
      // Check leader access
      leaderFetch("/api/leader-access")
        .then((res) => res.json())
        .then((data) => {
          setHasFullAccess(data.full_access === true);
          setAccessChecked(true);
        })
        .catch(() => {
          setAccessChecked(true);
        });

      // One read of the network: the map's Multiply stop, and whether
      // someone has claimed to have sent this person out.
      leaderFetch("/api/network")
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || `Could not load your network (${res.status})`);
          return data;
        })
        .then((data) => {
          const people: DashboardNetworkPerson[] = data.people ?? [];
          setApprenticesOnRung(countApprenticesOnRung(people, data.viewerId ?? null));
          const me = people.find((p) => p.id === data.viewerId);
          if (!me?.sentOutBy || me.linkStatus === "confirmed") return;
          const sender = people.find((p) => p.id === me.sentOutBy);
          setPendingSender(sender?.firstName ?? "Someone");
        })
        .catch((e) => {
          // The banner is a nicety and must not break the dashboard; the map
          // says plainly that Multiply could not be checked.
          console.error("Dashboard network load failed", e);
          setNetworkFailed(true);
        });
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const answerPending = async (action: "confirm" | "decline") => {
    if (!user) return;
    setConfirming(true);
    setPendingError(null);
    try {
      const res = await leaderFetch("/api/network", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPendingError(data?.error || "We could not save your answer. Please try again.");
        return;
      }
      setPendingSender(null);
    } catch {
      setPendingError("We could not save your answer. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="avenue-night flex items-center justify-center">
        <div className="text-[var(--ink)]">Loading...</div>
      </div>
    );
  }

  // Cards that require full_access
  const restrictedCards = ["training", "study", "resources"];

  // The main tools first, then the secondary ones, in one hairline list.
  const tools = [
    { id: "training", title: "Leader Training", icon: GraduationCap, href: "/leaders/training" },
    { id: "network", title: "Discipleship Network", icon: Network, href: "/leaders/network" },
    { id: "study", title: "Weekly Pathways Topics", icon: BookOpen, href: "/leaders/study-guides" },
    { id: "support", title: "Leader Support", icon: HeadphonesIcon, href: "/leaders/support" },
    { id: "resources", title: "Resources", icon: FolderOpen, href: "/leaders/resources" },
    { id: "workshops", title: "Workshop Hub", icon: BarChart2, href: "/leaders/workshops" },
    { id: "admin", title: "Admin", icon: Lock, href: "/leaders/admin" },
  ];

  const isRestricted = (cardId: string) => !hasFullAccess && restrictedCards.includes(cardId);

  const quickLinkClass =
    "flex min-h-[44px] items-center gap-2 px-4 py-2 border border-[var(--line-2)] rounded-full text-sm text-gray-300 hover:text-white";

  return (
    <div className="avenue-night">
      {/* Header */}
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2 sm:px-6">
          <span className="text-sm font-semibold text-[var(--ink)]">Leaders Hub</span>
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-[var(--muted)] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
        {/* Greeting (spec 4.4) */}
        <div className="mb-10">
          <p className="eyebrow">Leader dashboard</p>
          <h1 className="mt-2 font-serif text-[34px] leading-[1.05] text-[var(--ink)] md:text-[52px]">
            {greetingFor(greetingTime, user.name)}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Access resources, training, and tools for Avenue leaders</p>
        </div>

        {/* Someone says they sent you out */}
        {pendingSender && (
          <div className="night-card mb-8 p-6">
            <span className="eyebrow">Discipleship Network</span>
            <p className="mt-2 text-[var(--ink)]">{pendingSender} says they sent you out.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => answerPending("confirm")}
                disabled={confirming}
                className="min-h-[44px] rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => answerPending("decline")}
                disabled={confirming}
                className="min-h-[44px] rounded-full border border-[var(--line-2)] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Not right
              </button>
            </div>
            {pendingError && <p className="mt-3 text-sm text-[var(--muted)]">{pendingError}</p>}
          </div>
        )}

        {/* Where you are on the avenue, then the one lit card */}
        {accessChecked && hasFullAccess && (
          <div className="mb-12">
            <NextStepCard enabled apprenticesOnRung={apprenticesOnRung} networkFailed={networkFailed} />
          </div>
        )}

        {/* My Profile */}
        <div className="mb-12">
          <ProfileCard email={user.email} fallbackName={user.name} collapsible />
        </div>

        {/* Tools: a quiet hairline list */}
        <nav aria-label="Leader tools">
          <h2 className="night-h2 mb-3">Tools</h2>
          <ul className="border-t border-[var(--line)]">
            {tools.map((card) => (
              <li key={card.id} className="border-b border-[var(--line)]">
                {isRestricted(card.id) ? (
                  <div
                    className="flex min-h-[56px] items-center gap-4 py-3 opacity-60"
                    title="Your access opens after your first call with a pastor"
                  >
                    <card.icon className="h-5 w-5 flex-shrink-0 text-[var(--dim)]" />
                    <span className="flex-1 text-[var(--muted)]">{card.title}</span>
                    <Lock className="h-4 w-4 text-[var(--dim)]" aria-label="Locked" />
                  </div>
                ) : (
                  <Link href={card.href} className="flex min-h-[56px] items-center gap-4 py-3">
                    <card.icon className="h-5 w-5 flex-shrink-0 text-[var(--accent)]" />
                    <span className="flex-1 text-[var(--ink)]">{card.title}</span>
                    <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Pending Access Message */}
        {accessChecked && !hasFullAccess && (
          <p className="mt-6 text-sm italic text-[var(--muted)]">
            Your access opens after your first call with a pastor.{" "}
            <Link href="/leaders/support" className="inline-flex min-h-[44px] items-center not-italic text-[var(--accent)]">
              Book it through Leader Support
            </Link>
          </p>
        )}

        {/* Quick Links: folded away so the page leads with the tools */}
        <div className="mt-8">
          <button
            onClick={() => setQuickOpen((v) => !v)}
            aria-expanded={quickOpen}
            className="flex min-h-[44px] w-full items-center justify-between border-b border-[var(--line)] py-3"
          >
            <span className="text-sm font-medium text-[var(--ink)]">Quick Links</span>
            <ChevronDown className={`h-4 w-4 text-[var(--muted)] ${quickOpen ? "rotate-180" : ""}`} />
          </button>

          {quickOpen && (
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={AVENUE_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="h-4 w-4" />
                Avenue Calendar
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href={LEADERS_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className={quickLinkClass}>
                <Calendar className="h-4 w-4" />
                Leaders Calendar
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href="/" className={quickLinkClass}>
                <Globe className="h-4 w-4" />
                Main Website
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run the gates**

`npx tsc --noEmit` clean, `npm test` 230 passing (`nextStep.test.ts` unchanged), `npm run lint` at most 56, expected 54 to 55 (the unused `Image` import is removed, F12; record the new number and use it as the ceiling for later tasks), `npm run build` passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/journey/NextStepCard.tsx src/app/leaders/page.tsx
git commit -m "Avenue at night: dashboard greeting, compact avenue and the one lit card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Controller browser check**

`/leaders` with the fixture leader (full access), 375 px and desktop:
- Serif greeting by Melbourne time; nothing fades in on load or scroll.
- Desktop: the compact map (sky cropped) with the right lamps lit; clicking a lamp opens `/leaders/training?phase=phaseN` on that phase. 375 px: the vertical street with no button inside it.
- "Your next step" is the one lit card (warm corner, warm border), serif title, blue button; same step as before this branch.
- Profile card, then the Tools hairline list (chevrons, blue icons), Quick Links toggle.
- A fixture leader without full access: no map or next-step card, three tools greyed with a lock, the access line with its Leader Support link.
- Block `/api/network` in DevTools (request blocking) and reload: the map still shows, with the amber line under it.

---

### Task 12: Login page

**Files:**
- Modify: `src/app/login/page.tsx` (imports line 8; constants lines 12-14; headings line 60; the returned JSX lines 69-161; a new `NightStreet` function at the end)

**Interfaces:**
- Consumes: CSS from Task 1. `requestCode`, `verifyCode`, `requestAccess` and all state and handlers unchanged.
- Produces: nothing new.

- [ ] **Step 1: Imports and constants**

Delete line 8 (`import Reveal from "@/components/ui/Reveal";`). Replace lines 12-14 with:

```ts
const INPUT =
  "w-full min-h-[48px] bg-[var(--night)] border border-[var(--line-2)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)]";
const LABEL = "block text-sm text-[var(--muted)] mb-2";
```

Replace line 60 with sentence-case headings (spec 4.5: serif "Leader login"):

```ts
  const heading = mode === "request" ? "Request access" : mode === "code" ? "Enter your code" : "Leader login";
```

- [ ] **Step 2: The returned JSX**

Replace the whole `return ( ... );` of `LoginPage` (lines 69-161) with:

```tsx
  return (
    <div className="avenue-night relative flex flex-col items-center justify-center overflow-hidden px-4 py-16">
      <NightStreet />
      <div className="relative z-10 w-full max-w-md">
        <div className="night-card p-8">
          <div className="mb-8 text-center">
            <Image src="/images/Avenue.png" alt="Avenue" width={180} height={50} className="mx-auto mb-6" />
            <h1 className="font-serif text-[34px] leading-tight text-[var(--ink)]">{heading}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "request" && (
              <div>
                <label className={LABEL}>Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dim)]" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Your name" autoComplete="name" />
                </div>
              </div>
            )}

            {mode !== "code" && (
              <div>
                <label className={LABEL}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dim)]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="your@email.com" autoComplete="email" required />
                </div>
              </div>
            )}

            {mode === "code" && (
              <div>
                <label className={LABEL}>Sign-in code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--dim)]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,10}"
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className={`${INPUT} tracking-[0.4em] text-lg placeholder:tracking-normal placeholder:text-sm`}
                    placeholder="Code from your email"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
            >
              <span>{loading ? "Please wait..." : button}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-[var(--muted)]">
            {mode === "code" ? (
              <button
                type="button"
                className="min-h-[44px] hover:text-white"
                onClick={() => {
                  setCode("");
                  setError("");
                  setMode("email");
                }}
              >
                Use a different email, or send a new code
              </button>
            ) : (
              <button
                type="button"
                className="min-h-[44px] hover:text-white"
                onClick={() => {
                  setError("");
                  setMode(mode === "request" ? "email" : "request");
                }}
              >
                {mode === "request" ? "Already registered? Sign in" : "New leader? Request access"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="inline-flex min-h-[44px] items-center text-xs text-[var(--dim)] hover:text-[var(--muted)]">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

// The night street behind the form (spec 4.5): sky, a few stars, the road
// with its dashed centre line, and one lit streetlight to the side. Geometry
// and colours from mockup option A. Anchored bottom right so the lamp stays
// in view on a phone.
function NightStreet() {
  const stars: [number, number, number][] = [
    [60, 40, 1],
    [180, 80, 1.2],
    [320, 30, 0.9],
    [470, 70, 1],
    [610, 26, 1.3],
    [760, 60, 0.9],
    [900, 34, 1.1],
    [960, 96, 0.8],
    [120, 120, 0.7],
    [540, 110, 0.8],
    [700, 150, 0.9],
    [840, 120, 0.7],
  ];
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMaxYMax slice"
    >
      <defs>
        <radialGradient id="login-cone" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#ffc56b" stopOpacity={0.55} />
          <stop offset="60%" stopColor="#ffc56b" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="login-halo">
          <stop offset="0%" stopColor="#ffdca0" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ffc56b" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="1000" height="600" fill="#07090f" />
      <g fill="#c9d3ea" opacity={0.55}>
        {stars.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <rect x="0" y="480" width="1000" height="120" fill="#0b0f18" />
      <line x1="0" y1="480" x2="1000" y2="480" stroke="#1f2736" />
      <line x1="0" y1="540" x2="1000" y2="540" stroke="#2b3446" strokeDasharray="18 16" />
      <polygon points="880,262 800,480 960,480" fill="url(#login-cone)" />
      <circle cx="880" cy="254" r="40" fill="url(#login-halo)" />
      <rect x="878" y="254" width="4" height="226" fill="#3a4458" />
      <rect x="864" y="246" width="32" height="10" rx="3" fill="#ffc56b" />
    </svg>
  );
}
```

The block above ends with `NightStreet`'s closing `}`, which is the last line of the file.

- [ ] **Step 3: Run the gates**

`npx tsc --noEmit` clean, `npm test` 230 passing, `npm run lint` 55 to 56, `npm run build` passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "Avenue at night: the night street behind the leader login

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Controller browser check**

Signed out, `/login` at 375 px and desktop:
- Desktop: stars, the road with a dashed centre line, one lit lamp with its cone on the right; the form on a night card; serif "Leader login". No fade-in.
- 375 px: the lamp and its light visible (right side, it may sit partly behind the card), no horizontal scroll, inputs at least 48 px tall.
- Switch to "New leader? Request access" (serif "Request access") and back. Enter an `@example.invalid` address and send: the notice appears and the heading reads "Enter your code". Do not type a real code; Henry's codes are never typed by Claude.

---

### Task 13: Final pass (controller-run)

**Files:** none unless a check fails (then fix in the task that owns the file, as a new commit).

- [ ] **Step 1: Whole-branch gates**

Run: `npx tsc --noEmit`, `npm test` (expect 230 passing), `npm run lint` (55 to 56), `node --env-file=.env.local scripts/check-auth.mjs` (all passed), `npm run guard` (`clean`), stop the dev server, `npm run build`, restart the dev server.

- [ ] **Step 2: No em dash on the branch**

Run: `git diff main --name-only | xargs grep -l $'\xe2\x80\x94'` and `git log main..HEAD --format=%B | grep -c $'\xe2\x80\x94'`
Expected: no files, and `0`.

- [ ] **Step 3: Presentation only**

Run: `git diff main --stat -- src/app/api src/lib/journey.ts src/lib/useWorksheet.ts src/app/leaders/training/useTrainingProgress.ts src/app/leaders/training/progressMerge.ts src/app/leaders/training/useCheckins.ts src/app/leaders/training/useNetworkView.ts src/lib/useMyPeople.ts`
Expected: no output.

- [ ] **Step 4: Browser sweep**

With a fixture leader (`@example.invalid`), at 375 px and 1280 px, reduced motion off and on: `/login`, `/leaders`, `/leaders/training` (every stop), `/leaders/training/calling` (every section), `/leaders/training/launch` (every step, including the Arena), both print previews. Check: no horizontal scroll, 44 px targets, lamp-coloured focus ring when tabbing, moments play once at the instant they happen and never on reload, glows only on lamps lighting and counts rising, pages otherwise still, public home page unchanged. Clean up fixtures by exact email; `npm run guard` prints `clean`.

- [ ] **Step 5: Whole-branch review**

Dispatch the final reviewer (opus) with `git diff main..HEAD` against the spec and this plan.

- [ ] **Step 6: Ask Henry**

Ask with a multiple-choice question whether to push `feat/avenue-night` (merge to `main` deploys to Netlify). Never push without his "push".
