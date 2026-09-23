# Foundations: real login, file split, My People, test-row guard

**Date:** 2026-09-23
**Status:** Approved in chat, awaiting review of this written spec
**Spec 1 of 5.** The later specs (Multiply, Growth, Calling, Launch) each get their own short spec just before they are built.

---

## Why this comes first

Calling Profiles will hold private journals about surrender, fear and shadow mission. Today the site cannot keep anything private:

- `src/lib/auth.ts` checks passwords only against the browser's own `localStorage`. They never reach the server.
- Every leader API trusts whatever email the caller sends. Anyone who knows a leader's email can read and write their profile, training progress, check-ins and network.
- `POST /api/leader-access` lets anyone create a `leaders` row, and that row alone passes the training, check-ins and network checks.
- Several routes have no check at all (listed in section 1.5).

The fix: prove who someone is with an emailed code, and have the server take the email from that proof, never from the request.

## Decisions made in chat

| Question | Decision |
|---|---|
| Login method | Emailed 6-digit code via Supabase Auth. No passwords |
| Does a leader need `full_access` for training, check-ins, network, My People? | **No.** Any registered leader, as today. Login now proves they own the email, so registering only ever opens their own data |
| Extra routes to lock | `leader-access/seed`, workshop `results` and `sessions`, workshop AI routes, plus the two the handover named |
| Where the shared person record lives | A new private per-leader table, `leader_people`. Not `network_people` |
| Who reads ICNU notes | Only the leader who wrote them |
| Build order after this | Multiply, Growth, Calling, Launch |

---

## 1. Real login

### 1.1 The flow

1. `/login` asks for an email.
2. The browser calls `POST /api/auth/request-code` with the email.
3. The server looks the email up in `leaders`. If there is no row, it replies with the same neutral message as success ("If that email is registered, a code is on its way") so the endpoint does not reveal who is a leader. If there is a row, it calls Supabase `signInWithOtp` with `shouldCreateUser: true`.
4. The leader types the 6-digit code. The browser calls Supabase `verifyOtp({ email, token, type: "email" })` with the anon client. supabase-js stores the session and refreshes it automatically.
5. The browser keeps a small `{ email, name }` cache in the existing `avenue_auth_session` key so current pages keep rendering, but **nothing on the server trusts it**.

"Request access" (the current signup) becomes: name and email, which calls the existing public `POST /api/leader-access` to create a pending `leaders` row and notify admin, then drops straight into the code step. No password field.

Logout calls `supabase.auth.signOut()` and clears the cache.

### 1.2 The server helper

New file `src/lib/requireLeader.ts`:

```ts
// Returns the caller's verified identity, or a ready-made error response.
export async function requireLeader(req: NextRequest):
  Promise<{ email: string; name: string; fullAccess: boolean } | { response: NextResponse }>
```

Order inside, fixed and unconditional:

1. Read `Authorization: Bearer <token>`. Missing: 401.
2. `getSupabaseAdmin().auth.getUser(token)`. Error or no user: 401.
3. Lowercase the verified email. Query `leaders` for it, destructuring `error`. Error: 500. No row: 403.
4. Return the identity.

This runs **first** in every leader route, before any query against a feature table. Routes then filter every query by the returned email. Any `email` or `actorEmail` in the body or query string is ignored, and removed from the client calls.

### 1.3 Admin routes

Admin keeps its current `ADMIN_API_KEY` bearer check. Routes that accept either an admin or a leader (for example `leader-training?all=1`, `network` reparent) check the exact admin key first, then fall back to `requireLeader`. A leader JWT can never equal the admin key, so the two cannot be confused. Moving admin onto real login is out of scope.

### 1.4 The client helper

New `leaderFetch(input, init)` in `src/lib/leaderFetch.ts`: gets the current session from supabase-js, adds the bearer token, and on a 401 sends the leader to `/login`. Every leader page swaps `fetch` for `leaderFetch` and drops the email from URLs and bodies.

