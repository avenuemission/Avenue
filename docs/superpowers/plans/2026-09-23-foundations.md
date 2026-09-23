# Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake browser-only login with a real emailed-code login that every leader API trusts, split the oversized training page, add a private per-leader "My People" table and API, and add a guard that catches test rows left in production.

**Architecture:** Supabase Auth issues a session after the leader types an emailed 6-digit code. Every leader API route calls one helper, `requireLeader(request)`, which verifies the bearer token with the service-role client, takes the email from the verified token, and runs the `leaders` check first. Client pages call APIs through `leaderFetch`, which attaches the token. Request bodies and query strings no longer carry the caller's email.

**Tech Stack:** Next.js 16 (App Router, route handlers), React, TypeScript, `@supabase/supabase-js` 2.x, Vitest 4 (node environment, `src/**/*.test.ts`), Netlify.

**Spec:** `docs/superpowers/specs/2026-09-23-foundations-design.md`. Read it before starting any task.

## Global Constraints

- **Never `git push`.** Commit locally only. Henry says "push" when he wants a deploy.
- **Never write an em dash** anywhere: code, comments, UI copy, commit messages. Use a colon, a comma, or a new sentence. En dashes in number ranges are fine.
- **All database access goes through `getSupabaseAdmin()`** from `src/lib/supabaseAdmin.ts`. RLS is on with no write policies.
- **The `leaders` check runs first and unconditionally** in every leader route, before any query against a feature table.
- **No check-then-act.** Express authorisation as a database filter (`.eq("id", id).eq("owner_email", email)`) and treat zero rows as the refusal.
- **Every Supabase call destructures `error` and surfaces it.** Never swallow it.
- **There is no staging database.** Fixtures use only `@example.invalid` emails and are deleted by exact literal email in a `finally`. No unfiltered delete, no `neq`, no `like`, no truncate. Never touch the `network_people` row for Jeremy Choo (null email) or the two real leaders' rows beyond what the existing check scripts already capture and restore.
- **Do not change the training save logic** (revision guard, three-way merge, `performSave`, `runSave`, `scheduleSave`, `mergeAgainstBase`). Moving it between files is allowed; changing what it does is not. Swapping `fetch` for `leaderFetch` and removing the email from its URL and body are the only permitted edits, in Task 6.
- **Design system:** solid `.panel` surfaces, hairline borders, single accent `var(--accent)` (`#4f7cff`), `.eyebrow` labels, Geist. No glassmorphism, no gradients, no glow.
- **Checks after every task:** `npx tsc --noEmit` clean, `npm test` green, `npm run lint` at or below the 55 to 56 problem baseline (a lower number is not an improvement, do not chase it).
- **Commits** are authored as the git default (`Henry <henry.jamcmahon@gmail.com>`) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Dev server:** `npm run dev` on port 3000. Kill a stale one with `netstat -ano | grep :3000` then `taskkill //F //PID <pid>`.
- **Scripts** run with `node --env-file=.env.local scripts/<name>.mjs`.
- Use the Write tool for any file over a few lines. Heredocs through the Bash tool mangle backslashes.

## File map

| File | Status | Responsibility |
|---|---|---|
| `scripts/guard-test-rows.mjs` | Create | Fails if any `@example.invalid` row or auth user exists |
| `scripts/lib/fixtures.mjs` | Create | Shared: service client, fixture leader create/cleanup, `tokenFor(email)` |
| `scripts/check-auth.mjs` | Create | End-to-end auth checks against the dev server |
| `src/app/leaders/training/phases.ts` | Create | `INITIAL_PHASES`, phase and module types |
| `src/app/leaders/training/progressMerge.ts` | Create | `reconcilePhases`, `extractProgressIds`, `mergeAgainstBase` |
| `src/app/leaders/training/useTrainingProgress.ts` | Create | Progress load and save engine as a hook |
| `src/app/leaders/training/useCheckins.ts` | Create | Weekly check-in load and save state |
| `src/app/leaders/training/useNetworkView.ts` | Create | Network people, depth, apprentice step updates |
| `src/app/leaders/training/Phase4Growth.tsx` | Create | Growth phase content |
| `src/app/leaders/training/Phase5Multiply.tsx` | Create | Multiply phase content |
| `src/app/leaders/training/PhaseModules.tsx` | Create | Module grid for phases 1 to 3 |
| `src/app/leaders/training/page.tsx` | Modify | Shell only |
| `src/lib/leaderAuth.ts` | Create | Pure `bearerToken`, `resolveLeader` (no Next or Supabase imports) |
| `src/lib/leaderAuth.test.ts` | Create | Unit tests for the above |
| `src/lib/requireLeader.ts` | Create | Route helper wiring `resolveLeader` to Supabase |
| `src/lib/leaderFetch.ts` | Create | Client fetch that attaches the bearer token |
| `src/lib/auth.ts` | Rewrite | `requestCode`, `verifyCode`, `requestAccess`, `logout`, `getCurrentUser` |
| `src/app/api/auth/request-code/route.ts` | Create | Sends a code only to emails in `leaders` |
| `src/app/login/page.tsx` | Rewrite | Email step, then code step; "Request access" variant |
| Leader API routes (Task 6, 7) | Modify | Use `requireLeader` |
| Leader client pages (Task 6, 7) | Modify | Use `leaderFetch`, drop email from URLs and bodies |
| `supabase/migrations/007_leader_people.sql` | Create | `leader_people` table |
| `src/lib/people.ts` | Create | Pure validation for person payloads |
| `src/lib/people.test.ts` | Create | Unit tests for the above |
| `src/app/api/people/route.ts` | Create | GET, POST, PATCH, DELETE own people |
| `src/components/people/PersonPicker.tsx` | Create | Type-ahead picker with inline add |

---

### Task 1: Test-row guard and shared fixture helpers

**Files:**
- Create: `scripts/lib/fixtures.mjs`
- Create: `scripts/guard-test-rows.mjs`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Produces: `scripts/lib/fixtures.mjs` exports `db` (service-role client), `FIXTURE_DOMAIN = "@example.invalid"`, `assertFixtureEmail(email)`, `createFixtureLeader({ email, name, fullAccess })`, `tokenFor(email)` returning `Promise<string>` (an access token), `cleanupFixtures(emails)`.
- Produces: `npm run guard`.

- [ ] **Step 1: Write `scripts/lib/fixtures.mjs`**

```js
// Shared helpers for scripts that exercise the API against production.
// There is no staging database, so every fixture email MUST end in
// @example.invalid and every delete matches one exact literal email.
import { createClient } from "@supabase/supabase-js";

export const FIXTURE_DOMAIN = "@example.invalid";

export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function assertFixtureEmail(email) {
  if (typeof email !== "string" || !email.endsWith(FIXTURE_DOMAIN) || email !== email.toLowerCase()) {
    throw new Error(`Refusing to touch non-fixture email: ${email}`);
  }
}

export async function createFixtureLeader({ email, name, fullAccess }) {
  assertFixtureEmail(email);
  const { error } = await db
    .from("leaders")
    .insert({ id: `fixture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, email, name, full_access: fullAccess });
  if (error) throw new Error(`createFixtureLeader ${email}: ${error.message}`);
}

async function findAuthUserId(email) {
  // listUsers pages at 50 by default; production has only a handful of users.
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  throw new Error("listUsers: too many pages");
}

