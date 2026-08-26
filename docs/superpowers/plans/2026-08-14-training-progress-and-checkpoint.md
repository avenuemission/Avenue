# Training Progress and Calling Checkpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make training progress persist per leader, remove phase debriefs, and gate Launch behind a Calling checkpoint that only an admin can release.

**Architecture:** One new table `leader_training_progress` keyed by email, holding id lists for watched episodes and completed modules plus a three-state checkpoint. One service-role route `/api/leader-training` owns all access. The training page loads progress on mount and saves debounced. The admin page gets a tab to release leaders.

**Tech Stack:** Next.js 16 app router, React 19, TypeScript, Tailwind v4, Supabase service-role client, Vitest (already installed), lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-14-training-progress-and-checkpoint-design.md`

## Global Constraints

- **Never run `git push`.** Commit locally only. Every push auto-deploys via Netlify and deploys are scarce.
- **Never use em dashes** (U+2014) anywhere: code, comments, UI copy, commit messages.
- **All database access goes through `getSupabaseAdmin()`** from `src/lib/supabaseAdmin.ts`, guarded by `adminConfigError()`. Every table has RLS on with only public SELECT policies, so anon-key writes silently affect zero rows.
- **Authorisation gate:** every non-admin request must confirm the caller's email exists in the `leaders` table BEFORE any other query. This exact ordering bug shipped in `/api/network` and had to be fixed: checking the feature table first let anyone with a row act as a leader. Read `src/app/api/network/route.ts` `ensureNode` for the corrected pattern.
- **Design system:** solid `.panel` surfaces, hairline `var(--border)`, single accent `var(--accent)` (#4f7cff), `.eyebrow` labels. No glassmorphism, no gradients, no glow.
- **Lint baseline is 56 problems (35 errors, 21 warnings).** Lint will NOT come back clean and that is expected. The gate is: no new problem in a file you touched, total not above 56.
- Commits are authored as Henry (the git default here). End every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- `git add` only the files named in your task. NEVER `git add -A`. `.mcp.json`, `HANDOVER.md` and `HANDOVER_PROMPT.md` must stay untracked.
- Dev server runs on port 3000. Check with `netstat -ano | grep :3000` before starting another.
- Run node scripts as `node --env-file=.env.local scripts/<name>.mjs` from the repo root. There is no `dotenv` package.
- Windows may print a trailing `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` after a node script. That is a Node teardown quirk, not a failure. Judge by the script output and exit code.
- **Live production database.** Only two real leaders exist: `info@avenuemission.com` and `henry.jamcmahon@gmail.com`. Test rows must use emails ending `@example.invalid` and be deleted by exact literal email. No unfiltered delete, no truncate, never touch the two real accounts.

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `supabase/migrations/004_leader_training_progress.sql` | The table |
| `scripts/check-training-table.mjs` | Confirms the table and columns exist |
| `src/app/api/leader-training/route.ts` | The only door to the table |
| `scripts/check-training-api.mjs` | End-to-end exercise of the route, self-cleaning |

**Modify**

| File | Change |
|---|---|
| `src/app/leaders/training/page.tsx` | Remove debriefs, load and save progress, checkpoint, Launch lock, intro copy |
| `src/app/leaders/admin/page.tsx` | New Training tab |

---

## Task Order and Gates

Task 1 needs no database. Task 2 is a hard gate on Henry running SQL. Tasks 4 to 6 need the route from Task 3.

⚠️ **Gate at Task 2:** stop and ask Henry to run the migration. Do not proceed past Task 2 until `scripts/check-training-table.mjs` passes.

---

### Task 1: Remove the phase debriefs

Independent of everything else, and it makes the page smaller before the bigger changes land.

**Files:** Modify `src/app/leaders/training/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a `Phase` interface with no `debrief*` fields. Task 5 adds the checkpoint into the space this frees.

- [ ] **Step 1: Delete the fields from the interface**

In the `Phase` interface (near line 41), remove these three lines:

```ts
  debriefRequired: boolean;
  debriefScheduled: boolean;
  debriefCompleted: boolean;
```

- [ ] **Step 2: Delete the fields from all five phase objects**

Each phase in `INITIAL_PHASES` carries the same three lines. Remove all fifteen. Do not remove `locked`, which Task 5 uses.

- [ ] **Step 3: Delete the two handlers**

