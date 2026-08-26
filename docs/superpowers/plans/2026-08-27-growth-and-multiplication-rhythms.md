# Growth and Multiplication Rhythms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn phases 4 and 5 from empty placeholders into two ongoing rhythms: a weekly RPMS health check-in with a history worth revisiting, and per-person apprenticeship tracking built on the discipleship network that already exists.

**Architecture:** One new table for weekly check-ins keyed by leader and week. One new column on `network_people` for the apprenticeship step, because that row already describes the sending relationship. One new service-role route for check-ins, one new action on the existing network route. Phase 4 and phase 5 render as ongoing rhythms with no completion percentage.

**Tech Stack:** Next.js 16 app router, React 19, TypeScript, Tailwind v4, Supabase service-role client, lucide-react, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-growth-and-multiplication-rhythms-design.md`

## Global Constraints

- **Never run `git push`.** Commit locally only. Every push auto-deploys via Netlify and deploys are scarce.
- **Never use em dashes** (U+2014) anywhere: code, comments, UI copy, commit messages.
- **All database access goes through `getSupabaseAdmin()`**, guarded by `adminConfigError()`. Every table has RLS on with no write policies, so an anon-key write silently affects zero rows.
- **The leaders check runs FIRST and unconditionally** on every non-admin request, before any query against a feature table. This bug shipped twice in this codebase. Read `ensureProgress` in `src/app/api/leader-training/route.ts` for the corrected pattern and copy its ordering and comment style.
- **Every Supabase call destructures `error` and surfaces it.** A swallowed failure is indistinguishable from success and has cost this project hours more than once.
- **Design system:** solid `.panel` surfaces, hairline `var(--border)`, single accent `var(--accent)` (#4f7cff), `.eyebrow` labels. No glassmorphism, no gradients, no glow.
- **Lint baseline is 56 problems (35 errors, 21 warnings).** Not expected to be clean. Gate: no new problem in a file you touched, total not above 56. Note `src/app/leaders/training/page.tsx` carries a pre-existing `set-state-in-effect` error whose detection is flaky: it sometimes reports 55. Do not chase that number and do not try to fix that error.
- **Run `npx tsc --noEmit` before every commit.** It must be clean. It has caught real bugs here that lint missed.
- Commits are authored as Henry (the git default). End every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- `git add` only the files named in your task. NEVER `git add -A`. `.mcp.json`, `HANDOVER.md`, `HANDOVER_PROMPT.md` and `scripts/demo-network.mjs` stay untracked.
- Dev server runs on port 3000. Reuse it.
- **Live production database.** Only two real leaders exist: `info@avenuemission.com` and `henry.jamcmahon@gmail.com`. Test rows use emails ending `@example.invalid` and are deleted by exact literal email. No unfiltered delete, no `neq`, no `like`, no truncate. Borrowed real rows are captured and restored in a `finally` with an error-checked named assertion using the same filter.

## What phases 4 and 5 must not become

Repeat this to yourself before writing any UI:

- **Not a checklist.** Neither phase shows modules complete or a completion percentage.
- **Not a form nobody fills in.** The weekly check-in is four taps and one sentence.
- **Not a second place where progress lives.** The apprenticeship step lives on the network row, so phase 5 and the family tree are the same data seen twice.
- **Missed weeks look neutral, never red.** A history that shames someone for a busy month is a history they stop opening.

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `supabase/migrations/006_growth_rhythms.sql` | `leader_checkins` table and the `apprentice_step` column |
| `scripts/check-rhythms-schema.mjs` | Confirms both schema changes exist |
| `src/app/api/leader-checkins/route.ts` | The only door to `leader_checkins` |
| `scripts/check-checkins-api.mjs` | End-to-end exercise of that route, self-cleaning |
| `src/components/ui/CheckinHistory.tsx` | The week-block history strip, presentational |
| `src/lib/weeks.ts` | Week-start maths, pure |
| `src/lib/weeks.test.ts` | Unit tests for it |

**Modify**

| File | Change |
|---|---|
| `src/app/api/network/route.ts` | New `set-apprentice-step` action, and depth in the GET response |
| `src/app/leaders/training/page.tsx` | Phase 4 and phase 5 content, ongoing presentation |

---

## Task Order and Gates

⚠️ **Gate at Task 1:** the migration must be run before anything downstream can be verified. Report BLOCKED and stop.

⚠️ **Task 5 and Task 6 both edit `src/app/leaders/training/page.tsx`.** They must never run at the same time.

---

### Task 1: Schema

**Files:** Create `supabase/migrations/006_growth_rhythms.sql`, `scripts/check-rhythms-schema.mjs`

**Interfaces:**
- Produces: table `public.leader_checkins` with columns `email, week_start, relational, physical, mental, spiritual, reflection, created_at, updated_at`, and column `apprentice_step` on `public.network_people`. Tasks 2 and 3 read and write exactly these names.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- Growth and Multiplication rhythms.
--
-- leader_checkins holds one weekly RPMS reflection per leader. The
-- primary key is (email, week_start), so re-opening the current week
-- edits it rather than stacking duplicates.
--
-- apprentice_step goes on network_people because that row already
-- describes the sending relationship, which is exactly what an
-- apprenticeship step is a property of. Keeping it there means phase 5
-- and the family tree are the same data seen twice, not two places
-- progress can disagree.
-- ============================================================

create table if not exists public.leader_checkins (
  email       text not null,
  week_start  date not null,

  relational  smallint not null check (relational between 1 and 10),
  physical    smallint not null check (physical   between 1 and 10),
  mental      smallint not null check (mental     between 1 and 10),
  spiritual   smallint not null check (spiritual  between 1 and 10),
  reflection  text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (email, week_start)
);

alter table public.leader_checkins enable row level security;

-- 0 means not started. 1 to 5 are Hero Maker's apprenticeship steps.
alter table public.network_people
  add column if not exists apprentice_step smallint not null default 0
    check (apprentice_step between 0 and 5);
```