// Returns a real access token for an email without sending any email:
// the admin API mints a magic link, and its hashed token is verified
// directly with the anon client, exactly as the browser would.
export async function tokenFor(email) {
  const { error: createErr } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (createErr && !/already|registered|exists/i.test(createErr.message)) {
    throw new Error(`createUser ${email}: ${createErr.message}`);
  }
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink ${email}: ${error.message}`);
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyErr) throw new Error(`verifyOtp ${email}: ${verifyErr.message}`);
  return verified.session.access_token;
}

const EMAIL_TABLES = [
  ["leader_profiles", "email"],
  ["leader_checkins", "email"],
  ["leader_training_progress", "email"],
  ["network_people", "email"],
  ["leaders", "email"],
];

// Deletes every trace of each fixture email, one exact email at a time.
// leader_people is added in Task 8; its delete is skipped until the table exists.
export async function cleanupFixtures(emails) {
  const problems = [];
  for (const email of emails) {
    assertFixtureEmail(email);
    const { error: peopleErr } = await db.from("leader_people").delete().eq("owner_email", email);
    if (peopleErr && !/does not exist|schema cache/i.test(peopleErr.message)) problems.push(`leader_people ${email}: ${peopleErr.message}`);
    for (const [table, column] of EMAIL_TABLES) {
      const { error } = await db.from(table).delete().eq(column, email);
      if (error) problems.push(`${table} ${email}: ${error.message}`);
    }
    const id = await findAuthUserId(email);
    if (id) {
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) problems.push(`auth user ${email}: ${error.message}`);
    }
  }
  if (problems.length) throw new Error(`Cleanup incomplete:\n${problems.join("\n")}`);
}

export async function listAuthUserEmails() {
  const emails = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    emails.push(...data.users.map((u) => (u.email ?? "").toLowerCase()));
    if (data.users.length < 200) return emails;
  }
  throw new Error("listUsers: too many pages");
}
```

- [ ] **Step 2: Write `scripts/guard-test-rows.mjs`**

```js
// Fails loudly if any @example.invalid fixture is left in production.
// Read only. Run: npm run guard
import { db, FIXTURE_DOMAIN, listAuthUserEmails } from "./lib/fixtures.mjs";

const COLUMNS = [
  ["leaders", "email"],
  ["leader_profiles", "email"],
  ["network_people", "email"],
  ["network_people", "added_by_email"],
  ["leader_training_progress", "email"],
  ["leader_checkins", "email"],
  ["leader_people", "owner_email"],
];

const hits = [];
for (const [table, column] of COLUMNS) {
  const { data, error } = await db.from(table).select(column).ilike(column, `%${FIXTURE_DOMAIN}`);
  if (error) {
    if (table === "leader_people" && /does not exist|schema cache/i.test(error.message)) continue;
    console.error(`ERROR reading ${table}.${column}: ${error.message}`);
    process.exit(2);
  }
  for (const row of data ?? []) hits.push(`${table}.${column} = ${row[column]}`);
}
for (const email of await listAuthUserEmails()) {
  if (email.endsWith(FIXTURE_DOMAIN)) hits.push(`auth.users.email = ${email}`);
}

if (hits.length) {
  console.error(`FIXTURE ROWS IN PRODUCTION (${hits.length}):`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log("clean");
```

The `ilike` here is a read filter only. It is never used for a delete.

- [ ] **Step 3: Add the npm script**

In `package.json` `"scripts"`, add: `"guard": "node --env-file=.env.local scripts/guard-test-rows.mjs"`.

- [ ] **Step 4: Run it**

Run: `npm run guard`
Expected: `clean`, exit 0. If it lists rows, stop and report them to the coordinator. Do not delete anything.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/fixtures.mjs scripts/guard-test-rows.mjs package.json
git commit -m "Add test-row guard and shared fixture helpers for production checks"
```

---

### Task 2: Split the training page (pure move)

**Files:**
- Create: `src/app/leaders/training/phases.ts`, `progressMerge.ts`, `useTrainingProgress.ts`, `useCheckins.ts`, `useNetworkView.ts`, `PhaseModules.tsx`, `Phase4Growth.tsx`, `Phase5Multiply.tsx`
- Modify: `src/app/leaders/training/page.tsx`

**Interfaces:**
- Produces:
  - `phases.ts`: exports `Module`, `Episode`, `Phase`, `CheckpointStatus` types and `INITIAL_PHASES`.
  - `progressMerge.ts`: exports `reconcilePhases(watched: string[], completed: string[]): Phase[]`, `extractProgressIds(phases: Phase[])`, `mergeAgainstBase(serverIds, baseIds, localIds): string[]` with their current signatures unchanged.
  - `useTrainingProgress(user: User | null)`: returns an object holding every value and handler from the progress block that the JSX reads. At minimum `phases`, `progressLoaded`, `loadError`, `checkpointStatus`, `saving`, `saveError`, `conflictNotice`, `toggleModuleComplete`, `toggleEpisodeWatched`.
  - `useCheckins(user: User | null)`: every check-in value and handler the JSX reads, including `saveCheckin`.
  - `useNetworkView(user: User | null)`: `networkPeople`, `networkViewerId`, `networkDepth`, `networkLoaded`, `networkError`, `stepUpdatingId`, `stepError`, `setApprenticeStep`.

This deviates from the spec table in one way: check-ins and network state become hooks used by the page rather than living inside `Phase4Growth` and `Phase5Multiply`, because the orbital summary in the page also reads network depth. The phase components receive what they need as props.

- [ ] **Step 1: Record the baseline**

Run: `npx tsc --noEmit; npm test; npm run lint 2>&1 | tail -3`
Write the lint problem count in your report.

- [ ] **Step 2: Move data and pure helpers**

Move lines 26 to 197 (types and `INITIAL_PHASES`, plus `CheckpointStatus`) into `phases.ts`. Move `reconcilePhases`, `extractProgressIds`, `mergeAgainstBase` and their comments into `progressMerge.ts`. Constants used only by Growth (`RPMS_GAUGES`, `CHECKIN_HISTORY_WEEKS`, `ScoreRow`) move to `Phase4Growth.tsx`; constants used only by Multiply (`APPRENTICE_STEPS`, `apprenticeStepLabel`, `HERO_MAKER_PRACTICES`, the `NetworkPerson` type) move to `Phase5Multiply.tsx`, exported if the page or a hook also uses them. Import them back into `page.tsx`. Run `npx tsc --noEmit`. Commit: `Move training phase data and merge helpers out of page.tsx`.

- [ ] **Step 3: Extract the three hooks**

Cut the progress state, refs, load effect, `inFlightRef`, `dirtyRef`, `performSave`, `runSave`, `scheduleSave`, the save-trigger effect, `toggleModuleComplete` and `toggleEpisodeWatched` into `useTrainingProgress.ts` as one block, **byte for byte**, including every comment. The hook takes `user` and returns the object described above. If the JSX references anything else from that block, add it to the return object and name it in your report. Do the same for check-ins into `useCheckins.ts` and network into `useNetworkView.ts`. `useCallback` dependency arrays must not change.

Verify the save engine moved unchanged:

```bash
git diff -M --stat
git show HEAD:src/app/leaders/training/page.tsx | sed -n '/const performSave = useCallback/,/^  }, \[/p' > /tmp/before.txt
sed -n '/const performSave = useCallback/,/^  }, \[/p' src/app/leaders/training/useTrainingProgress.ts > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt && echo "performSave identical"
```

Expected: `performSave identical`. Repeat for `runSave` and `scheduleSave`.

- [ ] **Step 4: Extract the phase components**

Move the Growth JSX (the `isGrowthPhase` branch) into `Phase4Growth.tsx`, the Multiply JSX (the `isMultiplyPhase` branch) into `Phase5Multiply.tsx`, and the module grid into `PhaseModules.tsx`. Pass state and handlers as typed props. No markup or class changes.

- [ ] **Step 5: Run all checks**

Run: `npx tsc --noEmit; npm test; npm run lint 2>&1 | tail -3`
Expected: tsc clean, tests pass, lint within 55 to 56 or at the Step 1 count.

- [ ] **Step 6: Manual browser check**

Start the dev server with preview_start. Seed a session in the page console (the old login still exists at this point):
`localStorage.setItem('avenue_auth_session', JSON.stringify({id:'1',email:'info@avenuemission.com',name:'Avenue Admin'}))`, reload `/leaders/training`.

Tick one Phase 1 module, reload, confirm it is still ticked, untick it, reload, confirm it is unticked. Open Growth and confirm the check-in history renders. Open Multiply and confirm the network list renders. Do not submit a check-in on the real leader. Screenshot each phase.

- [ ] **Step 7: Commit**

```bash
git add src/app/leaders/training/
git commit -m "Split training page into phase components and hooks, no behaviour change"
```

---

### Task 3: `resolveLeader` and `requireLeader`

**Files:**
- Create: `src/lib/leaderAuth.ts`
- Create: `src/lib/leaderAuth.test.ts`
- Create: `src/lib/requireLeader.ts`

**Interfaces:**
- Produces:
  - `leaderAuth.ts`: `bearerToken(header: string | null): string | null`; `interface LeaderIdentity { email: string; name: string; fullAccess: boolean }`; `type ResolveResult = { ok: true; leader: LeaderIdentity } | { ok: false; status: 401 | 403 | 500; error: string }`; `interface ResolveDeps { emailForToken(token: string): Promise<string | null>; findLeader(email: string): Promise<{ name: string | null; full_access: boolean } | null> }`; `resolveLeader(authHeader: string | null, deps: ResolveDeps): Promise<ResolveResult>`.
  - `requireLeader.ts`: `requireLeader(request: NextRequest): Promise<{ leader: LeaderIdentity } | { response: NextResponse }>`.

- [ ] **Step 1: Write the failing tests**

`src/lib/leaderAuth.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { bearerToken, resolveLeader, type ResolveDeps } from "./leaderAuth";

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    emailForToken: vi.fn(async () => "Leader@Example.invalid"),
    findLeader: vi.fn(async () => ({ name: "Leader", full_access: false })),
    ...overrides,
  };
}

