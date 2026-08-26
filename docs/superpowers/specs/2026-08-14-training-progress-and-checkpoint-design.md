# Training progress, debrief removal and the Calling checkpoint

**Date:** 2026-08-14
**Status:** Approved design, not yet implemented
**Repo:** `C:\Users\User\CascadeProjects\Avenue`

---

## 1. Why

Three things, in order of how much they matter.

1. **Nothing on the training page persists.** `src/app/leaders/training/page.tsx` holds
   every phase in `useState(INITIAL_PHASES)` and never reads or writes a store. Watched
   episodes, completed modules and debrief state all reset on reload. No leader has ever
   kept progress, and the progress bar has always been decorative.
2. **Phase debriefs go.** Phases 1, 2 and 3 carry a "Phase Debrief" block with Schedule
   Zoom Call and Mark Debrief Complete buttons. These are removed from every phase.
3. **Calling gets one real checkpoint.** At the end of phase 2 a leader books a call with
   the team, and phase 3 (Launch) stays locked until a coach confirms that call happened.

The gate only means anything once progress persists, which is why all three land together.

---

## 2. Decisions locked

| Question | Decision |
|---|---|
| Debriefs | Removed from every phase: UI, handlers, and the three `debrief*` fields |
| Checkpoint location | End of phase 2, Calling |
| When the button appears | Only once every Calling module is complete |
| What the button does | Marks the checkpoint `requested`, then sends them to `/leaders/support`, which is already the booking flow |
| Effect on Launch | Phase 3 is locked until the checkpoint is `complete` |
| Who releases | An admin only, from the admin area, using the admin token |
| Persistence | Per leader, in the database |
| Scope of persistence | All training progress: watched episodes and completed modules, not just the checkpoint |

---

## 3. Data model

### 3.1 New table

```sql
-- supabase/migrations/004_leader_training_progress.sql

create table if not exists public.leader_training_progress (
  email                   text primary key,

  -- Episode and module ids from INITIAL_PHASES, e.g. "p1m0e3", "p2m1".
  -- Stored as id lists rather than a rigid shape so adding a module to the
  -- training content never needs a migration.
  watched_episodes        text[] not null default '{}',
  completed_modules       text[] not null default '{}',

  checkpoint_status       text not null default 'none'
                          check (checkpoint_status in ('none', 'requested', 'complete')),
  checkpoint_requested_at timestamptz,
  checkpoint_completed_at timestamptz,
  checkpoint_completed_by text,

  updated_at              timestamptz not null default now()
);

alter table public.leader_training_progress enable row level security;

-- Deliberately no policies. Every read and write goes through the
-- service-role route at /api/leader-training, matching leaders,
-- leader_profiles and network_people.
```

### 3.2 Why id lists rather than a row per module

Training content lives in code, not in the database. A row-per-module table would need a
migration or a sync job every time a module is added. Two `text[]` columns hold the same
information, are trivially diffable, and let the page reconcile against whatever content
currently exists: an id in the array that no longer exists in the content is ignored.

### 3.3 Invariants

| Invariant | Enforcement |
|---|---|
| One row per leader | `email` is the primary key |
| Email casing | The API trims and lowercases before every read and write |
| Status values | DB check constraint, plus the API only ever writes the three literals |
| Only an admin completes a checkpoint | The complete action requires the admin Bearer token, checked before any write |
| updated_at freshness | Set by the API on every write. No trigger, matching the other tables |

---

## 4. API

New route: `src/app/api/leader-training/route.ts`, using `getSupabaseAdmin()` and guarded
by `adminConfigError()`.

**The authorisation gate is the same lesson learned on `/api/network`: every non-admin
request must prove the caller exists in `leaders` BEFORE anything else happens.** A person
who merely appears somewhere else in the system is not a leader and gets a 403.

### 4.1 GET /api/leader-training?email=

Returns that leader's progress, creating an empty row lazily if they have none.

```jsonc
{
  "progress": {
    "watchedEpisodes": ["p1m0e1"],
    "completedModules": ["p1m0"],
    "checkpointStatus": "none",
    "checkpointCompletedAt": null
  }
}
```

403 if the email is not in `leaders`.

### 4.2 PUT /api/leader-training

Body `{ email, watchedEpisodes, completedModules }`. Upserts those two arrays only. It
can never write `checkpoint_status`: that is not a field a leader may set about
themselves.

Arrays are capped at 500 ids each and every entry must match a strict id pattern, so a
caller cannot push arbitrary payloads into the row.

### 4.3 POST /api/leader-training