- [ ] **Step 2: Write the schema check script**

Model it on `scripts/check-training-table.mjs`. It must select every `leader_checkins` column by name AND select `apprentice_step` from `network_people`, exit non-zero with a clear message on failure, and never print a key.

- [ ] **Step 3: Run it, expect failure, record the exact wording**

- [ ] **Step 4: STOP. Hard gate.** Report BLOCKED. There is no DDL path through the Supabase JS client; do not attempt one.

- [ ] **Step 5: After the gate clears, re-run, expect OK, and commit both files**

---

### Task 2: The check-ins API

**Files:** Create `src/app/api/leader-checkins/route.ts`, `scripts/check-checkins-api.mjs`

**Interfaces:**
- Produces: `GET /api/leader-checkins?email=` returning `{ checkins: [{ weekStart, relational, physical, mental, spiritual, reflection, updatedAt }] }` newest first, capped at 52. `PUT` accepting `{ email, weekStart, relational, physical, mental, spiritual, reflection }`. Tasks 5 consumes both.

- [ ] **Step 1: Write the route**

Requirements that must not be missed:

1. The leaders check runs first and unconditionally, exactly as `ensureProgress` does. A non-leader gets 403 before any `leader_checkins` query.
2. `weekStart` must be validated as an ISO date string `YYYY-MM-DD` AND must be a Monday. Reject anything else with 400. A client sending an arbitrary day would silently create a second row for the same week.
3. Scores validated as integers 1 to 10 inclusive. Reject with 400 otherwise, naming the offending field.
4. `reflection` capped at 2000 characters, rejected with 400 beyond that.
5. PUT is an upsert on the composite key `(email, week_start)`, so re-submitting the same week edits it.
6. `updated_at` set on every write.
7. Refuse a `weekStart` in the future with 400. A leader cannot reflect on a week that has not happened.
8. Every Supabase call destructures `error` and surfaces it.

- [ ] **Step 2: Write the end-to-end check script**

Cover, each distinctly named: GET for a real leader returns 200 and an array; GET for a non-leader returns 403; PUT stores a check-in and GET reads it back identically; PUT for the same week updates rather than duplicating, proven by counting rows; a non-Monday `weekStart` returns 400; a future `weekStart` returns 400; a score of 0 returns 400; a score of 11 returns 400; a non-integer score returns 400; an over-long reflection returns 400.