describe("bearerToken", () => {
  it("reads a bearer token", () => expect(bearerToken("Bearer abc.def")).toBe("abc.def"));
  it("is case-insensitive on the scheme", () => expect(bearerToken("bearer abc")).toBe("abc"));
  it("rejects a missing header", () => expect(bearerToken(null)).toBeNull());
  it("rejects an empty token", () => expect(bearerToken("Bearer ")).toBeNull());
  it("rejects other schemes", () => expect(bearerToken("Basic abc")).toBeNull());
});

describe("resolveLeader", () => {
  it("401s with no header and never looks anything up", async () => {
    const d = deps();
    const r = await resolveLeader(null, d);
    expect(r).toEqual({ ok: false, status: 401, error: "Sign in required" });
    expect(d.emailForToken).not.toHaveBeenCalled();
    expect(d.findLeader).not.toHaveBeenCalled();
  });

  it("401s when the token does not verify, and never queries leaders", async () => {
    const d = deps({ emailForToken: vi.fn(async () => null) });
    const r = await resolveLeader("Bearer bad", d);
    expect(r).toEqual({ ok: false, status: 401, error: "Session expired, please sign in again" });
    expect(d.findLeader).not.toHaveBeenCalled();
  });

  it("403s when the verified email is not in leaders", async () => {
    const d = deps({ findLeader: vi.fn(async () => null) });
    const r = await resolveLeader("Bearer good", d);
    expect(r).toEqual({ ok: false, status: 403, error: "Not a leader account" });
  });

  it("looks the leader up by the lowercased verified email", async () => {
    const d = deps();
    await resolveLeader("Bearer good", d);
    expect(d.findLeader).toHaveBeenCalledWith("leader@example.invalid");
  });

  it("returns the identity on success", async () => {
    const r = await resolveLeader("Bearer good", deps({ findLeader: vi.fn(async () => ({ name: null, full_access: true })) }));
    expect(r).toEqual({ ok: true, leader: { email: "leader@example.invalid", name: "", fullAccess: true } });
  });

  it("500s when the token check throws", async () => {
    const r = await resolveLeader("Bearer good", deps({ emailForToken: vi.fn(async () => { throw new Error("auth down"); }) }));
    expect(r).toEqual({ ok: false, status: 500, error: "auth down" });
  });

  it("500s when the leaders query throws", async () => {
    const r = await resolveLeader("Bearer good", deps({ findLeader: vi.fn(async () => { throw new Error("db down"); }) }));
    expect(r).toEqual({ ok: false, status: 500, error: "db down" });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/leaderAuth.test.ts`
Expected: FAIL, cannot resolve `./leaderAuth`.

- [ ] **Step 3: Implement `src/lib/leaderAuth.ts`**

```ts
// Pure identity resolution for leader API routes. No Next.js or Supabase
// imports, so it can be unit tested with fakes. requireLeader.ts wires it
// to the real services.
//
// Order is fixed: verify the token, then check `leaders`, then return.
// Nothing about the caller is ever read from the request body or query.

export interface LeaderIdentity {
  email: string;
  name: string;
  fullAccess: boolean;
}

export type ResolveResult =
  | { ok: true; leader: LeaderIdentity }
  | { ok: false; status: 401 | 403 | 500; error: string };

export interface ResolveDeps {
  // The verified email for a token, or null when the token is invalid or
  // expired. Throws only on an outage, which becomes a 500, not a 401.
  emailForToken(token: string): Promise<string | null>;
  // The leaders row for an email, or null. Throws on a database error.
  findLeader(email: string): Promise<{ name: string | null; full_access: boolean } | null>;
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export async function resolveLeader(authHeader: string | null, deps: ResolveDeps): Promise<ResolveResult> {
  const token = bearerToken(authHeader);
  if (!token) return { ok: false, status: 401, error: "Sign in required" };

  try {
    const verified = await deps.emailForToken(token);
    if (!verified) return { ok: false, status: 401, error: "Session expired, please sign in again" };

    const email = verified.trim().toLowerCase();
    const row = await deps.findLeader(email);
    if (!row) return { ok: false, status: 403, error: "Not a leader account" };

    return { ok: true, leader: { email, name: row.name ?? "", fullAccess: row.full_access === true } };
  } catch (e) {
    return { ok: false, status: 500, error: (e as Error).message };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/leaderAuth.test.ts`
Expected: all pass.

- [ ] **Step 5: Implement `src/lib/requireLeader.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveLeader, type LeaderIdentity } from "@/lib/leaderAuth";

// Call FIRST in every leader route, before any other query:
//
//   const auth = await requireLeader(request);
//   if ("response" in auth) return auth.response;
//   const email = auth.leader.email;
//
// The email comes from the verified Supabase session. Never read the
// caller's email from the body or query string.
export async function requireLeader(
  request: NextRequest
): Promise<{ leader: LeaderIdentity } | { response: NextResponse }> {
  const db = getSupabaseAdmin();
  const result = await resolveLeader(request.headers.get("authorization"), {
    async emailForToken(token) {
      const { data, error } = await db.auth.getUser(token);
      if (error) {
        // 400, 401 and 403 mean the token itself is bad or expired.
        // Anything else is an outage and must fail loudly as a 500.
        if (error.status === 400 || error.status === 401 || error.status === 403) return null;
        throw new Error(`Auth check failed: ${error.message}`);
      }
      return data.user?.email ?? null;
    },
    async findLeader(email) {
      const { data, error } = await db
        .from("leaders")
        .select("name, full_access")
        .eq("email", email)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { name: string | null; full_access: boolean } | null;
    },
  });
  if (!result.ok) return { response: NextResponse.json({ error: result.error }, { status: result.status }) };
  return { leader: result.leader };
}
```

- [ ] **Step 6: Run all checks, then commit**

Run: `npx tsc --noEmit; npm test`

```bash
git add src/lib/leaderAuth.ts src/lib/leaderAuth.test.ts src/lib/requireLeader.ts
git commit -m "Add requireLeader: verify the Supabase session, then check leaders first"
```

---

### Task 4: Code login: request-code route, client auth, login page, leaderFetch

**Files:**
- Create: `src/app/api/auth/request-code/route.ts`
- Create: `src/lib/leaderFetch.ts`
- Rewrite: `src/lib/auth.ts`
- Rewrite: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts` (anon client, session persisted by supabase-js in localStorage).
- Produces:
  - `auth.ts`: `interface User { id: string; email: string; name: string }`; `requestCode(email: string): Promise<void>`; `verifyCode(email: string, code: string): Promise<User>`; `requestAccess(name: string, email: string): Promise<void>`; `logout(): void`; `getCurrentUser(): User | null`; `isAuthenticated(): boolean`. The old `login` and `signup` are removed.
  - `leaderFetch(input: string, init?: RequestInit): Promise<Response>`.

- [ ] **Step 1: Write the request-code route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/supabaseAdmin";

// POST /api/auth/request-code  { email }
// Sends a 6-digit sign-in code, but only to an email already in `leaders`.
// The reply is the same whether or not the email is a leader, so this
// endpoint cannot be used to discover who the leaders are.
const NEUTRAL = "If that email is registered, a code is on its way.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const body = await request.json().catch(() => null);
  const raw = body && typeof body.email === "string" ? body.email : "";
  const email = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: leader, error } = await db.from("leaders").select("email").eq("email", email).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (leader) {
    const { error: otpErr } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (otpErr) {
      const status = otpErr.status === 429 ? 429 : 500;
      const message = status === 429 ? "Too many codes requested. Please wait a few minutes and try again." : otpErr.message;
      return NextResponse.json({ error: message }, { status });
    }
  }
  return NextResponse.json({ ok: true, message: NEUTRAL });
}
```

- [ ] **Step 2: Rewrite `src/lib/auth.ts`**

```ts
// ============================================
// LEADER AUTH
// Sign-in is an emailed 6-digit code (Supabase Auth). supabase-js keeps
// the real session. The small cache under avenue_auth_session only lets
// pages render a name without waiting: the server never trusts it.
// ============================================
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  email: string;
  name: string;
}

const AUTH_STORAGE_KEY = "avenue_auth_session";
const LEGACY_USERS_KEY = "avenue_users";

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function requestCode(email: string): Promise<void> {
  const res = await postJson("/api/auth/request-code", { email });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not send a code. Please try again.");
  }
}

export async function verifyCode(email: string, code: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: "email" });
  if (error || !data.session) throw new Error(error?.message || "That code did not work. Please try again.");

  const res = await fetch("/api/leader-access", {
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
  const info = await res.json().catch(() => ({}));
  if (!res.ok) {
    await supabase.auth.signOut();
    throw new Error(info.error || "This email is not registered as a leader.");
  }

  const user: User = { id: data.session.user.id, email: cleanEmail, name: info.name || cleanEmail };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_USERS_KEY);
  return user;
}

// Creates a pending leaders row (admin is notified), then sends a code.
export async function requestAccess(name: string, email: string): Promise<void> {
  const res = await postJson("/api/leader-access", { email: email.trim().toLowerCase(), name: name.trim() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Could not register. Please try again.");
  }
  await requestCode(email);
}

export const logout = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USERS_KEY);
  void supabase.auth.signOut();
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem(AUTH_STORAGE_KEY);
  return session ? (JSON.parse(session) as User) : null;
};