Remove `scheduleDebrief` and `completeDebrief` entirely (around lines 301 to 320). Note that `completeDebrief` currently contains the only code that unlocks the next phase. That unlocking is replaced in Task 5, so it is correct for it to disappear here.

- [ ] **Step 4: Delete the debrief UI**

In the right-hand column, remove the whole `{phase.debriefRequired && ( ... )}` block. Then in the Phase Status block below it, remove the two conditional lines that reference `phase.debriefCompleted` and `phase.debriefRequired`. Leave the modules-complete count and its progress bar.

- [ ] **Step 5: Remove now-unused imports**

`MessageSquare` was only used by the debrief block. Check whether `CheckCircle2` is still used elsewhere in the file before removing it. Remove only what is genuinely unused, and confirm with lint.

- [ ] **Step 6: Verify in the browser**

Dev server on 3000. Seed a session in the page console then reload:

```
localStorage.setItem('avenue_auth_session', JSON.stringify({id:'1',email:'info@avenuemission.com',name:'Avenue Admin'}))
```

`resize_window` to desktop BEFORE measuring. The Browser pane freezes animation and sometimes reports viewport width 0.

| Check | Expected |
|---|---|
| Any phase | No "Phase Debrief" block anywhere |
| Page text | No "Schedule Zoom Call", no "Mark Debrief Complete", no "Complete your debrief" |
| Phase Status | Still shows Modules Complete and the bar |
| Console | No errors |

- [ ] **Step 7: Lint and commit**