Use `checkins-check-temp@example.invalid` for the 403 case. Borrow `info@avenuemission.com` for the rest, capture its check-ins first, and delete only rows you created, by exact email and exact week_start.

- [ ] **Step 3: Run it. Every check must pass. Then list the table and confirm no test rows remain.**

- [ ] **Step 4: Lint, tsc, commit**

---

### Task 3: Apprenticeship steps and multiplication depth

**Files:** Modify `src/app/api/network/route.ts`

**Interfaces:**
- Produces: `POST { action: "set-apprentice-step", actorEmail, id, step }`, and `apprenticeStep` on every person in the GET response, plus `depth: { generations, people }` for the viewer.

- [ ] **Step 1: Add the action**

Rules:
1. `step` must be an integer 0 to 5. Reject otherwise with 400.
2. A leader may only set the step on a person **they themselves are sending out**, that is a row whose `sent_out_by` is the actor's node. Anyone else gets 403. Enforce this in the database filter, not with a read followed by a JavaScript decision: this codebase has been bitten three times by check-then-act.
3. `updated_at` set on the write.

- [ ] **Step 2: Return the step and the depth**

Add `apprenticeStep` to each person in the GET response.

Compute `depth` for the viewer from the rows already loaded: `generations` is how many levels descend below the viewer's node, and `people` is the total count of descendants at any depth. Walk the tree in memory, do not query per node.

⚠️ The graph can contain a cycle if data is ever corrupted. The walk must be bounded so a cycle cannot hang the request. `src/lib/networkLayout.ts` already solves this for the renderer, so use the same defensive shape: track visited nodes and stop.

- [ ] **Step 3: Extend `scripts/check-network-api.mjs`**

Distinctly named checks: setting a step on your own person succeeds and stores it; setting a step on someone you are not sending out returns 403; a step of 6 returns 400; a step of -1 returns 400; a non-integer step returns 400; the GET response carries `apprenticeStep` for every person; `depth` counts a two-generation chain correctly.

Build the fixtures from `@example.invalid` people and delete them all by exact email in a `finally`.

- [ ] **Step 4: Run it, lint, tsc, commit**

---

### Task 4: Week maths

**Files:** Create `src/lib/weeks.ts`, `src/lib/weeks.test.ts`

**Interfaces:**
- Produces: `mondayOf(date: Date): string` returning `YYYY-MM-DD`, and `recentMondays(count: number, from: Date): string[]` returning the most recent `count` Mondays newest first, including the current week.

- [ ] **Step 1: Write the failing tests first, run them, see them fail**

Cover: a Wednesday maps to that week's Monday; a Monday maps to itself; a Sunday maps to the Monday **six days earlier**, not the next day, because the week runs Monday to Sunday; a date crossing a month boundary; a date crossing a year boundary; `recentMondays(4)` returns four consecutive Mondays a week apart, newest first.

⚠️ These must use **local** date parts, not UTC. Melbourne is UTC+10 or +11, so a UTC-based implementation puts a Monday morning check-in into the previous week. Include a test that would fail under a UTC implementation.

- [ ] **Step 2: Implement, run tests, see them pass**

- [ ] **Step 3: Commit**

---

### Task 5: Phase 4, Growth

**Files:** Modify `src/app/leaders/training/page.tsx`, create `src/components/ui/CheckinHistory.tsx`

**Interfaces:**
- Consumes: `/api/leader-checkins` from Task 2, `mondayOf` and `recentMondays` from Task 4.

- [ ] **Step 1: The healthy leader block**

A card recommending Multiplier by Dave Ferguson, naming the four RPMS gauges: Relational, Physical, Mental, Spiritual. Then a crash course notes area, clearly a placeholder, laid out so notes on each gauge can drop in later. Do not invent content for the book.

- [ ] **Step 2: The weekly check-in**

Four score inputs, 1 to 10, one per gauge, plus one reflection box. Saves for the current week via `mondayOf(new Date())`. If a check-in already exists for this week, the form opens pre-filled and saving edits it.

Keep it to four taps and one sentence. If a score control needs a paragraph of explanation, it is the wrong control.