export const isAuthenticated = (): boolean => getCurrentUser() !== null;
```

Note: `verifyCode` reads `/api/leader-access` with a bearer token, which only works after Task 6 moves that route onto `requireLeader`. Until then the login page cannot complete a sign-in. That is expected; Task 5 tests the route with scripts and Task 6 completes the flow.

- [ ] **Step 3: Write `src/lib/leaderFetch.ts`**

```ts
"use client";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/auth";

function toLogin(): void {
  logout();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// fetch for leader APIs: attaches the Supabase access token. With no
// session it sends the leader to /login and rejects, so callers' existing
// error paths run. A 401 from the server does the same.
export async function leaderFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    toLogin();
    throw new Error("Please sign in again");
  }
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) toLogin();
  return res;
}
```

- [ ] **Step 4: Rewrite the login page**

Keep the current outer layout, logo, `Reveal` and `.panel` wrapper exactly. Replace the form logic with three modes: `"email"`, `"code"`, `"request"`.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { requestCode, verifyCode, requestAccess } from "@/lib/auth";
import { Mail, User, KeyRound, ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

type Mode = "email" | "code" | "request";

const INPUT =
  "w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-[var(--accent)] transition-colors";
const LABEL = "block text-gray-400 text-xs mb-2 uppercase tracking-wider";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setError("");
    setLoading(true);
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "email") {
      run(async () => {
        await requestCode(email);
        setNotice(`If ${email.trim()} is registered, we've sent it a 6-digit code.`);
        setMode("code");
      });
    } else if (mode === "request") {
      run(async () => {
        if (!name.trim()) throw new Error("Please enter your name");
        await requestAccess(name, email);
        setNotice(`We've sent a 6-digit code to ${email.trim()}.`);
        setMode("code");
      });
    } else {
      run(async () => {
        await verifyCode(email, code);
        router.push("/leaders");
      });
    }
  };

  const heading = mode === "request" ? "Request Access" : mode === "code" ? "Enter Your Code" : "Leader Login";
  const sub =
    mode === "request"
      ? "Join the Avenue leadership community"
      : mode === "code"
        ? notice
        : "We'll email you a sign-in code. No password needed.";
  const button = mode === "code" ? "Sign in" : mode === "request" ? "Request access" : "Email me a code";

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      <Reveal className="w-full max-w-md">
        <div className="panel p-8">
          <div className="text-center mb-8">
            <Image src="/images/Avenue.png" alt="Avenue" width={180} height={50} className="mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-white uppercase tracking-wider">{heading}</h1>
            <p className="text-gray-400 text-sm mt-2">{sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "request" && (
              <div>
                <label className={LABEL}>Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Your name" autoComplete="name" />
                </div>
              </div>
            )}

            {mode !== "code" && (
              <div>
                <label className={LABEL}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="your@email.com" autoComplete="email" required />
                </div>
              </div>
            )}

            {mode === "code" && (
              <div>
                <label className={LABEL}>6-digit code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className={`${INPUT} tracking-[0.4em] text-lg`}
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--accent)] text-white py-3 rounded-full font-medium hover:brightness-110 transition-all uppercase tracking-wider text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Please wait..." : button}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
            {mode === "code" ? (
              <button type="button" className="hover:text-white transition-colors" onClick={() => { setCode(""); setError(""); setMode("email"); }}>
                Use a different email, or send a new code
              </button>
            ) : (
              <button
                type="button"
                className="hover:text-white transition-colors"
                onClick={() => { setError(""); setMode(mode === "request" ? "email" : "request"); }}
              >
                {mode === "request" ? "Already registered? Sign in" : "New leader? Request access"}
              </button>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
```

Before replacing the file, read the rest of the current `src/app/login/page.tsx` (below line 150). If it has anything after the form besides the toggle link (for example a back-to-home link), keep that element.

- [ ] **Step 5: Find every caller of the removed functions**

Run: `grep -rn "from \"@/lib/auth\"" src | grep -v "getCurrentUser\|logout\|User\b"` and `grep -rn "\blogin(\|\bsignup(" src`
Expected: only `src/app/login/page.tsx`, now rewritten. Fix any other caller.

- [ ] **Step 6: Checks and a manual look**

Run: `npx tsc --noEmit; npm test; npm run lint 2>&1 | tail -3`.
Open `/login` in the browser pane, and in the email step enter `nobody@example.invalid`. Expected: moves to the code step with the neutral notice. Check the network tab: `POST /api/auth/request-code` returned 200. Then run `npm run guard`: expected `clean` (no auth user is created for a non-leader).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/auth/request-code/route.ts src/lib/auth.ts src/lib/leaderFetch.ts src/app/login/page.tsx
git commit -m "Replace browser-only password login with emailed code sign-in"
```

---

### Task 5: End-to-end auth check script

**Files:**
- Create: `scripts/check-auth.mjs`

**Interfaces:**
- Consumes: `scripts/lib/fixtures.mjs` (Task 1).
- Produces: `node --env-file=.env.local scripts/check-auth.mjs`, which Tasks 6, 7 and 8 extend by appending to its `CHECKS` sections.

- [ ] **Step 1: Write the script**

```js
// End-to-end checks that every leader route trusts only the verified session.
// Needs the dev server on :3000. Run: node --env-file=.env.local scripts/check-auth.mjs
import { db, createFixtureLeader, tokenFor, cleanupFixtures } from "./lib/fixtures.mjs";

const BASE = "http://localhost:3000";
const A = "auth-check-a@example.invalid"; // leader, full_access false
const B = "auth-check-b@example.invalid"; // leader, full_access true
const OUTSIDER = "auth-check-outsider@example.invalid"; // auth user, NOT in leaders
const ALL = [A, B, OUTSIDER];

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${detail}`); }
}

async function call(method, path, { token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body, e.g. a file */ }
  return { status: res.status, json };
}

// Leader routes: each must refuse a missing or garbage token with 401.
const GUARDED = [
  ["GET", "/api/leader-access"],
  ["GET", "/api/leader-profile"],
  ["PUT", "/api/leader-profile"],
  ["GET", "/api/leader-checkins"],
  ["GET", "/api/leader-training"],
  ["GET", "/api/network"],
];