### 1.5 Route by route

| Route | Today | After |
|---|---|---|
| `leader-access` GET | Email in query, anyone can ask about anyone | `requireLeader`, returns the caller's own row only |
| `leader-access` POST | Public sign-up | Stays public: it only creates a pending row, and using that row needs the code |
| `leader-access/seed` | No auth, seeds full-access accounts in the blob store | Admin key required |
| `leader-access/admin`, `content/*` writes, `submissions` admin methods | Admin key | Unchanged |
| `leader-profile` GET, PUT | **No check at all** | `requireLeader`, own row only |
| `leader-training` | Email in query or body | `requireLeader`; admin paths unchanged. **The revision and three-way merge save logic is not touched** |
| `leader-checkins` | Email in query or body | `requireLeader` |
| `network` | Email or `actorEmail` | `requireLeader`; admin reparent unchanged |
| `leader-resources`, `leader-resources/[filename]` | Email in query, then an internal fetch to `leader-access` | `requireLeader` plus `fullAccess` must be true, as today |
| `workshops/results`, `sessions`, `clear` | No auth | `requireLeader` (only leader pages call them) |
| `workshops/ai-speak`, `ai-recommendation` | No auth, spends OpenAI credit | `requireLeader` |
| `workshops/submit`, `validate-code` | Public, used by participants | Unchanged |
| `submissions` POST, `send-email`, `apest-results`, public content GETs | Public forms and content | Unchanged, public on purpose |

Resource downloads are plain links today. They move to a `leaderFetch` then blob download, since a link cannot carry the bearer header.

### 1.6 What Henry does in Supabase (about 5 minutes)

1. Authentication, Providers: Email on.
2. Authentication, Email Templates, "Magic Link": include `{{ .Token }}` so the email shows the code.
3. Authentication, URL Configuration: Site URL `https://www.avenuemission.com`, plus `http://localhost:3000` for dev.

⚠️ Supabase's built-in mailer sends only a few emails an hour. Fine for two leaders. Custom SMTP is needed before onboarding many more. Not in scope.

### 1.7 Removed

- `src/lib/auth.ts`: the stored users list, the hardcoded `avenue` password, `login`, and password `signup`.
- The handover's console trick for seeding a session. The new dev path is a real code login with a real leader email.

---

## 2. Split `training/page.tsx`

The page is 1,864 lines and carries five phases, a save engine, a check-in form and a network view. Split it before any wizard is added.

Target layout under `src/app/leaders/training/`:

| File | Holds |
|---|---|
| `page.tsx` | Shell: auth, layout, orbital summary, phase switcher |
| `phases.ts` | `INITIAL_PHASES` and the phase and module types |
| `useTrainingProgress.ts` | The load and save engine, moved verbatim |
| `progressMerge.ts` | `reconcilePhases`, `extractProgressIds`, `mergeAgainstBase` |
| `Phase4Growth.tsx` | Check-in form and history |
| `Phase5Multiply.tsx` | The network view |
| `PhaseModules.tsx` | The module grid used by phases 1 to 3 |

Rules:

- **Pure move.** No behaviour change, no renames that change logic, no "while I'm here" fixes.
- The save engine moves as one piece with its refs intact. Its comments move with it.
- It happens **before** the login change touches the page, so the diff of each step stays readable.
- Checks: `npx tsc --noEmit` clean, `npm test` green, lint within the 55 to 56 baseline, and a manual pass in the browser: tick a module, watch an episode, save a check-in, reload, all still there.

---

## 3. My People

### 3.1 Table

Migration `supabase/migrations/007_leader_people.sql`:

```sql
create table if not exists public.leader_people (
  id                 uuid primary key default gen_random_uuid(),
  owner_email        text not null,          -- the leader, lowercase
  first_name         text not null,
  last_name          text,
  spaces             text[] not null default '{}',   -- subset of first, second, third
  metrics            text[] not null default '{}',   -- subset of pathways, intersections, streetlights
  invitee            boolean not null default false, -- Launch: someone they plan to invite
  icnu               text,                            -- private "what I see in you"
  network_person_id  uuid references public.network_people(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint leader_people_spaces_valid
    check (spaces <@ array['first','second','third']::text[]),
  constraint leader_people_metrics_valid
    check (metrics <@ array['pathways','intersections','streetlights']::text[])
);
create index if not exists leader_people_owner_idx on public.leader_people (owner_email);
alter table public.leader_people enable row level security;
-- Deliberately no policies. All access through /api/people with the service role.
```

Notes:

- The three metrics are independent tags, not a ladder. A person can hold any combination.
- `network_person_id` links someone to the church-wide tree when they become a disciple. Multiply uses it later. Nothing writes to `network_people` from here, so Jeremy Choo's row is never touched.
- Anything the later features need beyond this (for example the date someone reached a metric) is added by that feature's own migration.

### 3.2 API: `/api/people`

| Method | Does | Guard |
|---|---|---|
| GET | The caller's people | `requireLeader`, `eq("owner_email", email)` |
| POST | Create one | `requireLeader`, `owner_email` set from the token, never the body |
| PATCH | Update one by id | Filter `eq("id").eq("owner_email")`; zero rows is 404 |
| DELETE | Delete one by id | Same filter; zero rows is 404 |

Validation: names 1 to 80 characters, `icnu` up to 2,000, spaces and metrics only from the allowed sets, at most 500 people per leader. Every Supabase call destructures `error` and returns it as a 500. No check-then-act.

### 3.3 Shared picker

`src/components/people/PersonPicker.tsx`: type-ahead over the leader's people with "Add new" inline. Takes a tag to apply (a space, a metric, or invitee). No feature screen uses it in this spec; Multiply is its first consumer.

---

## 4. Test-row guard

`scripts/guard-test-rows.mjs`, run with `npm run guard`.

- Reads `.env.local` for the service key. Read only.
- For each email column (`leaders.email`, `leader_profiles.email`, `network_people.email`, `network_people.added_by_email`, `leader_training_progress.email`, `leader_checkins.email`, `leader_people.owner_email`) it looks for values ending in `@example.invalid`.
- Prints every hit and exits 1. Prints "clean" and exits 0 otherwise.
- Run before and after every task that uses fixtures, and before any push.

Fixture rule, unchanged: only `@example.invalid` emails, deleted by exact literal email in a `finally`.

---

## 5. Order, testing, deploy

| Step | Work | Gate |
|---|---|---|
| 1 | Guard script | Runs clean against production |
| 2 | Split the training page | Pure move checks in section 2 |
| 3 | `requireLeader`, `leaderFetch`, `/api/auth/request-code`, new login page | Unit tests for `requireLeader` (missing token, bad token, no leaders row, success) |
| 4 | Move each route in 1.5 onto the helper, and each client page onto `leaderFetch` | Per route: a call with no token gets 401, a call with another leader's email in the body still only touches the caller's data |
| 5 | Remove the old auth code | `grep` finds no `avenue_users`, no password compare |
| 6 | `leader_people` migration and `/api/people` | Henry runs 007 in the SQL editor; API tests with `@example.invalid` fixtures |
| 7 | Mobile pass on `/login` at 375px | Screenshot |
| 8 | Whole-branch review by a separate reviewer | Clean |

Each task is reviewed by a separate subagent with the diff as a file, as in the handover.

**Deploy:** all of this ships as one push, only when Henry says push. Everyone is signed out once and signs back in with a code. Henry's Supabase steps in 1.6 must be done before that push. Rollback is reverting the merge commit; the `leader_people` table can stay, as nothing else depends on it.

## Out of scope

- Moving admin onto real login.
- Custom SMTP for the auth emails.
- Privacy policy (its own small task before Calling ships; Henry words it).
- Any feature screen for My People. That starts with the Multiply spec.