- [ ] **Step 3: The history strip**

`CheckinHistory.tsx`, presentational, takes the check-ins and renders recent weeks as small blocks. A week with a check-in is coloured by its average of the four scores. A week without one is neutral and visibly empty, never red or alarming. Clicking a week reveals what was written that week.

- [ ] **Step 4: The two coming soon cards**

Healthy group: state that it is a monthly check on how the pathway group is going, taken at or before the pathway huddle. Do not claim what it measures: the underlying metric is not yet defined.

Prayer requests: state the intent, that requests will be raisable and later shareable with other leaders.

Both must read as deliberately planned, not as broken. Use the same `.panel` treatment as everything else with a clear coming soon marker.

- [ ] **Step 5: Verify in the browser**

Seed a session, expand phase 4, and check: the form saves; a reload shows it pre-filled; editing the same week does not create a second entry, verified in the database; the history strip shows the week; a week with no check-in renders neutral; both coming soon cards render.

⚠️ You are writing to `info@avenuemission.com`. Delete every check-in row you created, by exact email and week, and paste the final table state into your report.

- [ ] **Step 6: Lint, tsc, commit**

---

### Task 6: Phase 5, Multiplication, and the ongoing presentation

**Files:** Modify `src/app/leaders/training/page.tsx`

⚠️ Task 5 must be complete and committed before this starts. Both edit the same file.

**Interfaces:**
- Consumes: `/api/network` GET with `apprenticeStep` and `depth`, and the `set-apprentice-step` action, both from Task 3.

- [ ] **Step 1: The Hero Maker crash course placeholder**

Laid out for the five practices, and specifically for what each looks like as a daily rhythm rather than as theory. Placeholder only. Do not invent content.

- [ ] **Step 2: Your people**

Everyone the viewer is sending out, from the network, each showing which apprenticeship step they are on:

1. I do, you watch
2. I do, you help
3. You do, I help
4. You do, I watch
5. You do, someone else watches

The leader can advance or lower a person's step. Show the step names, not bare numbers: the names are the teaching.

If the leader is sending nobody out yet, say so plainly and link to the network to add someone. That empty state is reachable and common, so it must not look broken.

- [ ] **Step 3: Multiplication depth**

One prominent figure: generations below this leader, and total people. Label it so it reads as kingdom advance rather than a score. If the depth is zero, frame it as a beginning, not a failure.

- [ ] **Step 4: The family tree link and the ICNU nudge**

A direct link into `/leaders/network`. Then a prompt card carrying the ICNU idea: name one person and what you see in them, linking to the network to add them. No logging, no storage.

- [ ] **Step 5: Make both phases read as ongoing**

Phases 4 and 5 must not show a completion percentage or a modules-complete count. Whatever the other phases use for that, these two show something rhythm-shaped instead, for example the current week's check-in state for phase 4 and the number of people being sent out for phase 5.

Both open together once Launch is done. Since nothing is currently locked anywhere, this is about presentation rather than gating: mark them as ongoing rather than as steps to complete.

- [ ] **Step 6: Verify in the browser**

Check: steps advance and survive a reload; the step control is refused for a person you are not sending out, verified through the API rather than assumed; depth matches the network; the no-people empty state renders; neither phase shows a percentage.

Seed a small network with `@example.invalid` people to exercise depth properly, then delete every one of them by exact email and paste the final table state.

- [ ] **Step 7: Full check and commit**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

---

## Done means

| Check | How |
|---|---|
| Tests pass | `npm test` |
| Types clean | `npx tsc --noEmit` |
| Lint no worse | `npm run lint`, at most 56, none in a touched file |
| Build succeeds | `npm run build` |
| Schema verified | `node --env-file=.env.local scripts/check-rhythms-schema.mjs` |
| Check-ins API verified | `node --env-file=.env.local scripts/check-checkins-api.mjs` |
| Network API verified | `node --env-file=.env.local scripts/check-network-api.mjs` |
| A check-in survives a reload | Fill it in, reload, it is still there |
| Real accounts clean | No `@example.invalid` rows anywhere, both leaders as found |
| Nothing pushed | `git status` shows commits ahead of origin |