try {
  await cleanupFixtures(ALL); // leftovers from an interrupted run
  await createFixtureLeader({ email: A, name: "Auth Check A", fullAccess: false });
  await createFixtureLeader({ email: B, name: "Auth Check B", fullAccess: true });
  const tokenA = await tokenFor(A);
  const tokenB = await tokenFor(B);
  const tokenOutsider = await tokenFor(OUTSIDER);

  console.log("request-code");
  {
    const r = await call("POST", "/api/auth/request-code", { body: { email: "auth-check-nobody@example.invalid" } });
    check("unknown email gets the neutral 200", r.status === 200 && r.json?.ok === true, JSON.stringify(r));
    const bad = await call("POST", "/api/auth/request-code", { body: { email: "not-an-email" } });
    check("malformed email is 400", bad.status === 400);
  }

  console.log("no token, garbage token, non-leader token");
  for (const [method, path] of GUARDED) {
    const none = await call(method, path, { body: method === "GET" ? undefined : {} });
    check(`${method} ${path} without token is 401`, none.status === 401, `got ${none.status}`);
    const junk = await call(method, path, { token: "not-a-jwt", body: method === "GET" ? undefined : {} });
    check(`${method} ${path} with garbage token is 401`, junk.status === 401, `got ${junk.status}`);
    const outsider = await call(method, path, { token: tokenOutsider, body: method === "GET" ? undefined : {} });
    check(`${method} ${path} for a non-leader is 403`, outsider.status === 403, `got ${outsider.status}`);
  }

  console.log("body email is ignored");
  {
    const r = await call("PUT", "/api/leader-profile", { token: tokenA, body: { email: B, about: "written by A" } });
    check("profile PUT succeeds for A", r.status === 200, JSON.stringify(r));
    const { data: bRow, error: bErr } = await db.from("leader_profiles").select("about").eq("email", B).maybeSingle();
    if (bErr) throw new Error(bErr.message);
    check("B's profile untouched by A's request", !bRow || bRow.about !== "written by A");
    const { data: aRow, error: aErr } = await db.from("leader_profiles").select("about").eq("email", A).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    check("A's own profile holds the write", aRow?.about === "written by A");
  }

  console.log("leader-access returns the caller's own row");
  {
    const r = await call("GET", `/api/leader-access?email=${encodeURIComponent(B)}`, { token: tokenA });
    check("A asking about B still gets A", r.status === 200 && r.json?.name === "Auth Check A" && r.json?.full_access === false, JSON.stringify(r));
  }

  // Task 7 appends: resources, workshops, seed.
  // Task 8 appends: people.
} finally {
  await cleanupFixtures(ALL);
  console.log("fixtures cleaned");
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log("\nall passed");
```

- [ ] **Step 2: Run it before Task 6**

Start the dev server. Run: `node --env-file=.env.local scripts/check-auth.mjs`
Expected at this point: `request-code` checks pass. The 401, 403 and "body email is ignored" checks FAIL, because the routes still trust the body. Record the failure list in your report. That list is Task 6's target.

Then run: `npm run guard`. Expected: `clean`.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-auth.mjs
git commit -m "Add end-to-end auth check script with fixture leaders"
```

---

### Task 6: Move the core leader routes and pages onto the verified session

**Files:**
- Modify: `src/app/api/leader-access/route.ts` (GET only)
- Modify: `src/app/api/leader-profile/route.ts`
- Modify: `src/app/api/leader-checkins/route.ts`
- Modify: `src/app/api/leader-training/route.ts`
- Modify: `src/app/api/network/route.ts`
- Modify: `src/components/ui/ProfileCard.tsx:121,178`
- Modify: `src/app/leaders/page.tsx:50,61,85`
- Modify: `src/app/leaders/network/page.tsx:29,61`
- Modify: `src/app/leaders/study-guides/page.tsx:50`
- Modify: the training hooks from Task 2 (the calls that were `page.tsx:508,531,590,631,681,715,926,981`)
- Modify: `scripts/check-checkins-api.mjs`, `scripts/check-network-api.mjs`, `scripts/check-training-api.mjs`, `scripts/check-network-signup.mjs`

**Interfaces:**
- Consumes: `requireLeader` (Task 3), `leaderFetch` (Task 4), `tokenFor` (Task 1).

**The server pattern.** In each handler, directly after the existing `adminConfigError()` guard and after any existing admin-only branch that runs before the email is read, replace the line that reads the email from the query or body:

```ts
// before
const email = normaliseEmail(url.searchParams.get("email"));
if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

// after
const auth = await requireLeader(request);
if ("response" in auth) return auth.response;
const email = auth.leader.email;
```

Keep each route's existing `leaders`-first helper (`isLeader`, `ensureProgress`, `ensureNode`) and its call. It now runs on a verified email, and it still creates the progress row or network node on first use. Remove any `normaliseEmail` function that becomes unused.

- [ ] **Step 1: `leader-access` GET**

Replace the query-string email with `requireLeader`. Return `{ found: true, full_access: auth.leader.fullAccess, name: auth.leader.name }`. `requireLeader` has already refused non-leaders with 403, so the `found: false` branch goes. POST stays public and unchanged.

- [ ] **Step 2: `leader-profile` GET and PUT**

GET: `requireLeader`, then `.eq("email", auth.leader.email)`. PUT: `requireLeader`, then build `row.email` from `auth.leader.email`. Ignore `body.email` completely.

- [ ] **Step 3: `leader-checkins` GET and PUT**

Apply the pattern. PUT reads `email` from `auth.leader.email` instead of `body.email`. Keep `isLeader` and its "Do not reorder this" comment.

- [ ] **Step 4: `leader-training` GET, PUT, POST**

GET: the `?all=1` admin branch stays first and unchanged; the pattern replaces line 176. PUT: replaces line 194. POST: the admin-only checkpoint refusal (lines 286 to 294) stays before anything else; `requireLeader` replaces line 283 and moves to just after that admin block. For `complete-checkpoint` and `reopen-checkpoint`, the target leader is named by the admin in `body.email`, so keep reading `body.email` for those two admin actions only; every other action uses `auth.leader.email`. Do not touch the revision logic.

- [ ] **Step 5: `network` GET and POST**

GET: the pattern replaces line 163. POST: the admin `reparent` branch stays first and unchanged. Replace `actorEmail` (line 248) with `const auth = await requireLeader(request); if ("response" in auth) return auth.response; const actorEmail = auth.leader.email;`. `body.email` in the `add` action is the email of the person being added, not the caller: leave it.

- [ ] **Step 6: Client pages**

In every file listed above, import `leaderFetch` from `@/lib/leaderFetch`, replace `fetch` for these leader routes, and remove `?email=...` from URLs and `email` / `actorEmail` (the caller's own) from bodies. In the network `add` body, keep the new person's `email`. In the training hooks, the edit is limited to the `fetch` identifier and the removed email: do not restructure the calls. Public routes (`/api/content/pathway-groups`) stay on plain `fetch`.

Run: `grep -rn "email=\${encodeURIComponent" src/app src/components`
Expected: no leader-route matches remain (resources and workshops are Task 7).

- [ ] **Step 7: Update the existing check scripts**

In each of `check-checkins-api.mjs`, `check-network-api.mjs`, `check-training-api.mjs`, `check-network-signup.mjs`: import `tokenFor` from `./lib/fixtures.mjs`, get a token for the email each script already acts as (for the real leader that creates a Supabase auth user for `info@avenuemission.com`, which is harmless and happens on first real sign-in anyway), send it as `authorization: Bearer`, and drop the email from query strings and bodies. Where a script tests "a stranger email is refused", switch it to "no token is 401". Keep every existing capture and restore of real rows exactly as it is.

- [ ] **Step 8: Run everything**

```bash
npx tsc --noEmit; npm test; npm run lint 2>&1 | tail -3
node --env-file=.env.local scripts/check-auth.mjs
node --env-file=.env.local scripts/check-checkins-api.mjs
node --env-file=.env.local scripts/check-training-api.mjs
node --env-file=.env.local scripts/check-network-api.mjs
node --env-file=.env.local scripts/check-network-signup.mjs
npm run guard
```

Expected: all pass, guard `clean`.

- [ ] **Step 9: Real sign-in in the browser**

This needs Henry's Supabase settings (spec 1.6) to be done; the coordinator confirms before this step. Sign in at `/login` with `henry.jamcmahon@gmail.com`; Henry reads the code from his email. Then check: `/leaders` loads the profile card, `/leaders/training` loads progress, Growth history and the network, `/leaders/network` renders. Screenshot each. If the settings are not done yet, report this step as skipped; do not work around it.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/leader-access/route.ts src/app/api/leader-profile/route.ts src/app/api/leader-checkins/route.ts src/app/api/leader-training/route.ts src/app/api/network/route.ts src/components/ui/ProfileCard.tsx src/app/leaders scripts
git commit -m "Take the caller's email from the verified session on all core leader routes"
```

---

### Task 7: Lock resources, workshops and the seed route; remove old auth

**Files:**
- Modify: `src/app/api/leader-resources/route.ts`
- Modify: `src/app/api/leader-resources/[filename]/route.ts`
- Modify: `src/app/api/workshops/results/route.ts`, `sessions/route.ts`, `clear/route.ts`, `ai-speak/route.ts`, `ai-recommendation/route.ts`
- Modify: `src/app/api/leader-access/seed/route.ts`
- Modify: `src/app/leaders/resources/page.tsx:109,118,149`
- Modify: `src/app/leaders/workshops/page.tsx:36,51,69`
- Modify: `src/app/leaders/workshops/[code]/page.tsx:361,362,547,557`
- Modify: `scripts/check-auth.mjs`

**Interfaces:**
- Consumes: `requireLeader`, `leaderFetch`, `isAdminAuthorized`.

- [ ] **Step 1: Extend `check-auth.mjs` first**

Insert before the `// Task 7 appends` comment:

```js
  console.log("resources need full access");
  {
    const a = await call("GET", "/api/leader-resources", { token: tokenA });
    check("A (no full access) is 403 on resources", a.status === 403, `got ${a.status}`);
    const b = await call("GET", "/api/leader-resources", { token: tokenB });
    check("B (full access) lists resources", b.status === 200 && Array.isArray(b.json?.resources), `got ${b.status}`);
    const none = await call("GET", "/api/leader-resources");
    check("resources without token is 401", none.status === 401);
  }

  console.log("workshop admin routes need a leader");
  for (const [method, path] of [
    ["GET", "/api/workshops/results?code=ALL"],
    ["GET", "/api/workshops/sessions"],
    ["POST", "/api/workshops/sessions"],
    ["DELETE", "/api/workshops/clear?code=ZZZZZZ"],
    ["POST", "/api/workshops/ai-speak"],
    ["POST", "/api/workshops/ai-recommendation"],
  ]) {
    const r = await call(method, path, { body: method === "GET" || method === "DELETE" ? undefined : {} });
    check(`${method} ${path} without token is 401`, r.status === 401, `got ${r.status}`);
  }
  {
    const r = await call("GET", "/api/workshops/sessions", { token: tokenA });
    check("a leader can list workshop sessions", r.status === 200, `got ${r.status}`);
    const v = await call("POST", "/api/workshops/validate-code", { body: { code: "ZZZZZZ" } });
    check("validate-code stays public (not 401)", v.status !== 401, `got ${v.status}`);
  }

  console.log("seed route needs admin");
  {
    const r = await call("POST", "/api/leader-access/seed");
    check("seed without admin key is 401", r.status === 401, `got ${r.status}`);
  }
```

⚠️ **Do not run the script yet.** Unlike Task 5, the red run is skipped here on purpose: before Steps 2 to 4 land, the seed route would really seed full-access accounts into the blob store, and the AI routes would really call OpenAI. Run it for the first time in Step 7.

- [ ] **Step 2: Resources routes**

In both files delete `verifyLeaderAccess` and `isLocal`. At the top of each `GET`:

```ts
const auth = await requireLeader(request);
if ("response" in auth) return auth.response;
if (!auth.leader.fullAccess) {
  return NextResponse.json({ error: "Access denied. Full leader access required." }, { status: 403 });
}
```

Remove the `email` query parameter reads.

- [ ] **Step 3: Workshop routes**

At the top of each handler in `results`, `sessions` (GET and POST), `clear`, `ai-speak`, `ai-recommendation`:

```ts
const auth = await requireLeader(request);
if ("response" in auth) return auth.response;
```

`sessions` GET currently takes no argument: change it to `GET(request: NextRequest)` and import `NextRequest`. Leave `submit` and `validate-code` unchanged.

- [ ] **Step 4: Seed route**

Change `POST()` to `POST(request: NextRequest)` and add as the first lines:

```ts
if (!isAdminAuthorized(request)) {
  return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
}
```

importing `isAdminAuthorized` from `@/lib/supabaseAdmin`.

- [ ] **Step 5: Client pages**

`resources/page.tsx`: lines 109 and 118 use `leaderFetch` with no email. Replace the `window.open` download at line 149 with:

```ts
const res = await leaderFetch(`/api/leader-resources/${encodeURIComponent(filename)}`);
if (!res.ok) {
  setDownloadError("That file could not be downloaded. Please try again.");
  return;
}
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 10_000);
```

Make the enclosing handler `async`, and add `const [downloadError, setDownloadError] = useState<string | null>(null);` rendered as `<p className="text-red-400 text-sm">` above the downloads list when set. `workshops/page.tsx` and `workshops/[code]/page.tsx`: swap `fetch` for `leaderFetch` on the calls listed.

- [ ] **Step 6: Remove the last of the old auth**

Run: `grep -rn "avenue_users\|password" src --include=*.ts --include=*.tsx`
Expected: only `LEGACY_USERS_KEY` cleanup in `auth.ts` and unrelated matches (for example `GMAIL_APP_PASSWORD` in `send-email`). Remove anything else that stored or compared a leader password. In `HANDOVER.md` section 5, replace the console session-seeding tip with: "Sign in at `/login` with a real leader email and the emailed code. Scripts get tokens from `tokenFor()` in `scripts/lib/fixtures.mjs`."

- [ ] **Step 7: Run everything**

```bash
npx tsc --noEmit; npm test; npm run lint 2>&1 | tail -3
node --env-file=.env.local scripts/check-auth.mjs
npm run guard
```

Expected: all pass, guard `clean`. In the browser (signed in as Henry), download one resource and open one workshop results page.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/leader-resources src/app/api/workshops src/app/api/leader-access/seed/route.ts src/app/leaders/resources/page.tsx src/app/leaders/workshops scripts/check-auth.mjs HANDOVER.md
git commit -m "Require sign-in on resources and workshop admin routes, admin key on seed"
```

---

### Task 8: My People table, API and picker

**Files:**
- Create: `supabase/migrations/007_leader_people.sql`
- Create: `src/lib/people.ts`
- Create: `src/lib/people.test.ts`
- Create: `src/app/api/people/route.ts`
- Create: `src/components/people/PersonPicker.tsx`
- Modify: `scripts/check-auth.mjs`

**Interfaces:**
- Consumes: `requireLeader`, `leaderFetch`.
- Produces:
  - `people.ts`: `SPACES = ["first","second","third"] as const`, `METRICS = ["pathways","intersections","streetlights"] as const`, `type Space`, `type Metric`, `interface Person { id: string; firstName: string; lastName: string | null; spaces: Space[]; metrics: Metric[]; invitee: boolean; icnu: string | null; networkPersonId: string | null }`, `MAX_PEOPLE = 500`, `validatePersonInput(body: unknown, mode: "create" | "update"): { values: Record<string, unknown> } | { error: string }` returning snake_case column values.
  - `/api/people`: GET returns `{ people: Person[] }`; POST returns `{ person: Person }` (201); PATCH `{ id, ...fields }` returns `{ person: Person }`; DELETE `?id=` returns `{ ok: true }`.
  - `PersonPicker` props: `{ tag: { kind: "space"; value: Space } | { kind: "metric"; value: Metric } | { kind: "invitee" }; people: Person[]; onChange(person: Person): void }`.

- [ ] **Step 1: Write the migration**

Copy the SQL from spec section 3.1 into `supabase/migrations/007_leader_people.sql`, with this header comment:

```sql
-- ============================================================
-- My People: one private list per leader (spec 2026-09-23 foundations).
-- Calling tags people by space, Growth by metric, Launch marks invitees,
-- Multiply links a person to the church-wide network_people tree.
-- The three metrics are independent tags, not a ladder.
-- RLS on, no policies: all access through /api/people (service role).
-- ============================================================
```

- [ ] **Step 2: Apply the migration (coordinator step)**

The coordinator runs the file in the Supabase SQL editor for project `omepkrdyuymnqopaznid` (through Henry's Chrome with his go-ahead, or Henry runs it). Then verify: `node --env-file=.env.local -e "..."` selecting `id` from `leader_people` with `.limit(1)` returns no error. Implementers do not run DDL.

- [ ] **Step 3: Write the failing validation tests**

`src/lib/people.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validatePersonInput } from "./people";

describe("validatePersonInput", () => {
  it("accepts a minimal create", () => {
    expect(validatePersonInput({ firstName: " Sam " }, "create")).toEqual({ values: { first_name: "Sam" } });
  });
  it("requires firstName on create", () => {
    expect(validatePersonInput({}, "create")).toEqual({ error: "First name is required" });
  });
  it("does not require firstName on update", () => {
    expect(validatePersonInput({ invitee: true }, "update")).toEqual({ values: { invitee: true } });
  });
  it("rejects a name over 80 characters", () => {
    expect(validatePersonInput({ firstName: "a".repeat(81) }, "create")).toEqual({ error: "First name must be 80 characters or fewer" });
  });
  it("turns an empty lastName into null", () => {
    expect(validatePersonInput({ firstName: "Sam", lastName: "  " }, "create")).toEqual({ values: { first_name: "Sam", last_name: null } });
  });
  it("accepts known spaces and metrics, deduplicated", () => {
    expect(validatePersonInput({ spaces: ["third", "first", "third"], metrics: ["streetlights"] }, "update")).toEqual({
      values: { spaces: ["third", "first"], metrics: ["streetlights"] },
    });
  });
  it("rejects an unknown space", () => {
    expect(validatePersonInput({ spaces: ["fourth"] }, "update")).toEqual({ error: "spaces contains an invalid value: \"fourth\"" });
  });
  it("rejects an unknown metric", () => {
    expect(validatePersonInput({ metrics: ["baptisms"] }, "update")).toEqual({ error: "metrics contains an invalid value: \"baptisms\"" });
  });
  it("rejects icnu over 2000 characters", () => {
    expect(validatePersonInput({ icnu: "x".repeat(2001) }, "update")).toEqual({ error: "ICNU must be 2000 characters or fewer" });
  });
  it("rejects a non-boolean invitee", () => {
    expect(validatePersonInput({ invitee: "yes" }, "update")).toEqual({ error: "invitee must be true or false" });
  });
  it("accepts a uuid networkPersonId and null", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(validatePersonInput({ networkPersonId: id }, "update")).toEqual({ values: { network_person_id: id } });
    expect(validatePersonInput({ networkPersonId: null }, "update")).toEqual({ values: { network_person_id: null } });
  });
  it("rejects a malformed networkPersonId", () => {
    expect(validatePersonInput({ networkPersonId: "abc" }, "update")).toEqual({ error: "networkPersonId must be a uuid or null" });
  });
  it("ignores unknown fields such as owner_email", () => {
    expect(validatePersonInput({ firstName: "Sam", owner_email: "x@y.z", id: "1" }, "create")).toEqual({ values: { first_name: "Sam" } });
  });
  it("rejects a non-object body", () => {
    expect(validatePersonInput(null, "create")).toEqual({ error: "Body must be a JSON object" });
  });
});
```

Run: `npx vitest run src/lib/people.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 4: Implement `src/lib/people.ts`**