```bash
npm run lint
git add src/app/leaders/training/page.tsx
git commit -m "Remove phase debriefs from the leadership journey

The debrief block asked people to schedule a Zoom call and mark it
complete, but none of that state ever persisted, so it reset on every
reload. A single Calling checkpoint replaces it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The table

**Files:** Create `supabase/migrations/004_leader_training_progress.sql`, `scripts/check-training-table.mjs`

**Interfaces:**
- Produces: table `public.leader_training_progress` with columns `email, watched_episodes, completed_modules, checkpoint_status, checkpoint_requested_at, checkpoint_completed_at, checkpoint_completed_by, updated_at`. Task 3 reads and writes exactly these names.

- [ ] **Step 1: Write the migration**

Use the SQL in section 3.1 of the spec verbatim. Read it from the spec file rather than retyping it.

- [ ] **Step 2: Write the check script**

Model it on `scripts/check-network-table.mjs`, which already exists. It must select every column by name, exit non-zero with a clear message when credentials are missing or the table is absent, and never print a key.

- [ ] **Step 3: Run it and watch it fail**

`node --env-file=.env.local scripts/check-training-table.mjs`
Expected: FAIL, the relation does not exist. Record the exact wording.

- [ ] **Step 4: Stop. Hard gate.**

Report BLOCKED and tell the controller the migration needs running. Do not attempt to create the table by any other route: there is no DDL path through the Supabase JS client and trying will waste time.

- [ ] **Step 5: After the gate clears, verify and commit**

Re-run the check, expect OK, then:

```bash
git add supabase/migrations/004_leader_training_progress.sql scripts/check-training-table.mjs
```

Commit with a message describing the table and the RLS posture.

---

### Task 3: The API route

**Files:** Create `src/app/api/leader-training/route.ts`, `scripts/check-training-api.mjs`

**Interfaces:**
- Consumes: `getSupabaseAdmin`, `adminConfigError`, `isAdminAuthorized` from `src/lib/supabaseAdmin.ts`.
- Produces: `GET /api/leader-training?email=` returning `{ progress: { watchedEpisodes, completedModules, checkpointStatus, checkpointCompletedAt } }`; `GET ?all=1` (admin) returning `{ rows: [...] }`; `PUT` accepting `{ email, watchedEpisodes, completedModules }`; `POST` accepting `{ action, email }` for `request-checkpoint`, `complete-checkpoint`, `reopen-checkpoint`. Tasks 4, 5 and 6 call these.

- [ ] **Step 1: Write the route**

Follow section 4 of the spec. Requirements that must not be missed:

1. **The leaders check runs first.** Write a helper that takes an email, confirms it exists in `leaders`, and only then touches `leader_training_progress`, creating an empty row if needed. Returning null means 403. Copy the ordering and the explanatory comment style from `ensureNode` in `src/app/api/network/route.ts`.
2. **PUT never writes `checkpoint_status`.** Build the update object with explicit keys. Never spread the request body.
3. **Validate the arrays.** Each must be an array, at most 500 entries, every entry a string matching `/^[a-z0-9]+$/`. Reject with 400 and a readable message otherwise.
4. **`complete-checkpoint` and `reopen-checkpoint` require `isAdminAuthorized(request)`**, checked before any read or write, returning 401 when absent.
5. **`request-checkpoint` only moves `none` to `requested`.** If the row is already `complete`, leave it and return success without changing anything.
6. `updated_at` is set on every write.
7. Every Supabase call destructures `error` and surfaces it. Do not drop errors: a swallowed RLS failure looks identical to success and has already cost this project hours.

- [ ] **Step 2: Write the end-to-end check script**

Model it on `scripts/check-network-api.mjs`. It must cover, each as a distinctly named check:

- GET for a real leader returns 200 and a progress object with all four fields and correct types
- GET for an email not in `leaders` returns 403
- PUT stores arrays and GET reads them back identically
- PUT with a 501-entry array returns 400
- PUT with an entry containing punctuation returns 400
- PUT attempting to set `checkpointStatus` leaves the stored status untouched
- `complete-checkpoint` without the admin header returns 401
- `reopen-checkpoint` without the admin header returns 401
- `request-checkpoint` moves `none` to `requested`
- a second `request-checkpoint` is a no-op
- `?all=1` without the admin header returns 401

Use `ADMIN_API_KEY` from the environment for any authorised admin call.

⚠️ Live database. The only row the script may create or delete is `training-check-temp@example.invalid`, which is NOT in `leaders`, so use it for the 403 case. For the cases needing a real leader, borrow `info@avenuemission.com`, capture its row first, and restore it in a `finally` block with an error-checked named assertion. Delete only by exact literal email.

- [ ] **Step 3: Run it**

`node --env-file=.env.local scripts/check-training-api.mjs`
Every check must print ok. If one fails, fix the route rather than weakening the check. Afterwards, list the table and confirm only real leaders' rows remain, in their original state.

- [ ] **Step 4: Lint and commit**

`git add src/app/api/leader-training/route.ts scripts/check-training-api.mjs`

---

### Task 4: Load and save progress

**Files:** Modify `src/app/leaders/training/page.tsx`

**Interfaces:**
- Consumes: `GET` and `PUT /api/leader-training` from Task 3.
- Produces: phases hydrated from the database, and a `saveProgress` path Task 5 relies on for the checkpoint refresh.

- [ ] **Step 1: Load on mount**

After the existing session check resolves, fetch `GET /api/leader-training?email=`. Reconcile into a copy of `INITIAL_PHASES`: set `episode.watched` for every id in `watchedEpisodes`, and `module.completed` for every id in `completedModules`. Ids not present in the content are ignored, and content not present in the arrays stays false.

Hold the fetched `checkpointStatus` in its own state. Task 5 uses it.

Do not render the journey until this resolves. Reuse the page's existing loading treatment. A flash of an empty journey looks exactly like lost progress.

On failure set a readable error and show it. Do not silently fall back to empty.

- [ ] **Step 2: Save debounced**

Add a save that collects the current watched episode ids and completed module ids from state and PUTs them.

Use a ref to hold a timeout id. Every tick clears the pending timeout and schedules a new one 800ms out. Clear the timeout on unmount so a save cannot fire after the component is gone.

Surface a quiet `Saving...` while a request is in flight and a plain error if it fails. Keep local state on failure: never revert a leader's tick because the network dropped.

- [ ] **Step 3: Verify persistence in the browser**

This is the whole point of the task, so verify by reloading, not by reasoning.

| Check | Expected |
|---|---|
| Tick a module, wait a second, reload | It is still ticked |
| Mark an episode watched, reload | Still watched, and the watched count matches |
| Tick five modules rapidly | Network shows one PUT, not five |
| Untick, reload | Stays unticked |
| Console | No errors |

⚠️ You are writing to a real leader's row. Before you finish, clear the arrays you set back to empty for `info@avenuemission.com` so the account is left as you found it, and paste the final row into your report.

- [ ] **Step 4: Lint and commit**

---

### Task 5: The Calling checkpoint and the Launch lock

**Files:** Modify `src/app/leaders/training/page.tsx`

**Interfaces:**
- Consumes: `checkpointStatus` from Task 4, `POST request-checkpoint` from Task 3.
- Produces: the finished leader-facing behaviour.

- [ ] **Step 1: Compute the states**

Calling is `phase2`. Derive whether every module in it is complete. Launch is `phase3` and is locked whenever `checkpointStatus !== "complete"`.

Drive the lock from the fetched status rather than mutating `phase.locked`, so a reload cannot produce a different answer from a fresh load.

- [ ] **Step 2: Render the checkpoint in phase 2**

In phase 2's right-hand column, where the debrief block used to be, render per the table in spec section 5.4. Use a `.panel` surface with a hairline border, the accent for the button, and `.eyebrow` for the label. Copy comes from the spec verbatim.

The button calls `POST { action: "request-checkpoint", email }` and then navigates to `/leaders/support`. Navigate even if the POST fails, and log the failure. A status write must never stand between a leader and booking a call.

- [ ] **Step 3: Lock Launch**

When phase 3 is locked, it must say why in one sentence: that Launch opens once the team has confirmed the Calling checkpoint call. A phase that simply refuses to open with no explanation is worse than no gate.

- [ ] **Step 4: Rewrite the intro copy**

Replace "Complete each phase and debrief with your coach to unlock the next." Four of five phases now have no gate, so the sentence should describe the single checkpoint between Calling and Launch. Keep it to one sentence and keep the existing tone.

- [ ] **Step 5: Verify every state in the browser**

Drive the real UI. Set the checkpoint status directly with the service-role client between checks rather than clicking through, and record what you saw for each.

| Status | Expected |
|---|---|
| Calling incomplete | No checkpoint block, Launch locked with its explanation |
| Calling complete, `none` | Schedule button visible |
| Click the button | Status becomes `requested`, browser lands on `/leaders/support` |
| `requested` | Waiting copy, no button, Launch still locked |
| `complete` | Launch open, checkpoint shows complete |

⚠️ Restore `info@avenuemission.com` to `checkpoint_status = 'none'` with empty arrays and null stamps when you finish. Paste the final row into your report.

- [ ] **Step 6: Lint and commit**

---

### Task 6: The admin Training tab

**Files:** Modify `src/app/leaders/admin/page.tsx`

**Interfaces:**
- Consumes: `GET ?all=1`, `POST complete-checkpoint`, `POST reopen-checkpoint` from Task 3.

- [ ] **Step 1: Add the tab**

Follow the existing tab pattern exactly: an entry in `TABS`, a conditional render, and a `TrainingTab({ adminKey })` component alongside the others. Match how `LeadersTab` fetches, handles loading and errors, and passes the admin key.

- [ ] **Step 2: The table**

Columns: name, email, modules complete, checkpoint status, released on. Sort `requested` first, then `none`, then `complete`, because the requested rows are the ones waiting on a person.

- [ ] **Step 3: The actions**

A **Release to Launch** button on rows that are `requested` or `none`. A **Reopen** button on rows that are `complete`. Both call the admin actions and refresh the table. Disable a button while its request is in flight so a double click cannot fire twice.

- [ ] **Step 4: Verify in the browser**

The admin page needs the admin key. Locally that is `local-admin-test-key`.

| Check | Expected |
|---|---|
| Tab appears | Training, alongside the existing tabs |
| Table | One row per leader with progress |
| Release | Status becomes complete, the row shows who and when |
| Training page as that leader | Launch now open |
| Reopen | Status back to none, Launch locked again |
| Without the admin key | The actions are refused |

⚠️ Restore both real leaders to `checkpoint_status = 'none'`, empty arrays, null stamps. Paste both final rows into your report.

- [ ] **Step 5: Full check and commit**

```bash
npm test
npm run lint
npm run build
```

Tests must pass, lint must not exceed 56, the build must succeed.

---

## Done means

| Check | How |
|---|---|
| Tests pass | `npm test` |
| Lint no worse | `npm run lint`, at most 56 problems, none in a touched file |
| Build succeeds | `npm run build` |
| Table verified | `node --env-file=.env.local scripts/check-training-table.mjs` |
| API verified | `node --env-file=.env.local scripts/check-training-api.mjs` |
| Progress really persists | Tick something, reload, it is still there |
| Real accounts clean | Both leaders back to `none` with empty arrays and no test rows anywhere |
| Nothing pushed | `git status` shows commits ahead of origin and no push was run |