| Action | Auth | Behaviour |
|---|---|---|
| `request-checkpoint` | Leader, own email | Sets `checkpoint_status = 'requested'` and stamps the request time, only when the status is currently `none`. Never downgrades a `complete` back to `requested` |
| `complete-checkpoint` | **Admin Bearer token** | Sets `checkpoint_status = 'complete'`, stamps the completion time and records who released them |
| `reopen-checkpoint` | **Admin Bearer token** | Returns the status to `none` and clears the stamps, for a release made by mistake |

### 4.4 GET /api/leader-training?all=1

Admin Bearer token only. Returns every progress row joined to the leader name, for the
admin table. Refused with 401 without the token.

---

## 5. The training page

`src/app/leaders/training/page.tsx`.

### 5.1 Loading

On mount, after the existing session check, fetch progress and reconcile it into
`INITIAL_PHASES`: mark episodes watched and modules complete by id. Until it resolves,
the page shows its existing loading state rather than flashing an empty journey.

If the fetch fails, show a readable message and leave the page usable in a read-only
sense. Silently starting from zero would look identical to losing all your progress.

### 5.2 Saving

Every tick of a module or episode updates local state immediately, then schedules a
debounced PUT 800ms later. Rapid ticking sends one request, not one per click.

An in-flight save is reflected in the UI as a quiet "Saving..." so a leader can tell
their work is being kept. A failed save says so plainly and keeps the local state.

### 5.3 Debriefs

Delete the `debriefRequired`, `debriefScheduled` and `debriefCompleted` fields from the
`Phase` interface and from all five phase objects, the `scheduleDebrief` and
`completeDebrief` handlers, and the whole debrief block in the right-hand column,
including the two status lines that reference it.

### 5.4 The Calling checkpoint

Rendered in phase 2's right-hand column, where the debrief block used to sit.

| Checkpoint state | What phase 2 shows |
|---|---|
| Calling modules incomplete | Nothing. The checkpoint does not exist yet |
| All modules complete, status `none` | "You have finished Calling." plus a **Schedule your checkpoint call** button |
| Status `requested` | "Checkpoint call requested. Launch opens once the team confirms your call." |
| Status `complete` | "Checkpoint complete. Launch is open." |

The button calls `request-checkpoint`, then navigates to `/leaders/support`. If the POST
fails it still navigates, because stopping someone from booking a call because a status
write failed would be the wrong trade. The failure is logged.

### 5.5 Locking Launch

Phase 3 is locked whenever the checkpoint status is not `complete`. Phases 1, 2, 4 and 5
stay unlocked, matching today's behaviour. A locked phase 3 explains why in a sentence
rather than just refusing to open.

### 5.6 Copy

The intro currently reads "Complete each phase and debrief with your coach to unlock the
next." It becomes a sentence about the single checkpoint instead, since four of the five
phases now have no gate at all.

---

## 6. Admin

A `training` tab in `src/app/leaders/admin/page.tsx`, alongside the existing tabs.

A table of every leader with a progress row: name, email, modules complete, checkpoint
status, and the date they were released. Leaders whose status is `requested` sort to the
top, because they are the ones waiting.

Each row carries a **Release to Launch** button when the status is `requested` or `none`,
and a **Reopen** button when it is `complete`. Both call the admin actions with the token
the admin page already holds.

---

## 7. Out of scope

- Fixing the plaintext-localStorage login. Flagged again below.
- Persisting anything outside the training page.
- Gating phases 4 and 5.
- Migrating historical debrief state. There is none: it never persisted.
- Any change to `/leaders/support` itself. The button links to it as it stands.

---

## 8. Risks

| Risk | Note |
|---|---|
| Login is not real auth | Anyone who knows a leader email can read and write that leader's training progress through the API. The checkpoint release is protected by the admin token, so the gate itself holds, but the progress either side of it does not |
| Write amplification | Saving on every tick is debounced, but a leader who ticks twenty modules quickly still writes. The cap on array length bounds the payload |
| Content drift | Ids stored in the arrays are reconciled against the content in code. Renaming a module id silently loses that module's completion for everyone. Module ids should be treated as permanent |
| Repeated self-requests | `request-checkpoint` is idempotent while the status is `none`, so repeat clicks change nothing |

---

## 9. Files

**New**

```
supabase/migrations/004_leader_training_progress.sql
src/app/api/leader-training/route.ts
scripts/check-training-table.mjs
scripts/check-training-api.mjs
```

**Changed**

```
src/app/leaders/training/page.tsx
src/app/leaders/admin/page.tsx
```

The migration must be run in the Supabase SQL editor for project
`omepkrdyuymnqopaznid` before anything downstream can be verified.

---

## 10. Deployment

Nothing is pushed until Henry says push. `main` is currently level with origin, so this
work starts from a clean base.