```ts
// Shared shape and validation for My People (leader_people). Pure, so the
// API route and its tests share one definition. Owner and id are never
// accepted from input: the route sets owner_email from the session.

export const SPACES = ["first", "second", "third"] as const;
export const METRICS = ["pathways", "intersections", "streetlights"] as const;
export type Space = (typeof SPACES)[number];
export type Metric = (typeof METRICS)[number];

export const MAX_PEOPLE = 500;
const MAX_NAME = 80;
const MAX_ICNU = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Person {
  id: string;
  firstName: string;
  lastName: string | null;
  spaces: Space[];
  metrics: Metric[];
  invitee: boolean;
  icnu: string | null;
  networkPersonId: string | null;
}

export interface PersonRow {
  id: string;
  first_name: string;
  last_name: string | null;
  spaces: string[];
  metrics: string[];
  invitee: boolean;
  icnu: string | null;
  network_person_id: string | null;
}

export const PERSON_COLUMNS = "id, first_name, last_name, spaces, metrics, invitee, icnu, network_person_id";

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    spaces: (row.spaces ?? []) as Space[],
    metrics: (row.metrics ?? []) as Metric[],
    invitee: row.invitee,
    icnu: row.icnu,
    networkPersonId: row.network_person_id,
  };
}

function tagList(value: unknown, field: string, allowed: readonly string[]): { list: string[] } | { error: string } {
  if (!Array.isArray(value)) return { error: `${field} must be an array` };
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string" || !allowed.includes(v)) return { error: `${field} contains an invalid value: ${JSON.stringify(v)}` };
    if (!out.includes(v)) out.push(v);
  }
  return { list: out };
}

export function validatePersonInput(body: unknown, mode: "create" | "update"): { values: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("firstName" in b) {
    const first = typeof b.firstName === "string" ? b.firstName.trim() : "";
    if (!first) return { error: "First name is required" };
    if (first.length > MAX_NAME) return { error: `First name must be ${MAX_NAME} characters or fewer` };
    values.first_name = first;
  } else if (mode === "create") {
    return { error: "First name is required" };
  }

  if ("lastName" in b) {
    if (b.lastName !== null && typeof b.lastName !== "string") return { error: "lastName must be text or null" };
    const last = typeof b.lastName === "string" ? b.lastName.trim() : "";
    if (last.length > MAX_NAME) return { error: `Last name must be ${MAX_NAME} characters or fewer` };
    values.last_name = last || null;
  }

  if ("spaces" in b) {
    const r = tagList(b.spaces, "spaces", SPACES);
    if ("error" in r) return r;
    values.spaces = r.list;
  }

  if ("metrics" in b) {
    const r = tagList(b.metrics, "metrics", METRICS);
    if ("error" in r) return r;
    values.metrics = r.list;
  }

  if ("invitee" in b) {
    if (typeof b.invitee !== "boolean") return { error: "invitee must be true or false" };
    values.invitee = b.invitee;
  }

  if ("icnu" in b) {
    if (b.icnu !== null && typeof b.icnu !== "string") return { error: "icnu must be text or null" };
    const icnu = typeof b.icnu === "string" ? b.icnu.trim() : "";
    if (icnu.length > MAX_ICNU) return { error: `ICNU must be ${MAX_ICNU} characters or fewer` };
    values.icnu = icnu || null;
  }

  if ("networkPersonId" in b) {
    if (b.networkPersonId !== null && (typeof b.networkPersonId !== "string" || !UUID.test(b.networkPersonId))) {
      return { error: "networkPersonId must be a uuid or null" };
    }
    values.network_person_id = b.networkPersonId;
  }

  return { values };
}
```

Run: `npx vitest run src/lib/people.test.ts`. Expected: all pass.

- [ ] **Step 5: Extend `check-auth.mjs` for people**

Insert before the `// Task 8 appends` comment:

```js
  console.log("people are private to their owner");
  {
    const none = await call("GET", "/api/people");
    check("people without token is 401", none.status === 401);
    const created = await call("POST", "/api/people", { token: tokenA, body: { firstName: "Fixture Friend", spaces: ["third"], owner_email: B } });
    check("A creates a person", created.status === 201 && created.json?.person?.firstName === "Fixture Friend", JSON.stringify(created));
    const id = created.json?.person?.id;
    const { data: row, error } = await db.from("leader_people").select("owner_email").eq("id", id).single();
    if (error) throw new Error(error.message);
    check("owner is A even though the body said B", row.owner_email === A);
    const bList = await call("GET", "/api/people", { token: tokenB });
    check("B cannot see A's person", bList.status === 200 && !bList.json.people.some((p) => p.id === id));
    const bPatch = await call("PATCH", "/api/people", { token: tokenB, body: { id, icnu: "hijack" } });
    check("B cannot edit A's person (404)", bPatch.status === 404, `got ${bPatch.status}`);
    const bDelete = await call("DELETE", `/api/people?id=${id}`, { token: tokenB });
    check("B cannot delete A's person (404)", bDelete.status === 404, `got ${bDelete.status}`);
    const aPatch = await call("PATCH", "/api/people", { token: tokenA, body: { id, metrics: ["pathways", "streetlights"], icnu: "I see a shepherd" } });
    check("A edits their person", aPatch.status === 200 && aPatch.json?.person?.metrics?.length === 2, JSON.stringify(aPatch));
    const badTag = await call("PATCH", "/api/people", { token: tokenA, body: { id, spaces: ["fourth"] } });
    check("invalid space is 400", badTag.status === 400);
    const aDelete = await call("DELETE", `/api/people?id=${id}`, { token: tokenA });
    check("A deletes their person", aDelete.status === 200);
  }
```

Run the script. Expected: these FAIL (route missing, 404). Everything else passes.

- [ ] **Step 6: Implement `src/app/api/people/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, adminConfigError } from "@/lib/supabaseAdmin";
import { requireLeader } from "@/lib/requireLeader";
import { MAX_PEOPLE, PERSON_COLUMNS, toPerson, validatePersonInput, type PersonRow } from "@/lib/people";

// My People: a private list per leader. Every query is filtered by the
// verified owner email, so another leader's row is simply not found
// (404), never read-then-refused.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leader_people")
    .select(PERSON_COLUMNS)
    .eq("owner_email", auth.leader.email)
    .order("first_name", { ascending: true })
    .limit(MAX_PEOPLE);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ people: ((data ?? []) as PersonRow[]).map(toPerson) });
}

export async function POST(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = validatePersonInput(body, "create");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = getSupabaseAdmin();
  const { count, error: countErr } = await db
    .from("leader_people")
    .select("id", { count: "exact", head: true })
    .eq("owner_email", auth.leader.email);
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if ((count ?? 0) >= MAX_PEOPLE) {
    return NextResponse.json({ error: `You can keep up to ${MAX_PEOPLE} people` }, { status: 400 });
  }

  const { data, error } = await db
    .from("leader_people")
    .insert({ ...parsed.values, owner_email: auth.leader.email })
    .select(PERSON_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ person: toPerson(data as PersonRow) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id must be a uuid" }, { status: 400 });
  const parsed = validatePersonInput(body, "update");
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_people")
    .update({ ...parsed.values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_email", auth.leader.email)
    .select(PERSON_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  return NextResponse.json({ person: toPerson(data as PersonRow) });
}

export async function DELETE(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "id must be a uuid" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_people")
    .delete()
    .eq("id", id)
    .eq("owner_email", auth.leader.email)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
```

The count-then-insert cap can overshoot by a request or two under concurrency. That is acceptable for a soft limit of 500 and is not an authorisation decision.

- [ ] **Step 7: Run checks**

```bash
npx tsc --noEmit; npm test
node --env-file=.env.local scripts/check-auth.mjs
npm run guard
```

Expected: all pass, guard `clean`.

- [ ] **Step 8: Write `PersonPicker`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import type { Metric, Person, Space } from "@/lib/people";

export type PickerTag = { kind: "space"; value: Space } | { kind: "metric"; value: Metric } | { kind: "invitee" };

function hasTag(p: Person, tag: PickerTag): boolean {
  if (tag.kind === "space") return p.spaces.includes(tag.value);
  if (tag.kind === "metric") return p.metrics.includes(tag.value);
  return p.invitee;
}

function tagPatch(p: Person, tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "space") return { spaces: [...p.spaces, tag.value] };
  if (tag.kind === "metric") return { metrics: [...p.metrics, tag.value] };
  return { invitee: true };
}

function tagCreate(tag: PickerTag): Record<string, unknown> {
  if (tag.kind === "space") return { spaces: [tag.value] };
  if (tag.kind === "metric") return { metrics: [tag.value] };
  return { invitee: true };
}

// Type a name: pick someone already on My People to tag them, or add a new
// person with the tag already applied. One person record, many features.
export default function PersonPicker({
  tag,
  people,
  onChange,
}: {
  tag: PickerTag;
  people: Person[];
  onChange: (person: Person) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? people
            .filter((p) => !hasTag(p, tag))
            .filter((p) => `${p.firstName} ${p.lastName ?? ""}`.toLowerCase().includes(q))
            .slice(0, 6)
        : [],
    [people, q, tag]
  );

  const send = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await leaderFetch("/api/people", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onChange(data.person as Person);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const [first, ...rest] = query.trim().split(/\s+/);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a name"
        disabled={busy}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      {q && (
        <ul className="panel divide-y divide-[var(--border)] text-sm">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => send("PATCH", { id: p.id, ...tagPatch(p, tag) })}
                className="w-full text-left px-3 py-2 text-gray-200 hover:text-white"
              >
                {p.firstName} {p.lastName}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              disabled={busy || !first}
              onClick={() => send("POST", { firstName: first, lastName: rest.join(" ") || null, ...tagCreate(tag) })}
              className="w-full text-left px-3 py-2 text-[var(--accent)]"
            >
              Add &ldquo;{query.trim()}&rdquo; to My People
            </button>
          </li>
        </ul>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
```

No page renders it yet. Confirm it compiles: `npx tsc --noEmit`.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/007_leader_people.sql src/lib/people.ts src/lib/people.test.ts src/app/api/people/route.ts src/components/people/PersonPicker.tsx scripts/check-auth.mjs
git commit -m "Add My People: private per-leader person list, API and picker"
```

---

### Task 9: Mobile pass, whole-branch review, handover

**Files:**
- Modify: `HANDOVER.md`

- [ ] **Step 1: Mobile pass**

In the browser pane, `resize_window` preset `mobile`. Check `/login` in all three modes, `/leaders`, `/leaders/training` (each phase), `/leaders/resources`. No horizontal scroll, the code input is usable, buttons reachable. Screenshot each. Reset with preset `desktop`.

- [ ] **Step 2: Full check run**

```bash
npx tsc --noEmit; npm test; npm run lint 2>&1 | tail -3
node --env-file=.env.local scripts/check-auth.mjs
node --env-file=.env.local scripts/check-checkins-api.mjs
node --env-file=.env.local scripts/check-training-api.mjs
node --env-file=.env.local scripts/check-network-api.mjs
node --env-file=.env.local scripts/check-network-signup.mjs
npm run build
npm run guard
```

Expected: all pass, build succeeds, guard `clean`.

- [ ] **Step 3: Whole-branch review**

The coordinator dispatches a separate reviewer with `git diff ef099fe..HEAD` saved to a file, the spec, and this plan. Focus: any leader route still reading the caller's email from input, any route that queries before `requireLeader`, swallowed Supabase errors, any change to save logic beyond the permitted swap. Fix rounds until clean.

- [ ] **Step 4: Update the handover**

In `HANDOVER.md`: section 2 gains `leader_people`; section 5 Authorisation leads with "Every leader route starts with `requireLeader(request)`; the caller's email comes only from the verified session"; section 7 items 1, 3, 8, 9 are marked done; add the pre-push checklist below.

- [ ] **Step 5: Commit**

```bash
git add HANDOVER.md
git commit -m "Update handover for real login, My People and the test-row guard"
```

## Pre-push checklist (Henry's go only)

| Item | Owner |
|---|---|
| Supabase Email provider on, Magic Link template shows `{{ .Token }}`, Site URL and localhost redirect set | Henry, or the coordinator in Henry's Chrome with his go-ahead |
| Migration 007 applied to production | Same |
| `npm run guard` clean | Coordinator |
| Henry has signed in locally with a real code at least once | Henry |
| Henry says "push" | Henry |

After the push, every leader is signed out once and signs back in with a code.
