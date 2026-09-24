# Church Health Admin View, Header Tidy and Leader Emails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tidy the dashboard header ("Leaders Hub" becomes "Dashboard"), give Henry a read-only Church Health tab on `/leaders/admin`, and build five branded leader emails (Sunday RPMS nudge, Monday "Your week" digest, monthly church health, monthly apprentice nudge, milestone celebrations) sent by an hourly Netlify Scheduled Function that stays in dry run until Henry says otherwise, with per-kind opt-outs and a one-click unsubscribe.

**Architecture:** Every rule that decides anything is a pure module with Vitest tests: `src/lib/melbourneDate.ts` (Melbourne calendar), `src/lib/churchHealth.ts` (aggregation), and under `src/lib/emails/`: `prefs.ts` (kinds, preferences, recipients, unsubscribe parsing), `schedule.ts` (which kinds are due at a UTC instant), `topic.ts` (this week's Pathways guide), `layout.ts` and `templates.ts` (table-based branded HTML plus plain text), `compose.ts` (who gets what from a data snapshot) and `engine.ts` (claim-then-send orchestration with injected database and mailer). Thin adapters touch the outside world: `loadSnapshot.ts` and `engineDb.ts` (Supabase), `netlify/functions/leader-emails.mts` (the schedule), four new route handlers, and three small UI pieces (Church Health tab, Email previews tab, Emails preferences panel). One migration file (`009_leader_emails.sql`) is written but not applied by implementers.

**Tech Stack:** Next.js 16 (App Router, React Compiler on), React 19, TypeScript, Tailwind 4, Vitest 4 (node environment, `src/**/*.test.ts` only, so components are checked by tsc, lint, build and the controller's browser pass), Supabase (service role on the server), nodemailer over Gmail SMTP (the existing `sendEmail` in `src/lib/email.ts`), Netlify Scheduled Functions (`@netlify/functions` types, added in Task 8), lucide-react.

**Spec (binding):** `docs/superpowers/specs/2026-09-24-church-health-emails-design.md`. House style follows `docs/superpowers/plans/2026-09-24-avenue-night-3.md`. Read the spec before starting any task.

## Global Constraints

- **Branch `feat/church-health-emails`.** It exists and holds the spec commit (`c614667`, from `main` at `1825655`).
- **Never `git push`.** Commit locally only. Henry says "push" when he wants a deploy (Netlify redeploy credits are limited).
- **Never `git add`** `HANDOVER.md`, `HANDOVER-v2.md`, `HANDOVER_PROMPT*.md` (any `HANDOVER*.md`), `.mcp.json`, `scripts/demo-network.mjs`. Always `git add` exact paths, never `git add -A` or `git add .`.
- **No email is sent by any implementer, test or dev run.** Tests mock the mailer. The scheduled function is in dry run unless the env var `LEADER_EMAILS_DRY_RUN` is exactly `false`; nobody sets that during this plan. The only real send is Task 11 Step 7: one test email to `henrymcmahon@avenuemission.com`, run by the controller, only after Henry says yes in chat.
- **The migration is not applied by implementers.** `supabase/migrations/009_leader_emails.sql` is written in Task 4. Applying it is Task 11 Step 3, run by the controller only after Henry's explicit go. Until then every code path that needs `leader_email_prefs` or `leader_email_log` fails loud with: `Leader email tables are missing. Apply supabase/migrations/009_leader_emails.sql first.` (from `emailTablesError`, Task 4).
- **Existing auth, saving and hooks are unchanged.** Do not edit `src/lib/auth.ts`, `src/lib/requireLeader.ts`, `src/lib/leaderAuth.ts`, `src/lib/leaderFetch.ts`, `src/lib/supabaseAdmin.ts`, `src/lib/journey.ts`, `src/lib/avenue.ts`, `src/lib/worksheets.ts`, `src/lib/useWorksheet.ts`, `src/lib/useMyPeople.ts`, `src/app/leaders/training/useTrainingProgress.ts`, `progressMerge.ts`, `useCheckins.ts`, `useNetworkView.ts`, `src/components/ui/ProfileCard.tsx`, or any existing `src/app/api/**` file. Reading and importing them is fine. The only existing files this plan edits are: the six header files (Task 1), `src/app/leaders/admin/page.tsx` (two tab entries, Tasks 3 and 10), `src/lib/email.ts` (additive `SendOptions` and `isEmailConfigured`, Task 6), `src/lib/apprentice.ts` and `src/app/leaders/training/Phase5Multiply.tsx` (rung labels move to the lib, Task 6), `src/components/avenue/HeaderAvatar.tsx` (the Emails panel under the profile card, Task 10), `scripts/guard-test-rows.mjs` (two new tables, Task 4), `package.json` / `package-lock.json` (Task 8). `netlify.toml` is not changed.
- **New routes and their guards.** `GET /api/admin/church-health` and `GET /api/admin/email-preview`: `isAdminAuthorized(request)` is the first line, 401 before any database call. `GET/PATCH /api/email-prefs`: `adminConfigError()` then `requireLeader(request)` (the house pattern of every existing leader route; the config check needs no session and reveals no data), before any other query; the email is only ever `auth.leader.email`. `GET/POST /api/email/unsubscribe`: no auth; the token must be a UUID; the only write is setting preference columns to `false` on the row whose `unsubscribe_token` matches; it never reads an email from the request.
- **Who can ever get an email:** a `leaders` row with `full_access = true`, minus anyone whose preference for that kind is `false`. `recipientsFor` (Task 4) is the one place this is decided, and the engine refuses to send to any address not in that set (Task 8).
- **Never use an em dash (U+2014)** anywhere: code, comments, email copy, UI copy, commit messages, this plan. Use a colon, a comma, or a new sentence. En dashes (U+2013) only in number ranges. In tests build an em dash with `String.fromCharCode(0x2014)`; never type one (the Write tool turns a backslash-u 2014 escape into the real character).
- **Copy.** Email and UI copy the plan writes carries `// Henry to check wording` on the line above it (or once above a block of copy). Henry reviews every email in the previews (Task 11) before any send.
- **Email HTML:** table-based layout, inline styles only, no `<style>` block, no web fonts, no remote images (the Avenue wordmark is text), 600 px max width, night ground `#05070c` with light text, Georgia serif headings, button `#4f7cff`, lamp accent `#ffc56b`, plus a plain-text alternative and RFC 8058 `List-Unsubscribe` and `List-Unsubscribe-Post` headers on every email.
- **Colour meaning in the app:** blue `#4f7cff` (`--accent`) = primary buttons; warm lamp `#ffc56b` (`--lamp`) = on, done, lit. The RPMS gauge colours (`--g-relational` and friends) appear only in the Church Health tab's Leader health section. No gradients.
- **Type in the app:** Newsreader (`font-serif`) for headings; Geist for everything else.
- **Mobile first at 375 px:** single column, 16 px side gutter, no horizontal page scroll (wide tables scroll inside their own `overflow-x-auto` box), every tap target at least 44 px, keyboard focus ring in lamp colour (`focus-visible:outline-[var(--lamp)]`, or inherited from `.avenue-night` / `.av-sheet`).
- **No staging DB.** Every fixture email ends in `@example.invalid`. `npm run guard` prints `clean` before and after any run that writes.
- **Gates at the end of every task** (the implementer runs 1 to 4; stop the dev server before 4 because it shares `.next`):
  1. `npx tsc --noEmit` prints nothing.
  2. `npm test`: 316 passing at the start of the branch; the count only goes up (each task states its expected count).
  3. `npm run lint`: 54 problems at the start. Never above 54. If the count drops, record the new number in the report; do not chase lint elsewhere.
  4. `npm run build` passes.
- **Commits** end with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Browser checks are the controller's job.** Implementers have no browser. Each UI task ends with a "Controller browser check" step listing exactly what to look at, at 375 px and desktop, with keyboard checks where the task adds controls.
- Use the Write tool for any file over a few lines; heredocs through Bash mangle backslashes. Keep scratch `.mjs` / `.txt` files out of `src/` and out of lint.

## Decisions made while planning (spec gaps)

| Where | Decision | Why |
|---|---|---|
| Spec 1, three header labels | On `resources`, `study-guides` and `support` the "Leaders Hub" header text is a plain `<span>`, not a link. It becomes a 44 px `Link` to `/leaders` reading "Dashboard". `network` and `workshops` already link, so only their text changes | Spec: "the five back links become Dashboard (still linking to /leaders)" |
| Spec 1, admin page | The admin page's own "Back to Hub" button is not one of the five and is left alone | Scope |
| Spec 2, who counts | Church totals, groups and health count only `leader_people` and `leader_checkins` rows whose owner is a `leaders` row (any access level). Every `leaders` row gets a By leader row | A deleted leader's orphan rows must not inflate totals |
| Spec 2, names | A leader's name is `leader_profiles.display_name`, else `leaders.name`, else the email | Same order the profile card uses |
| Spec 2, group label | Groups are keyed case-insensitively with spaces trimmed and collapsed. The label shown is the first spelling met, leaders sorted by email | Deterministic |
| Spec 2, month line | Last 12 Melbourne months ending this month. A month's count is every current person first recorded in or before that month | Spec: "a person counts from the month they were first recorded" |
| Spec 2, leader health | "Last four weeks" = check-ins with `week_start` from this Monday minus 21 days to this Monday. The 3+ weeks flag is on when there is no check-in or the latest `week_start` is 21 or more days before this Monday. Averages round to one decimal. Church-wide average = the mean over every check-in in that window | One definition used by the tab |
| Spec 2, row cap | Every admin read goes through `readRows`, which throws if a table returns 1000 rows (Supabase's default cap) rather than silently undercounting | Fail loud |
| Spec 3.2, timing | A kind is due from its Melbourne send hour until 23:59 that Melbourne day, not only in the exact hour, except milestones: due 07:00 to 09:59 only (the 08:00 and 09:00 runs are retries). Each run reads the log once per due kind, sends at most 20 emails, pauses 1 s before each claim after the first, and stops claiming 20 s after it starts; the log makes later runs skip what is done and pick up the rest | Netlify scheduled functions stop at 30 s, a missed hourly run must not lose a week's email, and spec says milestones are "checked daily 07:00" (no evening celebrations) |
| Spec 3.2, failed send | The log row is inserted first. If the send then throws, the row is deleted so a later run that day retries, and the failure is logged loud | A rejected SMTP send has not reached anyone; a stuck row would drop the email for good |
| Spec 3.2, milestones "since the last run" | Stateless via the log. The first live run for a leader writes `status = 'baseline'` rows for milestones they already had (plus a `baseline` marker) and sends nothing for them. Launch countdowns are never baselined. The log table gains `status text default 'sent'` (`sent` or `baseline`) | Without a baseline every existing leader would get "You walked Foundations" on day one |
| Spec 3.2, launch countdown key | `launch-<launchDate>-<30|7|1>d`, sent only on the exact Melbourne day | Changing the launch date gets a fresh countdown |
| Spec 3.2, RPMS "last week" | The check-in with `week_start` = this week's Monday minus 7 days | On Sunday the week being reflected on is the current one |
| Spec 3.2, digest trend | The four weeks before this Monday, each the mean of the four gauges, or "No check-in" | On Monday 07:00 this week's check-in cannot exist yet |
| Spec 3.2, church health "change vs last month" | Count now minus the count of people recorded before the 1st of the previous month, shown as "this past month" | On the 1st, that is the growth during the month just ended |
| Spec 3.2, apprentice | Every `network_people` row whose `sent_out_by` is the leader's own network node (matched by email), including step 0 ("Not started yet"). The rung labels move from `Phase5Multiply.tsx` to `src/lib/apprentice.ts` so the email and the app share one list | One source of truth |
| Spec 3.2, digest topic | Title = guide `topic`, else `series`; passage = `scripture`; link = `pdf_url`, else `/leaders/study-guides` | The table has no single "link" column |
| Spec 3.2, links | Every link is absolute on `AVENUE_SITE_URL` (env, trailing slash trimmed), default `https://www.avenuemission.com`. "Manage emails" goes to a new small page `/leaders/emails` | A profile panel has no URL of its own |
| Spec 3.2, unsubscribe | `GET` shows a one-button confirm page and writes nothing; `POST` (the button, and mail clients' RFC 8058 one-click) turns the setting off. Unknown token: 404 page. Repeat: same success page (idempotent) | Mail scanners (Outlook Safe Links and others) prefetch every `GET` link; a `GET` that writes would silently unsubscribe leaders. Henry can ask for `GET` to write directly |
| Spec 3.2, footer | Two unsubscribe links: "Unsubscribe from these" (`kind=<this kind>`) and "Unsubscribe from all" (`kind=all`). The header carries the per-kind one | Spec allows both |
| Spec 3.2, sending | `sendEmail` gains an optional fourth argument `{ text, headers }`; existing callers are untouched. The engine refuses to start a live run when `GMAIL_USER` or `GMAIL_APP_PASSWORD` is missing, instead of `sendEmail`'s silent return | Fail loud without changing old behaviour |
| Spec 3.3, dry run flag | Env var `LEADER_EMAILS_DRY_RUN`; live only when exactly `false` | A generic `DRY_RUN` could collide with other tooling |
| Spec 3.3, function bundling | `netlify/functions/leader-emails.mts` imports `src/lib` by relative path; those modules use the `@/` alias, which esbuild resolves from `tsconfig.json` `paths`. Netlify always bundles TypeScript (`.mts`) functions with esbuild, so `netlify.toml` is not touched. Task 11 proves the bundle locally and that no `next` or `react` import is in it | No surprise at deploy, no change to the live site's deploy config |
| Spec 3.3, function Supabase client | The function builds its own service-role client with `createClient` (same env vars, fail loud) rather than `getSupabaseAdmin`, which imports `next/server` | Keeps Next out of the function bundle |
| Spec 3.3, preview | `GET /api/admin/email-preview` returns JSON `{ subject, html, text, periodKey, note }`. A new "Email previews" admin tab shows it in a sandboxed iframe. Previews always carry `PREVIEW_TOKEN`, never the leader's real unsubscribe token. If a leader has no milestone due, it previews a sample (Foundations walked) with a note; if they have no apprentices it says the email would be skipped | A Bearer-guarded route cannot be opened as a bare URL |
| Spec 3.4, where the toggles live | A new `EmailPrefsPanel` component, shown under the profile card in the header avatar's sheet and on `/leaders/emails`. `ProfileCard.tsx` is not edited | ProfileCard is protected by earlier rounds |
| Spec 3.1, extra constraints | `unsubscribe_token` is also `unique`; the boolean columns are `not null default true`; `kind` has a check constraint | Stronger than the spec's minimum, same meaning |
| Spec 4, guard | `scripts/guard-test-rows.mjs` also checks `leader_email_prefs.email` and `leader_email_log.email`, skipping them while the tables do not exist | Fixture rows must never survive in production |

## Pre-flight rulings

From the pre-flight scan (`.superpowers/sdd/church-health-emails/preflight.md`), already folded into the tasks below. Verified on a scratch copy: 453 tests, tsc clean apart from `@netlify/functions`, lint clean on new files, the function bundle imports only `@supabase/supabase-js` and `nodemailer`.

| # | Ruling | Where |
|---|---|---|
| F1 | Engine time budget (`RUN_BUDGET_MS = 20_000`, injected `clock`): nothing new is claimed or baselined once spent. The pause between sends comes before the claim | Task 8 engine, runScheduled |
| F2 | `hasLog` replaced by `loggedKeys(kind, periodKey)`: one log read per due kind; only unlogged items are claimed; fails loud at the row cap | Task 8 engine, engineDb |
| F3 | Milestones due 07:00 to 09:59 Melbourne only (`LAST_HOUR`), matching spec "checked daily 07:00" | Task 5 schedule |
| F4 | The engine sends only to one plain address in the full-access set; anything else is refused before compose | Task 8 engine |
| F5 | `isHttpUrl`: a non-web guide link falls back to the guides page; `renderEmail` throws on any non-http(s) link or button | Tasks 6, 7 |
| F6 | Admin previews always use `PREVIEW_TOKEN`, never a leader's real token | Task 10 |
| F7 | `netlify.toml` is not edited (Netlify always bundles `.mts` with esbuild) | Task 8, constraints |
| F8 | Bundle check also greps for `next` / `react` imports (expected 0) | Task 11 Step 8 |
| F9 | Lamp focus ring on the network and workshops back links | Task 1 |
| F10 | File map lists `runScheduled.ts`, its test and `noticePage.ts` | File map |
| F11 | email-prefs guard order stated as the house pattern: `adminConfigError()` then `requireLeader` | Global Constraints |
| F12 | Not applied (spec wording): GET unsubscribe confirm page kept; Henry to confirm | Controller |

## File map

| File | Status | Task | Responsibility |
|---|---|---|---|
| `src/app/leaders/page.tsx` | Modify | 1 | Remove the "Leaders Hub" header label |
| `src/app/leaders/network/page.tsx` | Modify | 1 | Back link text "Dashboard" |
| `src/app/leaders/resources/page.tsx` | Modify | 1 | Header label becomes a "Dashboard" link |
| `src/app/leaders/study-guides/page.tsx` | Modify | 1 | Header label becomes a "Dashboard" link |
| `src/app/leaders/support/page.tsx` | Modify | 1 | Header label becomes a "Dashboard" link |
| `src/app/leaders/workshops/page.tsx` | Modify | 1 | Back button text "Dashboard" |
| `src/lib/melbourneDate.ts` | Create | 2 | Melbourne date parts, ISO day and month arithmetic, labels |
| `src/lib/melbourneDate.test.ts` | Create | 2 | Tests incl. daylight saving |
| `src/lib/churchHealth.ts` | Create | 2 | `buildChurchHealth`, `countMetrics`, `averageScores`, `linePoints`, labels |
| `src/lib/churchHealth.test.ts` | Create | 2 | Tests |
| `src/test/fakeSupabase.ts` | Create | 3 | Recording stand-in for the Supabase query builder (route and adapter tests) |
| `src/lib/adminRead.ts` | Create | 3 | `readRows`: a whole-table read that fails loud on error or on the row cap |
| `src/lib/adminRead.test.ts` | Create | 3 | Tests |
| `src/app/api/admin/church-health/route.ts` | Create | 3 | Admin-key read route |
| `src/app/api/admin/church-health/route.test.ts` | Create | 3 | Tests |
| `src/components/admin/ChurchHealthTab.tsx` | Create | 3 | The four sections |
| `src/app/leaders/admin/page.tsx` | Modify | 3, 10 | Two new tab entries |
| `supabase/migrations/009_leader_emails.sql` | Create | 4 | Prefs and log tables (NOT applied by implementers) |
| `src/lib/emails/prefs.ts` | Create | 4 | Kinds, prefs, recipients, patch and unsubscribe parsing, missing-table message |
| `src/lib/emails/prefs.test.ts` | Create | 4 | Tests |
| `scripts/guard-test-rows.mjs` | Modify | 4 | Two new tables |
| `src/lib/emails/schedule.ts` | Create | 5 | `dueKinds`, `periodKeyFor`, `SEND_HOUR`, `LAST_HOUR` |
| `src/lib/emails/schedule.test.ts` | Create | 5 | Tests incl. daylight saving boundaries |
| `src/lib/emails/topic.ts` | Create | 5 | `parseGuideDate`, `topicForWeek` |
| `src/lib/emails/topic.test.ts` | Create | 5 | Tests |
| `src/lib/email.ts` | Modify | 6 | Additive `SendOptions`, `isEmailConfigured` |
| `src/lib/apprentice.ts` | Modify | 6 | `APPRENTICE_STEPS`, `apprenticeStepLabel`, `APPRENTICE_HOW_TO` |
| `src/lib/apprentice.test.ts` | Modify | 6 | One new test |
| `src/app/leaders/training/Phase5Multiply.tsx` | Modify | 6 | Import the rung labels instead of declaring them |
| `src/lib/emails/layout.ts` | Create | 6 | Links, headers, escaping, web-link check, blocks, HTML layout, plain text |
| `src/lib/emails/layout.test.ts` | Create | 6 | Tests |
| `src/lib/emails/templates.ts` | Create | 6 | Five templates and the `Milestone` type |
| `src/lib/emails/templates.test.ts` | Create | 6 | Tests |
| `src/lib/emails/compose.ts` | Create | 7 | `Snapshot`, `progressFor`, `milestonesFor`, `milestoneKey`, `composeFor` |
| `src/lib/emails/compose.test.ts` | Create | 7 | Tests |
| `src/lib/emails/engine.ts` | Create | 8 | `runLeaderEmails` |
| `src/lib/emails/engine.test.ts` | Create | 8 | Tests |
| `src/lib/emails/engineDb.ts` | Create | 8 | Supabase adapter: `ensurePrefs`, `loggedKeys`, `claim`, `release` |
| `src/lib/emails/engineDb.test.ts` | Create | 8 | Tests |
| `src/lib/emails/loadSnapshot.ts` | Create | 8 | Reads the nine tables into a `Snapshot` |
| `src/lib/emails/loadSnapshot.test.ts` | Create | 8 | Tests |
| `src/lib/emails/runScheduled.ts` | Create | 8 | Wires the engine to Supabase, Gmail and the clock; dry-run flag; loud config failures |
| `src/lib/emails/runScheduled.test.ts` | Create | 8 | Tests the dry-run flag and loud failures |
| `netlify/functions/leader-emails.mts` | Create | 8 | Hourly scheduled function (calls `runScheduled`) |
| `package.json`, `package-lock.json` | Modify | 8 | `@netlify/functions` dev dependency |
| `src/app/api/email-prefs/route.ts` | Create | 9 | Leader's own preferences |
| `src/app/api/email-prefs/route.test.ts` | Create | 9 | Tests |
| `src/lib/emails/noticePage.ts` | Create | 9 | Branded HTML page for the unsubscribe route |
| `src/app/api/email/unsubscribe/route.ts` | Create | 9 | Token unsubscribe |
| `src/app/api/email/unsubscribe/route.test.ts` | Create | 9 | Tests |
| `src/app/api/admin/email-preview/route.ts` | Create | 10 | Admin-key preview |
| `src/app/api/admin/email-preview/route.test.ts` | Create | 10 | Tests |
| `src/components/admin/EmailPreviewTab.tsx` | Create | 10 | Preview picker and iframe |
| `src/components/ui/EmailPrefsPanel.tsx` | Create | 10 | Five toggles |
| `src/components/avenue/HeaderAvatar.tsx` | Modify | 10 | Panel under the profile card |
| `src/app/leaders/emails/page.tsx` | Create | 10 | "Manage emails" landing page |

## Task list

| # | Task | Tests after |
|---|---|---|
| 1 | Header tidy: "Leaders Hub" becomes "Dashboard" | 316 |
| 2 | Melbourne dates and church health aggregation (pure, TDD) | 338 |
| 3 | Church health route and admin tab | 346 |
| 4 | Migration 009 (unapplied) and email preference rules (TDD) | 359 |
| 5 | Schedule and this week's topic (pure, TDD) | 378 |
| 6 | Branded layout and the five templates (TDD) | 397 |
| 7 | Compose: who gets what from a snapshot (TDD) | 409 |
| 8 | Engine, adapters and the scheduled function (TDD) | 433 |
| 9 | Preference and unsubscribe routes (TDD) | 447 |
| 10 | Email previews tab, Emails panel and `/leaders/emails` | 453 |
| 11 | Final pass (controller-run, gated steps) | 453 |

---

### Task 1: Header tidy: "Leaders Hub" becomes "Dashboard"

**Files:**
- Modify: `src/app/leaders/page.tsx` (header, about line 152 to 155)
- Modify: `src/app/leaders/network/page.tsx` (back link, about line 116 to 122)
- Modify: `src/app/leaders/resources/page.tsx` (header label, about line 192 to 194)
- Modify: `src/app/leaders/study-guides/page.tsx` (header label, about line 122 to 124)
- Modify: `src/app/leaders/support/page.tsx` (header label, about line 222 to 224)
- Modify: `src/app/leaders/workshops/page.tsx` (back button, about line 103 to 105)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing other tasks rely on. After this task `grep -rn "Leaders Hub" src` prints nothing.

This task is presentation only; it has no unit test (Vitest runs `.test.ts` files only). The gates and the controller's browser check verify it.

- [ ] **Step 1: Dashboard header: remove the label**

In `src/app/leaders/page.tsx` replace:

```tsx
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2 sm:px-6">
          <span className="text-sm font-semibold text-[var(--ink)]">Leaders Hub</span>
          <div className="flex items-center gap-3">
```

with:

```tsx
        <div className="mx-auto flex max-w-4xl items-center justify-end px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
```

(`justify-end` keeps Logout and the avatar at the right now that the left item is gone.)

- [ ] **Step 2: Network back link text**

In `src/app/leaders/network/page.tsx` replace:

```tsx
          <Link
            href="/leaders"
            className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Leaders Hub
          </Link>
```

with:

```tsx
          <Link
            href="/leaders"
            className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
```

(The network page is not inside `.avenue-night`, so the lamp focus ring is set on the link itself.)

- [ ] **Step 3: The three header labels become links**

In each of `src/app/leaders/resources/page.tsx`, `src/app/leaders/study-guides/page.tsx` and `src/app/leaders/support/page.tsx` replace:

```tsx
              <span className="text-white text-lg font-semibold uppercase tracking-wider">
                Leaders Hub
              </span>
```

with:

```tsx
              <Link
                href="/leaders"
                className="inline-flex min-h-[44px] items-center text-white text-lg font-semibold uppercase tracking-wider transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
              >
                Dashboard
              </Link>
```

All three files already `import Link from "next/link";` (line 6). Leave their "Back to Dashboard" links below the header as they are.

- [ ] **Step 4: Workshops back button text**

In `src/app/leaders/workshops/page.tsx` replace:

```tsx
            <button onClick={() => router.push("/leaders")} className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Leaders Hub
            </button>
```

with:

```tsx
            <button
              onClick={() => router.push("/leaders")}
              className="inline-flex min-h-[44px] items-center text-gray-400 hover:text-white transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
            >
              ← Dashboard
            </button>
```

- [ ] **Step 5: Nothing left**

Run: `grep -rn "Leaders Hub" src`
Expected: no output.

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 316 tests pass; lint at most 54 problems; build passes.

- [ ] **Step 7: Commit**

```bash
git add src/app/leaders/page.tsx src/app/leaders/network/page.tsx src/app/leaders/resources/page.tsx src/app/leaders/study-guides/page.tsx src/app/leaders/support/page.tsx src/app/leaders/workshops/page.tsx
git commit -m "Header tidy: Leaders Hub label removed, back links read Dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Controller browser check**

At 375 px and desktop, signed in as a fixture leader:
- `/leaders`: the header shows only Logout and the avatar, at the right; no "Leaders Hub" anywhere; nothing overflows.
- `/leaders/network`: top-left link reads "Dashboard", goes to `/leaders`, is at least 44 px tall, and Tab reaches it with a lamp-colour focus ring.
- `/leaders/resources`, `/leaders/study-guides`, `/leaders/support`: the header's left item reads "Dashboard", is a link to `/leaders`, is at least 44 px tall, and Tab reaches it with a lamp-colour focus ring.
- `/leaders/workshops` (admin): the back button reads "← Dashboard", is at least 44 px tall, and shows the lamp-colour focus ring.

---

### Task 2: Melbourne dates and church health aggregation (pure, TDD)

**Files:**
- Create: `src/lib/melbourneDate.ts`
- Test: `src/lib/melbourneDate.test.ts`
- Create: `src/lib/churchHealth.ts`
- Test: `src/lib/churchHealth.test.ts`

**Interfaces:**
- Consumes: `METRICS`, `Metric` from `src/lib/people.ts`; `GaugeScores` from `src/lib/rpms.ts`.
- Produces (`src/lib/melbourneDate.ts`):
  - `interface MelbourneParts { date: string; year: number; month: number; day: number; hour: number; weekday: number }` (`date` is `YYYY-MM-DD`, `month` 1 to 12, `hour` 0 to 23, `weekday` 0 Sunday to 6 Saturday)
  - `melbourneParts(now: Date): MelbourneParts`
  - `melbourneDateOf(instant: string | Date): string`
  - `addDaysISO(iso: string, days: number): string`
  - `daysBetweenISO(from: string, to: string): number` (`to` minus `from`, in days)
  - `mondayOfISO(iso: string): string`
  - `monthKeyOf(iso: string): string` (`YYYY-MM`)
  - `addMonthsKey(key: string, months: number): string`
  - `monthLabel(key: string): string` ("October 2026")
  - `dayMonthLabel(iso: string): string` ("5 October")
- Produces (`src/lib/churchHealth.ts`):
  - `type MetricCounts = Record<Metric, number>`
  - `METRIC_LABELS: Record<Metric, string>`, `NO_GROUP = "No group set"`, `STALE_DAYS = 21`, `MONTHS_SHOWN = 12`
  - Row types `HealthLeaderRow { email; name: string | null; full_access: boolean }`, `HealthProfileRow { email; display_name: string | null; pathway_group: string | null }`, `HealthPersonRow { owner_email; first_name; last_name: string | null; metrics: string[] | null; created_at: string }`, `HealthCheckinRow extends GaugeScores { email; week_start: string }`
  - `interface ChurchHealth { asOf; totals; monthly: { month; counts }[]; groups: { group; leaders; counts }[]; leaders: LeaderCounts[]; health: LeaderHealth[]; churchAverages: GaugeScores | null }`
  - `buildChurchHealth(input: { leaders; profiles; people; checkins; now: Date }): ChurchHealth`
  - `normEmail(email: string): string`, `emptyCounts(): MetricCounts`, `countMetrics(rows: { metrics: string[] | null }[]): MetricCounts`, `fullName(p: { first_name: string; last_name: string | null }): string`, `averageScores(rows: GaugeScores[]): GaugeScores | null`, `linePoints(values: number[], width: number, height: number, max: number): string`

- [ ] **Step 1: Write the failing Melbourne date tests**

Create `src/lib/melbourneDate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  addMonthsKey,
  dayMonthLabel,
  daysBetweenISO,
  melbourneDateOf,
  melbourneParts,
  mondayOfISO,
  monthLabel,
} from "./melbourneDate";

describe("melbourneParts", () => {
  it("reads Melbourne time in standard time (AEST, UTC+10)", () => {
    expect(melbourneParts(new Date("2026-09-27T08:00:00Z"))).toEqual({
      date: "2026-09-27",
      year: 2026,
      month: 9,
      day: 27,
      hour: 18,
      weekday: 0,
    });
  });

  it("jumps from 1:59 to 3:00 when daylight saving starts on 4 October 2026", () => {
    expect(melbourneParts(new Date("2026-10-03T15:59:00Z"))).toMatchObject({ date: "2026-10-04", hour: 1 });
    expect(melbourneParts(new Date("2026-10-03T16:00:00Z"))).toMatchObject({ date: "2026-10-04", hour: 3 });
  });

  it("is already tomorrow in Melbourne while UTC is still today", () => {
    expect(melbourneParts(new Date("2026-09-30T21:00:00Z"))).toMatchObject({
      date: "2026-10-01",
      day: 1,
      hour: 7,
      weekday: 4,
    });
  });

  it("rolls the year at Melbourne midnight", () => {
    expect(melbourneParts(new Date("2026-12-31T13:00:00Z"))).toMatchObject({
      date: "2027-01-01",
      year: 2027,
      month: 1,
      hour: 0,
      weekday: 5,
    });
  });

  it("throws on an invalid date", () => {
    expect(() => melbourneParts(new Date("not a date"))).toThrow("invalid date");
  });
});

describe("ISO date arithmetic", () => {
  it("adds days across months, years and a leap day", () => {
    expect(addDaysISO("2026-09-28", -7)).toBe("2026-09-21");
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysISO("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("counts whole days, ignoring the daylight saving hour", () => {
    expect(daysBetweenISO("2026-10-03", "2026-10-05")).toBe(2);
    expect(daysBetweenISO("2026-10-05", "2026-10-03")).toBe(-2);
  });

  it("finds the Monday of the week, Sunday belonging to the week before", () => {
    expect(mondayOfISO("2026-09-27")).toBe("2026-09-21");
    expect(mondayOfISO("2026-09-28")).toBe("2026-09-28");
    expect(mondayOfISO("2026-09-30")).toBe("2026-09-28");
  });

  it("throws on a date that is not YYYY-MM-DD", () => {
    expect(() => addDaysISO("27/09/2026", 1)).toThrow("Not a YYYY-MM-DD date");
  });

  it("moves month keys across years", () => {
    expect(addMonthsKey("2026-01", -11)).toBe("2025-02");
    expect(addMonthsKey("2026-12", 1)).toBe("2027-01");
    expect(addMonthsKey("2026-10", 0)).toBe("2026-10");
  });

  it("labels months and days in words", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(dayMonthLabel("2026-10-05")).toBe("5 October");
  });

  it("gives the Melbourne calendar date of a UTC timestamp", () => {
    expect(melbourneDateOf("2025-11-30T14:30:00Z")).toBe("2025-12-01");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/melbourneDate.test.ts`
Expected: FAIL, "Failed to resolve import ./melbourneDate".

- [ ] **Step 3: Write `src/lib/melbourneDate.ts`**

```ts
// Melbourne calendar helpers. Pure. Every leader is in Melbourne, so
// "today", "this week" and "this month" are Melbourne's. Daylight saving
// comes from the platform's time zone database, never a fixed +10 or +11.
// Calendar dates are plain "YYYY-MM-DD" strings and day arithmetic runs in
// UTC on those strings, so it never drifts by an hour or a day.

export interface MelbourneParts {
  date: string; // YYYY-MM-DD
  year: number;
  month: number; // 1 to 12
  day: number;
  hour: number; // 0 to 23
  weekday: number; // 0 Sunday to 6 Saturday
}

const FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Australia/Melbourne",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export function melbourneParts(now: Date): MelbourneParts {
  if (Number.isNaN(now.getTime())) throw new Error("melbourneParts: invalid date");
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of FORMAT.formatToParts(now)) parts[part.type] = part.value;
  const weekday = parts.weekday === undefined ? undefined : WEEKDAYS[parts.weekday];
  if (!parts.year || !parts.month || !parts.day || !parts.hour || weekday === undefined) {
    throw new Error("melbourneParts: could not read the Melbourne date");
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some engines print midnight as "24" even with h23.
    hour: Number(parts.hour) % 24,
    weekday,
  };
}

export function melbourneDateOf(instant: string | Date): string {
  return melbourneParts(new Date(instant)).date;
}

function utcOf(iso: string): number {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isoOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  return isoOf(utcOf(iso) + days * DAY_MS);
}

// `to` minus `from`, in whole days.
export function daysBetweenISO(from: string, to: string): number {
  return Math.round((utcOf(to) - utcOf(from)) / DAY_MS);
}

// Weeks run Monday to Sunday, matching leader_checkins.week_start.
export function mondayOfISO(iso: string): string {
  const dow = new Date(utcOf(iso)).getUTCDay();
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow);
}

export function monthKeyOf(iso: string): string {
  utcOf(iso);
  return iso.slice(0, 7);
}

export function addMonthsKey(key: string, months: number): string {
  const m = MONTH_KEY.exec(key);
  if (!m) throw new Error(`Not a YYYY-MM month: ${key}`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const m = MONTH_KEY.exec(key);
  if (!m) throw new Error(`Not a YYYY-MM month: ${key}`);
  return `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
}

export function dayMonthLabel(iso: string): string {
  utcOf(iso);
  return `${Number(iso.slice(8, 10))} ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]}`;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/melbourneDate.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Write the failing church health tests**

Create `src/lib/churchHealth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  averageScores,
  buildChurchHealth,
  countMetrics,
  linePoints,
  NO_GROUP,
  type HealthCheckinRow,
  type HealthLeaderRow,
  type HealthPersonRow,
  type HealthProfileRow,
} from "./churchHealth";

const ANN = "ann@example.invalid";
const BEN = "ben@example.invalid";
const CAT = "cat@example.invalid";
const GONE = "gone@example.invalid";

// Thursday 1 October 2026, 10:00 in Melbourne. This Monday is 28 September;
// the four-week window starts 7 September.
const NOW = new Date("2026-10-01T00:00:00Z");

const leaders: HealthLeaderRow[] = [
  { email: CAT, name: null, full_access: false },
  { email: " Ben@Example.invalid ", name: "Ben Ray", full_access: true },
  { email: ANN, name: "Ann", full_access: true },
];

const profiles: HealthProfileRow[] = [
  { email: ANN, display_name: "Ann Lee", pathway_group: " North  Side " },
  { email: BEN, display_name: null, pathway_group: "north side" },
];

const people: HealthPersonRow[] = [
  { owner_email: ANN, first_name: "Zoe", last_name: null, metrics: ["pathways"], created_at: "2026-01-10T00:00:00Z" },
  {
    owner_email: ANN,
    first_name: "Sam",
    last_name: "Hill",
    metrics: ["pathways", "streetlights"],
    created_at: "2026-09-15T00:00:00Z",
  },
  // 1:30 am on 1 December in Melbourne, so it counts from December.
  { owner_email: BEN, first_name: "Al", last_name: "Brown", metrics: ["intersections"], created_at: "2025-11-30T14:30:00Z" },
  // Owner is not a leader any more: counted nowhere.
  { owner_email: GONE, first_name: "Old", last_name: null, metrics: ["pathways"], created_at: "2026-02-01T00:00:00Z" },
];

const score = (email: string, week_start: string, n: number): HealthCheckinRow => ({
  email,
  week_start,
  relational: n,
  physical: n,
  mental: n,
  spiritual: n,
});

const checkins: HealthCheckinRow[] = [
  score(ANN, "2026-09-28", 8),
  score(ANN, "2026-09-21", 6),
  score(ANN, "2026-08-31", 2), // before the window
  score(BEN, "2026-09-07", 5), // first week of the window, 21 days ago
  score(GONE, "2026-09-28", 1), // not a leader
];

const build = () => buildChurchHealth({ leaders, profiles, people, checkins, now: NOW });

describe("buildChurchHealth", () => {
  it("counts each current person once per metric, leaders' people only", () => {
    const health = build();
    expect(health.asOf).toBe("2026-10-01");
    expect(health.totals).toEqual({ pathways: 2, intersections: 1, streetlights: 1 });
  });

  it("builds twelve Melbourne months ending this month from record dates", () => {
    const { monthly } = build();
    expect(monthly).toHaveLength(12);
    expect(monthly[0]).toEqual({ month: "2025-11", counts: { pathways: 0, intersections: 0, streetlights: 0 } });
    expect(monthly[1]).toEqual({ month: "2025-12", counts: { pathways: 0, intersections: 1, streetlights: 0 } });
    expect(monthly[2]).toEqual({ month: "2026-01", counts: { pathways: 1, intersections: 1, streetlights: 0 } });
    expect(monthly[10]).toEqual({ month: "2026-09", counts: { pathways: 2, intersections: 1, streetlights: 1 } });
    expect(monthly[11].month).toBe("2026-10");
  });

  it("groups pathway groups case-insensitively and puts No group set last", () => {
    expect(build().groups).toEqual([
      { group: "North Side", leaders: 2, counts: { pathways: 2, intersections: 1, streetlights: 1 } },
      { group: NO_GROUP, leaders: 1, counts: { pathways: 0, intersections: 0, streetlights: 0 } },
    ]);
  });

  it("gives one row per leader, sorted by name, with the names behind each count", () => {
    const rows = build().leaders;
    expect(rows.map((r) => r.name)).toEqual(["Ann Lee", "Ben Ray", CAT]);
    expect(rows[0]).toMatchObject({
      email: ANN,
      group: "North Side",
      counts: { pathways: 2, intersections: 0, streetlights: 1 },
      names: { pathways: ["Sam Hill", "Zoe"], intersections: [], streetlights: ["Sam Hill"] },
    });
    expect(rows[1].email).toBe(BEN);
    expect(rows[2].group).toBe(NO_GROUP);
  });

  it("reports each leader's last check-in, four-week averages and the 3+ weeks flag", () => {
    const [ann, ben, cat] = build().health;
    expect(ann).toEqual({
      email: ANN,
      name: "Ann Lee",
      lastCheckin: "2026-09-28",
      weeksSince: 0,
      averages: { relational: 7, physical: 7, mental: 7, spiritual: 7 },
      stale: false,
    });
    expect(ben).toMatchObject({ lastCheckin: "2026-09-07", weeksSince: 3, stale: true });
    expect(ben.averages).toEqual({ relational: 5, physical: 5, mental: 5, spiritual: 5 });
    expect(cat).toMatchObject({ lastCheckin: null, weeksSince: null, averages: null, stale: true });
  });

  it("averages the whole church over the four-week window only", () => {
    expect(build().churchAverages).toEqual({ relational: 6.3, physical: 6.3, mental: 6.3, spiritual: 6.3 });
  });

  it("is all zeros and nulls with no data", () => {
    const empty = buildChurchHealth({ leaders: [], profiles: [], people: [], checkins: [], now: NOW });
    expect(empty.totals).toEqual({ pathways: 0, intersections: 0, streetlights: 0 });
    expect(empty.groups).toEqual([]);
    expect(empty.leaders).toEqual([]);
    expect(empty.churchAverages).toBeNull();
    expect(empty.monthly).toHaveLength(12);
  });
});

describe("helpers", () => {
  it("countMetrics ignores unknown, repeated and missing metrics", () => {
    expect(countMetrics([{ metrics: ["pathways", "pathways", "bogus"] }, { metrics: null }])).toEqual({
      pathways: 1,
      intersections: 0,
      streetlights: 0,
    });
  });

  it("averageScores is null for no rows and rounds to one decimal", () => {
    expect(averageScores([])).toBeNull();
    expect(
      averageScores([
        { relational: 1, physical: 2, mental: 3, spiritual: 4 },
        { relational: 2, physical: 2, mental: 4, spiritual: 4 },
        { relational: 2, physical: 3, mental: 4, spiritual: 5 },
      ])
    ).toEqual({ relational: 1.7, physical: 2.3, mental: 3.7, spiritual: 4.3 });
  });

  it("linePoints scales values into the box, top at zero", () => {
    expect(linePoints([0, 5, 10], 100, 50, 10)).toBe("0,50 50,25 100,0");
    expect(linePoints([3], 100, 50, 3)).toBe("0,0");
    expect(linePoints([], 100, 50, 10)).toBe("");
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run src/lib/churchHealth.test.ts`
Expected: FAIL, "Failed to resolve import ./churchHealth".

- [ ] **Step 7: Write `src/lib/churchHealth.ts`**

```ts
// Church health for the admin tab (spec 2026-09-24 church health emails,
// section 2). Pure: the route loads rows and calls buildChurchHealth.
// History is reconstructed from record dates: a person counts from the
// Melbourne month their leader_people row was created, and a removed person
// is no longer counted anywhere. Only rows owned by a `leaders` row count.
import { METRICS, type Metric } from "@/lib/people";
import type { GaugeScores } from "@/lib/rpms";
import {
  addDaysISO,
  addMonthsKey,
  daysBetweenISO,
  melbourneDateOf,
  melbourneParts,
  mondayOfISO,
  monthKeyOf,
} from "@/lib/melbourneDate";

export type MetricCounts = Record<Metric, number>;

// Henry to check wording
export const METRIC_LABELS: Record<Metric, string> = {
  pathways: "Pathways",
  intersections: "Intersections",
  streetlights: "Streetlights",
};

// Henry to check wording
export const NO_GROUP = "No group set";

// No check-in with a week_start this many days before this Monday or
// earlier raises the "no check-in for 3+ weeks" flag. It is also the span of
// the four-week window: this Monday and the three before it.
export const STALE_DAYS = 21;
export const MONTHS_SHOWN = 12;

export interface HealthLeaderRow {
  email: string;
  name: string | null;
  full_access: boolean;
}

export interface HealthProfileRow {
  email: string;
  display_name: string | null;
  pathway_group: string | null;
}

export interface HealthPersonRow {
  owner_email: string;
  first_name: string;
  last_name: string | null;
  metrics: string[] | null;
  created_at: string;
}

export interface HealthCheckinRow extends GaugeScores {
  email: string;
  week_start: string;
}

export interface LeaderCounts {
  email: string;
  name: string;
  group: string;
  counts: MetricCounts;
  names: Record<Metric, string[]>;
}

export interface LeaderHealth {
  email: string;
  name: string;
  lastCheckin: string | null;
  weeksSince: number | null;
  averages: GaugeScores | null;
  stale: boolean;
}

export interface ChurchHealth {
  asOf: string;
  totals: MetricCounts;
  monthly: { month: string; counts: MetricCounts }[];
  groups: { group: string; leaders: number; counts: MetricCounts }[];
  leaders: LeaderCounts[];
  health: LeaderHealth[];
  churchAverages: GaugeScores | null;
}

export interface ChurchHealthInput {
  leaders: HealthLeaderRow[];
  profiles: HealthProfileRow[];
  people: HealthPersonRow[];
  checkins: HealthCheckinRow[];
  now: Date;
}

export function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emptyCounts(): MetricCounts {
  return { pathways: 0, intersections: 0, streetlights: 0 };
}

export function countMetrics(rows: { metrics: string[] | null }[]): MetricCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    for (const metric of new Set(row.metrics ?? [])) {
      if ((METRICS as readonly string[]).includes(metric)) counts[metric as Metric] += 1;
    }
  }
  return counts;
}

function groupKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function fullName(p: { first_name: string; last_name: string | null }): string {
  return [p.first_name.trim(), (p.last_name ?? "").trim()].filter(Boolean).join(" ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function averageScores(rows: GaugeScores[]): GaugeScores | null {
  if (rows.length === 0) return null;
  const avg = (key: keyof GaugeScores) => round1(rows.reduce((sum, r) => sum + r[key], 0) / rows.length);
  return { relational: avg("relational"), physical: avg("physical"), mental: avg("mental"), spiritual: avg("spiritual") };
}

// SVG polyline points for a small line chart: x spread evenly across
// `width`, y from `height` (zero) up to 0 (`max`).
export function linePoints(values: number[], width: number, height: number, max: number): string {
  if (values.length === 0) return "";
  const top = Math.max(max, 1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => `${round1(i * step)},${round1(height - (Math.min(Math.max(v, 0), top) / top) * height)}`)
    .join(" ");
}

export function buildChurchHealth(input: ChurchHealthInput): ChurchHealth {
  const today = melbourneParts(input.now).date;
  const thisMonday = mondayOfISO(today);
  const windowStart = addDaysISO(thisMonday, -STALE_DAYS);
  const inWindow = (c: HealthCheckinRow) => c.week_start >= windowStart && c.week_start <= thisMonday;

  const profiles = new Map(input.profiles.map((p) => [normEmail(p.email), p]));
  const known = new Set<string>();
  const leaders = input.leaders
    .map((l) => ({ email: normEmail(l.email), name: l.name }))
    .filter((l) => {
      if (!l.email || known.has(l.email)) return false;
      known.add(l.email);
      return true;
    })
    .sort((a, b) => a.email.localeCompare(b.email));
  const people = input.people.filter((p) => known.has(normEmail(p.owner_email)));
  const checkins = input.checkins.filter((c) => known.has(normEmail(c.email)));

  // The first spelling met (leaders sorted by email) labels the group.
  const labels = new Map<string, string>();
  for (const l of leaders) {
    const raw = profiles.get(l.email)?.pathway_group ?? "";
    const key = groupKey(raw);
    if (key && !labels.has(key)) labels.set(key, raw.trim().replace(/\s+/g, " "));
  }
  const groupOf = (email: string) => labels.get(groupKey(profiles.get(email)?.pathway_group)) ?? NO_GROUP;
  const nameOf = (email: string, fallback: string | null) =>
    profiles.get(email)?.display_name?.trim() || fallback?.trim() || email;
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  const leaderRows: LeaderCounts[] = leaders
    .map((l) => {
      const mine = people.filter((p) => normEmail(p.owner_email) === l.email);
      const names: Record<Metric, string[]> = { pathways: [], intersections: [], streetlights: [] };
      for (const p of mine) {
        for (const m of METRICS) if ((p.metrics ?? []).includes(m)) names[m].push(fullName(p));
      }
      for (const m of METRICS) names[m].sort((a, b) => a.localeCompare(b));
      return { email: l.email, name: nameOf(l.email, l.name), group: groupOf(l.email), counts: countMetrics(mine), names };
    })
    .sort(byName);

  const groupMap = new Map<string, { group: string; leaders: number; counts: MetricCounts }>();
  for (const row of leaderRows) {
    const entry = groupMap.get(row.group) ?? { group: row.group, leaders: 0, counts: emptyCounts() };
    entry.leaders += 1;
    for (const m of METRICS) entry.counts[m] += row.counts[m];
    groupMap.set(row.group, entry);
  }
  const groups = [...groupMap.values()].sort((a, b) =>
    a.group === NO_GROUP ? 1 : b.group === NO_GROUP ? -1 : a.group.localeCompare(b.group)
  );

  const thisMonth = monthKeyOf(today);
  const recorded = people.map((p) => ({ month: monthKeyOf(melbourneDateOf(p.created_at)), metrics: p.metrics }));
  const monthly = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const month = addMonthsKey(thisMonth, i - (MONTHS_SHOWN - 1));
    return { month, counts: countMetrics(recorded.filter((r) => r.month <= month)) };
  });

  const health: LeaderHealth[] = leaders
    .map((l) => {
      const mine = checkins.filter((c) => normEmail(c.email) === l.email);
      const last = mine.reduce<string | null>(
        (latest, c) => (latest === null || c.week_start > latest ? c.week_start : latest),
        null
      );
      const days = last === null ? null : daysBetweenISO(last, thisMonday);
      return {
        email: l.email,
        name: nameOf(l.email, l.name),
        lastCheckin: last,
        weeksSince: days === null ? null : Math.max(0, Math.floor(days / 7)),
        averages: averageScores(mine.filter(inWindow)),
        stale: days === null || days >= STALE_DAYS,
      };
    })
    .sort(byName);

  return {
    asOf: today,
    totals: countMetrics(people),
    monthly,
    groups,
    leaders: leaderRows,
    health,
    churchAverages: averageScores(checkins.filter(inWindow)),
  };
}
```

- [ ] **Step 8: Run it to see it pass**

Run: `npx vitest run src/lib/churchHealth.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 9: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 338 tests pass (316 + 12 + 10); lint at most 54; build passes.

- [ ] **Step 10: Commit**

```bash
git add src/lib/melbourneDate.ts src/lib/melbourneDate.test.ts src/lib/churchHealth.ts src/lib/churchHealth.test.ts
git commit -m "Church health: Melbourne date helpers and pure aggregation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Church health route and admin tab

**Files:**
- Create: `src/test/fakeSupabase.ts`
- Create: `src/lib/adminRead.ts`
- Test: `src/lib/adminRead.test.ts`
- Create: `src/app/api/admin/church-health/route.ts`
- Test: `src/app/api/admin/church-health/route.test.ts`
- Create: `src/components/admin/ChurchHealthTab.tsx`
- Modify: `src/app/leaders/admin/page.tsx` (imports, `TABS`, the tab render list)

**Interfaces:**
- Consumes: `buildChurchHealth`, `ChurchHealth`, row types, `METRIC_LABELS`, `linePoints` (Task 2); `monthLabel` (Task 2); `isAdminAuthorized`, `adminConfigError`, `getSupabaseAdmin` from `src/lib/supabaseAdmin.ts`; `GAUGES` from `src/lib/rpms.ts`; `METRICS` from `src/lib/people.ts`.
- Produces:
  - `fakeSupabase(results?: Record<string, FakeResult>): { db; calls: FakeCall[]; tables(): string[] }` in `src/test/fakeSupabase.ts`, where `FakeResult = { data?: unknown; error?: { message: string; code?: string } | null }` is keyed `"table"` or `"table.operation"` (operation one of `select`, `insert`, `upsert`, `update`, `delete`) and each `FakeCall` is `[table, method, ...args]`. Tasks 8, 9 and 10 use it.
  - `readRows<T>(db: SupabaseClient, table: string, columns: string): Promise<T[]>` and `ROW_CAP = 1000` in `src/lib/adminRead.ts`. Task 8 uses it.
  - `GET /api/admin/church-health` returning `ChurchHealth` JSON.
  - `ChurchHealthTab({ adminKey }: { adminKey: string })` default export.

- [ ] **Step 1: Write the fake query builder**

Create `src/test/fakeSupabase.ts`:

```ts
// A stand-in for the Supabase query builder, for route and adapter tests.
// Every call is recorded as [table, method, ...args]. Awaiting a chain
// resolves with the result registered for "table.operation" (select,
// insert, upsert, update or delete), else for "table", else an empty
// result: [] for a list select, null otherwise.

export interface FakeError {
  message: string;
  code?: string;
}

export interface FakeResult {
  data?: unknown;
  error?: FakeError | null;
}

export type FakeCall = [string, string, ...unknown[]];

interface FakeResponse {
  data: unknown;
  error: FakeError | null;
}

export function fakeSupabase(results: Record<string, FakeResult> = {}) {
  const calls: FakeCall[] = [];

  function chainFor(table: string) {
    let operation = "select";
    let single = false;
    const record = (method: string, args: unknown[]) => {
      calls.push([table, method, ...args]);
    };
    const chain = {
      select(...args: unknown[]) {
        record("select", args);
        return chain;
      },
      insert(...args: unknown[]) {
        operation = "insert";
        record("insert", args);
        return chain;
      },
      upsert(...args: unknown[]) {
        operation = "upsert";
        record("upsert", args);
        return chain;
      },
      update(...args: unknown[]) {
        operation = "update";
        record("update", args);
        return chain;
      },
      delete(...args: unknown[]) {
        operation = "delete";
        record("delete", args);
        return chain;
      },
      eq(...args: unknown[]) {
        record("eq", args);
        return chain;
      },
      in(...args: unknown[]) {
        record("in", args);
        return chain;
      },
      order(...args: unknown[]) {
        record("order", args);
        return chain;
      },
      limit(...args: unknown[]) {
        record("limit", args);
        return chain;
      },
      maybeSingle() {
        single = true;
        record("maybeSingle", []);
        return chain;
      },
      then(onFulfilled: (value: FakeResponse) => unknown, onRejected?: (reason: unknown) => unknown) {
        const r = results[`${table}.${operation}`] ?? results[table] ?? {};
        const empty = operation === "select" && !single ? [] : null;
        const response: FakeResponse = { data: r.data === undefined ? empty : r.data, error: r.error ?? null };
        return Promise.resolve(response).then(onFulfilled, onRejected);
      },
    };
    return chain;
  }

  const db = {
    from(table: string) {
      calls.push([table, "from"]);
      return chainFor(table);
    },
  };

  return { db, calls, tables: () => calls.filter((c) => c[1] === "from").map((c) => c[0]) };
}
```

- [ ] **Step 2: Write the failing `readRows` tests**

Create `src/lib/adminRead.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase } from "@/test/fakeSupabase";
import { readRows, ROW_CAP } from "./adminRead";

const asClient = (db: unknown) => db as SupabaseClient;

describe("readRows", () => {
  it("returns every row of the table with the columns asked for", async () => {
    const fake = fakeSupabase({ leaders: { data: [{ email: "a@example.invalid" }] } });
    const rows = await readRows<{ email: string }>(asClient(fake.db), "leaders", "email");
    expect(rows).toEqual([{ email: "a@example.invalid" }]);
    expect(fake.calls).toEqual([
      ["leaders", "from"],
      ["leaders", "select", "email"],
    ]);
  });

  it("throws with the table name and the database message", async () => {
    const fake = fakeSupabase({ leaders: { error: { message: "permission denied" } } });
    await expect(readRows(asClient(fake.db), "leaders", "email")).rejects.toThrow("leaders: permission denied");
  });

  it("throws rather than undercount when the row cap is reached", async () => {
    const data = Array.from({ length: ROW_CAP }, (_, i) => ({ id: i }));
    const fake = fakeSupabase({ leader_checkins: { data } });
    await expect(readRows(asClient(fake.db), "leader_checkins", "id")).rejects.toThrow("row read cap");
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/lib/adminRead.test.ts`
Expected: FAIL, "Failed to resolve import ./adminRead".

- [ ] **Step 4: Write `src/lib/adminRead.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

// A whole-table read for admin views and the email engine. Supabase returns
// at most 1000 rows per select by default, so a read that reaches that cap
// would undercount silently: it throws instead. Errors carry the table name.
export const ROW_CAP = 1000;

export async function readRows<T>(db: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const { data, error } = await db.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  const rows = (data ?? []) as unknown as T[];
  if (rows.length >= ROW_CAP) {
    throw new Error(
      `${table}: ${rows.length} rows reached the ${ROW_CAP} row read cap. Paginate this read before trusting the numbers.`
    );
  }
  return rows;
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/lib/adminRead.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Write the failing route tests**

Create `src/app/api/admin/church-health/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// Only the database is replaced. isAdminAuthorized and adminConfigError are
// the real ones, driven by the env values stubbed below.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));

import { GET } from "./route";

const KEY = "test-admin-key";
const get = (authorization?: string) =>
  GET(
    new NextRequest("http://localhost/api/admin/church-health", {
      headers: authorization ? { authorization } : {},
    })
  );

beforeEach(() => {
  h.getSupabaseAdmin.mockReset();
  vi.stubEnv("ADMIN_API_KEY", KEY);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/admin/church-health", () => {
  it("is 401 without the admin key and never opens the database", async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 401 with the wrong key", async () => {
    const res = await get("Bearer nope");
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 401 when no admin key is configured on the server", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const res = await get("Bearer ");
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("reads the four tables and returns the aggregation", async () => {
    const fake = fakeSupabase({
      leaders: { data: [{ email: "ann@example.invalid", name: "Ann", full_access: true }] },
      leader_profiles: { data: [] },
      leader_people: {
        data: [
          {
            owner_email: "ann@example.invalid",
            first_name: "Sam",
            last_name: null,
            metrics: ["pathways"],
            created_at: "2026-09-15T00:00:00Z",
          },
        ],
      },
      leader_checkins: { data: [] },
    });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await get(`Bearer ${KEY}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals).toEqual({ pathways: 1, intersections: 0, streetlights: 0 });
    expect(body.leaders).toHaveLength(1);
    expect(fake.tables().sort()).toEqual(["leader_checkins", "leader_people", "leader_profiles", "leaders"]);
  });

  it("fails loud with the database message", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ leader_people: { error: { message: "boom" } } }).db);
    const res = await get(`Bearer ${KEY}`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "leader_people: boom" });
  });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run src/app/api/admin/church-health/route.test.ts`
Expected: FAIL, "Failed to resolve import ./route".

- [ ] **Step 8: Write the route**

Create `src/app/api/admin/church-health/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { adminConfigError, getSupabaseAdmin, isAdminAuthorized } from "@/lib/supabaseAdmin";
import { readRows } from "@/lib/adminRead";
import {
  buildChurchHealth,
  type HealthCheckinRow,
  type HealthLeaderRow,
  type HealthPersonRow,
  type HealthProfileRow,
} from "@/lib/churchHealth";

// GET /api/admin/church-health (admin Bearer key). Read only: loads four
// tables and returns buildChurchHealth. Any read error is a 500 with the
// database message, never a partial answer.
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  try {
    const db = getSupabaseAdmin();
    const [leaders, profiles, people, checkins] = await Promise.all([
      readRows<HealthLeaderRow>(db, "leaders", "email, name, full_access"),
      readRows<HealthProfileRow>(db, "leader_profiles", "email, display_name, pathway_group"),
      readRows<HealthPersonRow>(db, "leader_people", "owner_email, first_name, last_name, metrics, created_at"),
      readRows<HealthCheckinRow>(db, "leader_checkins", "email, week_start, relational, physical, mental, spiritual"),
    ]);
    return NextResponse.json(buildChurchHealth({ leaders, profiles, people, checkins, now: new Date() }));
  } catch (e) {
    console.error("church-health:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 9: Run it to see it pass**

Run: `npx vitest run src/app/api/admin/church-health/route.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 10: Write the tab**

Create `src/components/admin/ChurchHealthTab.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { METRICS, type Metric } from "@/lib/people";
import { GAUGES } from "@/lib/rpms";
import { linePoints, METRIC_LABELS, type ChurchHealth } from "@/lib/churchHealth";
import { monthLabel } from "@/lib/melbourneDate";

// Spec 2: the read-only Church Health tab on /leaders/admin. The gauge
// colours appear only in the Leader health section.
const LINE_COLOURS: Record<Metric, string> = {
  pathways: "var(--accent)",
  intersections: "var(--lamp)",
  streetlights: "var(--ink-2)",
};
const CHART_W = 600;
const CHART_H = 160;

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]";
const card = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6";
const heading = "font-serif text-2xl text-white";
const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]";
const td = "px-3 py-2 text-sm text-white";
const button = `inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm text-white hover:bg-[var(--surface-hover)] ${focus}`;

export default function ChurchHealthTab({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<ChurchHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/church-health", { headers: { authorization: `Bearer ${adminKey}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load church health (${res.status})`);
        return body as ChurchHealth;
      })
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setError(null);
      })
      .catch((e: Error) => {
        console.error("ChurchHealthTab: load failed", e);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  if (error) {
    return (
      <div className={card}>
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
        <button type="button" onClick={refresh} className={`${button} mt-4`}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <p className="text-gray-400">Loading church health...</p>;

  const max = Math.max(1, ...data.monthly.flatMap((m) => METRICS.map((k) => m.counts[k])));
  const first = data.monthly[0];
  const last = data.monthly[data.monthly.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">As of {data.asOf}, Melbourne time</p>
        <button type="button" onClick={refresh} className={button}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className={card} aria-labelledby="ch-totals">
        <h2 id="ch-totals" className={heading}>
          Church totals over time
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m} className="rounded-lg border border-[var(--border)] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted)]">
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: LINE_COLOURS[m] }} />
                {METRIC_LABELS[m]}
              </p>
              <p className="mt-1 font-serif text-4xl text-white">{data.totals[m]}</p>
            </div>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="mt-6 h-40 w-full"
          role="img"
          aria-label="People named per metric over the last 12 months"
        >
          <line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="var(--border-strong)" />
          {METRICS.map((m) => (
            <polyline
              key={m}
              fill="none"
              stroke={LINE_COLOURS[m]}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              points={linePoints(
                data.monthly.map((x) => x.counts[m]),
                CHART_W,
                CHART_H,
                max
              )}
            />
          ))}
        </svg>
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
          <span>{monthLabel(first.month)}</span>
          <span>{monthLabel(last.month)}</span>
        </div>
        <details className="mt-4">
          <summary className={`flex min-h-[44px] cursor-pointer items-center text-sm text-[var(--muted)] hover:text-white ${focus}`}>
            Month by month numbers
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={th}>Month</th>
                  {METRICS.map((m) => (
                    <th key={m} className={th}>
                      {METRIC_LABELS[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((row) => (
                  <tr key={row.month} className="border-t border-[var(--border)]">
                    <td className={td}>{monthLabel(row.month)}</td>
                    {METRICS.map((m) => (
                      <td key={m} className={td}>
                        {row.counts[m]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {/* Henry to check wording */}
        <p className="mt-4 text-xs text-[var(--muted)]">
          History is rebuilt from record dates: a person counts from the month they were first added, and someone
          removed from a list is no longer counted in any month.
        </p>
      </section>

      <section className={card} aria-labelledby="ch-groups">
        <h2 id="ch-groups" className={heading}>
          By pathway group
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={th}>Group</th>
                <th className={th}>Leaders</th>
                {METRICS.map((m) => (
                  <th key={m} className={th}>
                    {METRIC_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.groups.map((g) => (
                <tr key={g.group} className="border-t border-[var(--border)]">
                  <td className={td}>{g.group}</td>
                  <td className={td}>{g.leaders}</td>
                  {METRICS.map((m) => (
                    <td key={m} className={td}>
                      {g.counts[m]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card} aria-labelledby="ch-leaders">
        <h2 id="ch-leaders" className={heading}>
          By leader
        </h2>
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {data.leaders.map((l) => (
            <li key={l.email}>
              <details>
                <summary
                  className={`flex min-h-[44px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm text-white ${focus}`}
                >
                  <span className="font-medium">{l.name}</span>
                  <span className="text-[var(--muted)]">{l.group}</span>
                  <span className="text-[var(--muted)]">
                    {METRICS.map((m) => `${METRIC_LABELS[m]} ${l.counts[m]}`).join(" · ")}
                  </span>
                </summary>
                <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-3">
                  {METRICS.map((m) => (
                    <div key={m}>
                      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{METRIC_LABELS[m]}</p>
                      {l.names[m].length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">None yet</p>
                      ) : (
                        <ul className="text-sm text-white">
                          {l.names[m].map((n, i) => (
                            <li key={`${n}-${i}`}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="ch-health">
        <h2 id="ch-health" className={heading}>
          Leader health
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Averages of the last four weekly check-ins, out of 10.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={th}>Leader</th>
                <th className={th}>Last check-in</th>
                {GAUGES.map((g) => (
                  <th key={g.key} className={th} style={{ color: g.colour }} title={g.label}>
                    {g.letter}
                  </th>
                ))}
                <th className={th}>Flag</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--border)]">
                <td className={`${td} font-medium`}>Whole church</td>
                <td className={td} />
                {GAUGES.map((g) => (
                  <td key={g.key} className={td} style={{ color: g.colour }}>
                    {data.churchAverages ? data.churchAverages[g.key] : "-"}
                  </td>
                ))}
                <td className={td} />
              </tr>
              {data.health.map((l) => (
                <tr key={l.email} className="border-t border-[var(--border)]">
                  <td className={td}>{l.name}</td>
                  <td className={td}>{l.lastCheckin ?? "Never"}</td>
                  {GAUGES.map((g) => (
                    <td key={g.key} className={td} style={{ color: g.colour }}>
                      {l.averages ? l.averages[g.key] : "-"}
                    </td>
                  ))}
                  {/* Henry to check wording */}
                  <td className={`${td} text-amber-400`}>{l.stale ? "No check-in for 3+ weeks" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 11: Add the tab to the admin page**

In `src/app/leaders/admin/page.tsx`:

1. Add `HeartPulse,` to the `lucide-react` import list (after `Search,`).
2. Below the lucide import add `import ChurchHealthTab from "@/components/admin/ChurchHealthTab";`
3. In `TABS`, after the `stats` entry add:

```ts
  { id: "health", label: "Church Health", icon: HeartPulse },
```

4. After `{activeTab === "stats" && <StatsTab adminKey={adminKey} />}` add:

```tsx
        {activeTab === "health" && <ChurchHealthTab adminKey={adminKey} />}
```

- [ ] **Step 12: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 346 tests pass (338 + 3 + 5); lint at most 54; build passes.

- [ ] **Step 13: Commit**

```bash
git add src/test/fakeSupabase.ts src/lib/adminRead.ts src/lib/adminRead.test.ts src/app/api/admin/church-health/route.ts src/app/api/admin/church-health/route.test.ts src/components/admin/ChurchHealthTab.tsx src/app/leaders/admin/page.tsx
git commit -m "Church health: admin-key route and the Church Health admin tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 14: Controller browser check**

With `npm run dev` and `ADMIN_API_KEY` set in `.env.local`, at 375 px and desktop:
- `/leaders/admin`, unlock with the admin key, open "Church Health". The four sections render with real data: totals tiles, a 12-month chart with three lines and first and last month labels, the footnote, the group table ("No group set" last), the leader list, the health table with the "Whole church" row first and R, P, M, S headers in the gauge colours.
- Expand one leader: names appear under each metric. Expand "Month by month numbers": twelve rows.
- At 375 px no horizontal page scroll; wide tables scroll inside their own box.
- Keyboard: Tab reaches Refresh, the month-by-month summary and each leader summary; each shows the lamp-colour focus ring and is at least 44 px tall; Enter toggles a summary.
- Network tab: `GET /api/admin/church-health` is 200. In a private window, `fetch("/api/admin/church-health")` with no header returns 401.

---

### Task 4: Migration 009 (unapplied) and email preference rules (TDD)

**Files:**
- Create: `supabase/migrations/009_leader_emails.sql` (written, NOT applied)
- Create: `src/lib/emails/prefs.ts`
- Test: `src/lib/emails/prefs.test.ts`
- Modify: `scripts/guard-test-rows.mjs` (the `COLUMNS` list and the missing-table skip)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (`src/lib/emails/prefs.ts`, pure, safe in client components):
  - `EMAIL_KINDS = ["rpms", "digest", "church_health", "apprentice", "milestones"] as const`, `type EmailKind`, `type EmailPrefs = Record<EmailKind, boolean>`, `DEFAULT_PREFS`
  - `EMAIL_KIND_INFO: Record<EmailKind, { label: string; description: string }>`
  - `PREVIEW_TOKEN` (a valid UUID that matches no row), `PREFS_COLUMNS` (select string)
  - `interface PrefsRow { email; rpms; digest; church_health; apprentice; milestones: boolean | null; unsubscribe_token: string }`
  - `interface LeaderRow { email: string; name: string | null; full_access: boolean }`
  - `interface Recipient { email: string; name: string; token: string | null }`
  - `isEmailKind(value: unknown): value is EmailKind`
  - `prefsFromRow(row: Partial<PrefsRow> | null | undefined): EmailPrefs`
  - `recipientsFor(kind: EmailKind, leaders: LeaderRow[], prefs: PrefsRow[]): Recipient[]`
  - `validatePrefsPatch(body: unknown): { patch: Partial<EmailPrefs> } | { error: string }`
  - `parseUnsubscribe(token: unknown, kind: unknown): { token: string; kinds: EmailKind[] } | { error: string }`
  - `unsubscribePatch(kinds: EmailKind[]): Partial<EmailPrefs>` (every value `false`)
  - `MISSING_TABLES_MESSAGE`, `emailTablesError(message: string): string`
- Produces (database, once Henry applies it in Task 11): tables `leader_email_prefs` and `leader_email_log` as below.

- [ ] **Step 1: Write the migration (do not run it)**

Create `supabase/migrations/009_leader_emails.sql`:

```sql
-- ============================================================
-- Leader emails (spec 2026-09-24 church health emails, 3.1).
--
-- leader_email_prefs: one row per leader who has an unsubscribe token or
-- has changed a setting. A missing row means every email is on. The
-- unsubscribe token is what the one-click link carries, so the link never
-- needs a password and can only ever turn emails off.
--
-- leader_email_log: one row per email claimed for sending. The engine
-- inserts the row BEFORE it sends, and the unique (email, kind,
-- period_key) is the guarantee against double sends: a second insert for
-- the same email, kind and period fails, so a retry or an overlapping run
-- sends nothing. status 'baseline' marks milestones a leader already had
-- when emails were switched on, so nobody is congratulated for old news.
--
-- APPLIED BY HENRY (or on his explicit instruction) ONLY.
-- RLS on with no policies, matching every other table here: all access
-- goes through service-role server code.
-- ============================================================

create table if not exists public.leader_email_prefs (
  email              text primary key,          -- the leader, lowercase
  rpms               boolean not null default true,
  digest             boolean not null default true,
  church_health      boolean not null default true,
  apprentice         boolean not null default true,
  milestones         boolean not null default true,
  unsubscribe_token  uuid not null unique default gen_random_uuid(),
  updated_at         timestamptz not null default now()
);
alter table public.leader_email_prefs enable row level security;
-- Deliberately no policies.

create table if not exists public.leader_email_log (
  id          bigserial primary key,
  email       text not null,
  kind        text not null
              check (kind in ('rpms', 'digest', 'church_health', 'apprentice', 'milestones')),
  -- e.g. '2026-10-04' (the Sunday) for rpms, '2026-10' for monthly kinds,
  -- 'phase1-walked' or 'launch-2026-11-01-7d' for milestones.
  period_key  text not null,
  status      text not null default 'sent' check (status in ('sent', 'baseline')),
  sent_at     timestamptz not null default now(),
  unique (email, kind, period_key)
);
alter table public.leader_email_log enable row level security;
-- Deliberately no policies.
```

Do not paste this into Supabase and do not run it. Task 11 Step 3 applies it after Henry says go.

- [ ] **Step 2: Write the failing preference tests**

Create `src/lib/emails/prefs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  EMAIL_KIND_INFO,
  EMAIL_KINDS,
  emailTablesError,
  MISSING_TABLES_MESSAGE,
  parseUnsubscribe,
  prefsFromRow,
  recipientsFor,
  unsubscribePatch,
  validatePrefsPatch,
  type LeaderRow,
  type PrefsRow,
} from "./prefs";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const prefsRow = (email: string, over: Partial<PrefsRow> = {}): PrefsRow => ({
  email,
  rpms: true,
  digest: true,
  church_health: true,
  apprentice: true,
  milestones: true,
  unsubscribe_token: TOKEN,
  ...over,
});

const leaders: LeaderRow[] = [
  { email: "zed@example.invalid", name: "Zed", full_access: true },
  { email: " Amy@Example.invalid ", name: null, full_access: true },
  { email: "amy@example.invalid", name: "Amy again", full_access: true },
  { email: "pending@example.invalid", name: "Pending", full_access: false },
];

describe("prefsFromRow", () => {
  it("is all on with no row", () => {
    expect(prefsFromRow(null)).toEqual(DEFAULT_PREFS);
    expect(Object.values(DEFAULT_PREFS).every((v) => v === true)).toBe(true);
  });

  it("turns off only an explicit false", () => {
    expect(prefsFromRow({ digest: false, rpms: null })).toEqual({ ...DEFAULT_PREFS, digest: false });
  });
});

describe("recipientsFor", () => {
  it("keeps full-access leaders only, lowercased, once each, sorted", () => {
    expect(recipientsFor("rpms", leaders, []).map((r) => r.email)).toEqual([
      "amy@example.invalid",
      "zed@example.invalid",
    ]);
  });

  it("drops a leader who turned this kind off, and only this kind", () => {
    const prefs = [prefsRow("zed@example.invalid", { digest: false })];
    expect(recipientsFor("digest", leaders, prefs).map((r) => r.email)).toEqual(["amy@example.invalid"]);
    expect(recipientsFor("rpms", leaders, prefs).map((r) => r.email)).toEqual([
      "amy@example.invalid",
      "zed@example.invalid",
    ]);
  });

  it("carries the unsubscribe token when there is a row and falls back to the email for a name", () => {
    const [amy, zed] = recipientsFor("rpms", leaders, [prefsRow("ZED@example.invalid")]);
    expect(amy).toEqual({ email: "amy@example.invalid", name: "amy", token: null });
    expect(zed).toEqual({ email: "zed@example.invalid", name: "Zed", token: TOKEN });
  });

  it("never includes someone who only has a preferences row", () => {
    const prefs = [prefsRow("stranger@example.invalid")];
    expect(recipientsFor("rpms", [], prefs)).toEqual([]);
  });
});

describe("validatePrefsPatch", () => {
  it("accepts true or false for known kinds", () => {
    expect(validatePrefsPatch({ rpms: false, milestones: true })).toEqual({ patch: { rpms: false, milestones: true } });
  });

  it("rejects anything else", () => {
    expect(validatePrefsPatch(null)).toEqual({ error: "Send an object of email settings" });
    expect(validatePrefsPatch([])).toEqual({ error: "Send an object of email settings" });
    expect(validatePrefsPatch({})).toEqual({ error: "Send at least one email setting" });
    expect(validatePrefsPatch({ email: "x@example.invalid" })).toEqual({ error: "Unknown email setting: email" });
    expect(validatePrefsPatch({ rpms: "no" })).toEqual({ error: "rpms must be true or false" });
  });
});

describe("unsubscribe", () => {
  it("parses a token and one kind, or all kinds", () => {
    expect(parseUnsubscribe(TOKEN, "digest")).toEqual({ token: TOKEN, kinds: ["digest"] });
    expect(parseUnsubscribe(TOKEN.toUpperCase(), "all")).toEqual({ token: TOKEN, kinds: [...EMAIL_KINDS] });
  });

  it("rejects a token that is not a UUID, or an unknown kind", () => {
    const bad = { error: "This unsubscribe link is not valid." };
    expect(parseUnsubscribe("abc", "digest")).toEqual(bad);
    expect(parseUnsubscribe(null, "digest")).toEqual(bad);
    expect(parseUnsubscribe(`${TOKEN}' or '1'='1`, "digest")).toEqual(bad);
    expect(parseUnsubscribe(TOKEN, "everything")).toEqual(bad);
    expect(parseUnsubscribe(TOKEN, null)).toEqual(bad);
  });

  it("can only ever turn emails off", () => {
    expect(unsubscribePatch([...EMAIL_KINDS])).toEqual({
      rpms: false,
      digest: false,
      church_health: false,
      apprentice: false,
      milestones: false,
    });
  });
});

describe("emailTablesError", () => {
  it("explains a missing email table and passes other messages through", () => {
    expect(emailTablesError("Could not find the table 'public.leader_email_prefs' in the schema cache")).toContain(
      MISSING_TABLES_MESSAGE
    );
    expect(emailTablesError('relation "public.leader_email_log" does not exist')).toContain(MISSING_TABLES_MESSAGE);
    expect(emailTablesError("permission denied")).toBe("permission denied");
  });
});

describe("EMAIL_KIND_INFO", () => {
  it("has a label and a one-line description for every kind, with no em dash", () => {
    const dash = String.fromCharCode(0x2014);
    for (const kind of EMAIL_KINDS) {
      expect(EMAIL_KIND_INFO[kind].label.length).toBeGreaterThan(0);
      expect(EMAIL_KIND_INFO[kind].description.length).toBeGreaterThan(0);
      expect(EMAIL_KIND_INFO[kind].label + EMAIL_KIND_INFO[kind].description).not.toContain(dash);
    }
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/lib/emails/prefs.test.ts`
Expected: FAIL, "Failed to resolve import ./prefs".

- [ ] **Step 4: Write `src/lib/emails/prefs.ts`**

```ts
// Leader email kinds and preferences (spec 2026-09-24 church health emails,
// 3.1 and 3.4). Pure, so it is safe in the browser (the Emails panel) and
// on the server (routes and the engine).

export const EMAIL_KINDS = ["rpms", "digest", "church_health", "apprentice", "milestones"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];
export type EmailPrefs = Record<EmailKind, boolean>;

export const DEFAULT_PREFS: EmailPrefs = {
  rpms: true,
  digest: true,
  church_health: true,
  apprentice: true,
  milestones: true,
};

// Henry to check wording
export const EMAIL_KIND_INFO: Record<EmailKind, { label: string; description: string }> = {
  rpms: {
    label: "Sunday check-in reminder",
    description: "Sunday 6 pm: a nudge to do your weekly RPMS check-in.",
  },
  digest: {
    label: "Your week",
    description: "Monday 7 am: this week's Pathways topic, your check-in trend and who to follow up.",
  },
  church_health: {
    label: "Monthly church health",
    description: "1st of the month: update your three lists and see the whole church's numbers.",
  },
  apprentice: {
    label: "Apprentice nudge",
    description: "15th of the month: where each person you are apprenticing is, and their next step.",
  },
  milestones: {
    label: "Milestones",
    description: "When you light a new streetlight, and 30, 7 and 1 days before your launch.",
  },
};

// A well-formed token that matches no row. Previews and dry runs use it for
// leaders who have no preferences row yet.
export const PREVIEW_TOKEN = "00000000-0000-4000-8000-000000000000";

// A single string literal so Supabase's column parser can read it.
export const PREFS_COLUMNS = "email, rpms, digest, church_health, apprentice, milestones, unsubscribe_token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PrefsRow {
  email: string;
  rpms: boolean | null;
  digest: boolean | null;
  church_health: boolean | null;
  apprentice: boolean | null;
  milestones: boolean | null;
  unsubscribe_token: string;
}

export interface LeaderRow {
  email: string;
  name: string | null;
  full_access: boolean;
}

export interface Recipient {
  email: string;
  name: string;
  token: string | null;
}

export function isEmailKind(value: unknown): value is EmailKind {
  return typeof value === "string" && (EMAIL_KINDS as readonly string[]).includes(value);
}

// A missing row, or a missing value, means on. Only an explicit false is off.
export function prefsFromRow(row: Partial<PrefsRow> | null | undefined): EmailPrefs {
  const prefs = { ...DEFAULT_PREFS };
  for (const kind of EMAIL_KINDS) if (row?.[kind] === false) prefs[kind] = false;
  return prefs;
}

// The only people who can ever get an email: `leaders` rows with full
// access, minus anyone who turned this kind off. A preferences row alone
// never makes anyone a recipient. Emails are trimmed and lowercased,
// duplicates dropped, and the list is sorted so every run is repeatable.
export function recipientsFor(kind: EmailKind, leaders: LeaderRow[], prefs: PrefsRow[]): Recipient[] {
  const prefsBy = new Map(prefs.map((p) => [p.email.trim().toLowerCase(), p]));
  const out = new Map<string, Recipient>();
  for (const leader of leaders) {
    if (leader.full_access !== true) continue;
    const email = leader.email.trim().toLowerCase();
    if (!email || out.has(email)) continue;
    const row = prefsBy.get(email);
    if (!prefsFromRow(row)[kind]) continue;
    out.set(email, { email, name: leader.name?.trim() || email.split("@")[0], token: row?.unsubscribe_token ?? null });
  }
  return [...out.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export function validatePrefsPatch(body: unknown): { patch: Partial<EmailPrefs> } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Send an object of email settings" };
  const patch: Partial<EmailPrefs> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!isEmailKind(key)) return { error: `Unknown email setting: ${key}` };
    if (typeof value !== "boolean") return { error: `${key} must be true or false` };
    patch[key] = value;
  }
  if (Object.keys(patch).length === 0) return { error: "Send at least one email setting" };
  return { patch };
}

export function parseUnsubscribe(token: unknown, kind: unknown): { token: string; kinds: EmailKind[] } | { error: string } {
  const invalid = { error: "This unsubscribe link is not valid." };
  if (typeof token !== "string" || !UUID.test(token)) return invalid;
  if (kind === "all") return { token: token.toLowerCase(), kinds: [...EMAIL_KINDS] };
  if (!isEmailKind(kind)) return invalid;
  return { token: token.toLowerCase(), kinds: [kind] };
}

// Unsubscribing can only ever turn emails off.
export function unsubscribePatch(kinds: EmailKind[]): Partial<EmailPrefs> {
  const patch: Partial<EmailPrefs> = {};
  for (const kind of kinds) patch[kind] = false;
  return patch;
}

export const MISSING_TABLES_MESSAGE =
  "Leader email tables are missing. Apply supabase/migrations/009_leader_emails.sql first.";

// Until migration 009 is applied, Supabase reports the tables as missing.
// Say what to do about it, keeping the original message for the log.
export function emailTablesError(message: string): string {
  const aboutEmailTables = /leader_email_(prefs|log)/.test(message);
  const missing = /does not exist|schema cache|PGRST205|42P01/i.test(message);
  return aboutEmailTables && missing ? `${MISSING_TABLES_MESSAGE} (${message})` : message;
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/lib/emails/prefs.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Guard the two new tables**

In `scripts/guard-test-rows.mjs`, add to the end of `COLUMNS`:

```js
  ["leader_email_prefs", "email"],
  ["leader_email_log", "email"],
```

and replace:

```js
    if ((table === "leader_people" || table === "leader_worksheets") && /does not exist|schema cache/i.test(error.message)) continue;
```

with:

```js
    if (OPTIONAL_TABLES.has(table) && /does not exist|schema cache/i.test(error.message)) continue;
```

and add above `const hits = [];`:

```js
// Tables from migrations that may not be applied yet (009 waits for Henry).
const OPTIONAL_TABLES = new Set(["leader_people", "leader_worksheets", "leader_email_prefs", "leader_email_log"]);
```

Run: `npm run guard`
Expected: `clean` (read only; the two new tables are skipped while missing).

- [ ] **Step 7: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 359 tests pass (346 + 13); lint at most 54; build passes.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/009_leader_emails.sql src/lib/emails/prefs.ts src/lib/emails/prefs.test.ts scripts/guard-test-rows.mjs
git commit -m "Leader emails: migration 009 (not applied) and preference rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Schedule and this week's topic (pure, TDD)

**Files:**
- Create: `src/lib/emails/schedule.ts`
- Test: `src/lib/emails/schedule.test.ts`
- Create: `src/lib/emails/topic.ts`
- Test: `src/lib/emails/topic.test.ts`

**Interfaces:**
- Consumes: `melbourneParts`, `monthKeyOf`, `addDaysISO` (Task 2); `EMAIL_KINDS`, `EmailKind` (Task 4).
- Produces:
  - `SEND_HOUR: Record<EmailKind, number>`, `LAST_HOUR: Record<EmailKind, number>` (last Melbourne hour still due, inclusive: 23, or 9 for milestones)
  - `dueKinds(now: Date): EmailKind[]` (in `EMAIL_KINDS` order)
  - `type PeriodicKind = Exclude<EmailKind, "milestones">`
  - `periodKeyFor(kind: PeriodicKind, now: Date): string` (`YYYY-MM-DD` for `rpms` and `digest`, `YYYY-MM` for `church_health` and `apprentice`)
  - `interface GuideRow { id: string; guide_date: string | null; series: string | null; topic: string | null; scripture: string | null; pdf_url: string | null }`
  - `parseGuideDate(raw: string | null | undefined): string | null` (`DD/MM/YYYY` to `YYYY-MM-DD`)
  - `interface WeekTopic { guide: GuideRow; date: string; thisWeek: boolean }`
  - `topicForWeek(guides: GuideRow[], mondayISO: string): { topic: WeekTopic | null; unparseable: string[] }`

- [ ] **Step 1: Write the failing schedule tests**

Create `src/lib/emails/schedule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dueKinds, periodKeyFor } from "./schedule";

const at = (iso: string) => dueKinds(new Date(iso));

// Melbourne is UTC+11 (AEDT) until 3:00 am on Sunday 5 April 2026, UTC+10
// (AEST) until 2:00 am on Sunday 4 October 2026, then UTC+11 again.
describe("dueKinds", () => {
  it("has nothing due at 5:59 pm on a Sunday (AEST)", () => {
    expect(at("2026-09-27T07:59:00Z")).toEqual([]);
  });

  it("makes the RPMS reminder due at 6 pm Sunday (AEST)", () => {
    expect(at("2026-09-27T08:00:00Z")).toEqual(["rpms"]);
  });

  it("keeps RPMS due until 23:59 Sunday and drops everything at midnight", () => {
    expect(at("2026-09-27T13:59:00Z")).toEqual(["rpms"]);
    expect(at("2026-09-27T14:00:00Z")).toEqual([]);
  });

  it("uses 6 pm AEDT on the Sunday daylight saving starts", () => {
    expect(at("2026-10-04T06:59:00Z")).toEqual([]);
    expect(at("2026-10-04T07:00:00Z")).toEqual(["rpms"]);
  });

  it("makes the Monday digest due at 7 am AEDT", () => {
    expect(at("2026-10-04T19:59:00Z")).toEqual([]);
    expect(at("2026-10-04T20:00:00Z")).toEqual(["digest", "milestones"]);
  });

  it("uses 6 pm AEST on the Sunday daylight saving ends", () => {
    expect(at("2026-04-05T07:59:00Z")).toEqual([]);
    expect(at("2026-04-05T08:00:00Z")).toEqual(["rpms"]);
  });

  it("uses 7 am AEST on the Monday after daylight saving ends", () => {
    expect(at("2026-04-05T20:59:00Z")).toEqual([]);
    expect(at("2026-04-05T21:00:00Z")).toEqual(["digest", "milestones"]);
  });

  it("makes church health due at 7 am on the 1st, a UTC day early", () => {
    expect(at("2026-09-30T20:59:00Z")).toEqual([]);
    expect(at("2026-09-30T21:00:00Z")).toEqual(["church_health", "milestones"]);
  });

  it("makes the apprentice nudge due at 7 am on the 15th", () => {
    expect(at("2026-10-14T20:00:00Z")).toEqual(["apprentice", "milestones"]);
  });

  it("sends the digest and church health together when the 1st is a Monday", () => {
    expect(at("2027-01-31T19:59:00Z")).toEqual([]);
    expect(at("2027-01-31T20:00:00Z")).toEqual(["digest", "church_health", "milestones"]);
  });

  it("checks milestones from 7 am to 9:59 am only, never in the afternoon or evening", () => {
    // Thursday 24 September 2026 (AEST).
    expect(at("2026-09-23T20:59:00Z")).toEqual([]);
    expect(at("2026-09-23T21:00:00Z")).toEqual(["milestones"]);
    expect(at("2026-09-23T23:59:00Z")).toEqual(["milestones"]);
    expect(at("2026-09-24T00:00:00Z")).toEqual([]);
    expect(at("2026-09-24T03:00:00Z")).toEqual([]);
  });
});

describe("periodKeyFor", () => {
  it("keys weekly kinds by Melbourne date and monthly kinds by Melbourne month", () => {
    expect(periodKeyFor("rpms", new Date("2026-09-27T09:00:00Z"))).toBe("2026-09-27");
    expect(periodKeyFor("digest", new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
    expect(periodKeyFor("church_health", new Date("2026-09-30T21:00:00Z"))).toBe("2026-10");
    expect(periodKeyFor("apprentice", new Date("2026-10-14T20:00:00Z"))).toBe("2026-10");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/emails/schedule.test.ts`
Expected: FAIL, "Failed to resolve import ./schedule".

- [ ] **Step 3: Write `src/lib/emails/schedule.ts`**

```ts
// Which leader emails are due at a moment (spec 3.2 timing). Pure.
// A kind is due from its Melbourne send hour to its last hour that
// Melbourne day, so a missed or overloaded hourly run is picked up by the
// next one. The email log (unique email, kind, period_key) stops a second
// send. Milestones are a morning check (spec: daily 07:00), with the 08:00
// and 09:00 runs as retries, so nobody is congratulated late at night.
import { melbourneParts, monthKeyOf } from "@/lib/melbourneDate";
import { EMAIL_KINDS, type EmailKind } from "./prefs";

export const SEND_HOUR: Record<EmailKind, number> = {
  rpms: 18, // Sunday
  digest: 7, // Monday
  church_health: 7, // 1st of the month
  apprentice: 7, // 15th of the month
  milestones: 7, // every day
};

// The last Melbourne hour a kind is still due, inclusive.
export const LAST_HOUR: Record<EmailKind, number> = {
  rpms: 23,
  digest: 23,
  church_health: 23,
  apprentice: 23,
  milestones: 9,
};

export function dueKinds(now: Date): EmailKind[] {
  const t = melbourneParts(now);
  return EMAIL_KINDS.filter((kind) => {
    if (t.hour < SEND_HOUR[kind] || t.hour > LAST_HOUR[kind]) return false;
    switch (kind) {
      case "rpms":
        return t.weekday === 0;
      case "digest":
        return t.weekday === 1;
      case "church_health":
        return t.day === 1;
      case "apprentice":
        return t.day === 15;
      case "milestones":
        return true;
    }
  });
}

export type PeriodicKind = Exclude<EmailKind, "milestones">;

// The log key for one send of a periodic kind. Milestones key themselves
// (compose.ts milestoneKey).
export function periodKeyFor(kind: PeriodicKind, now: Date): string {
  const { date } = melbourneParts(now);
  return kind === "rpms" || kind === "digest" ? date : monthKeyOf(date);
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/emails/schedule.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Write the failing topic tests**

Create `src/lib/emails/topic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseGuideDate, topicForWeek, type GuideRow } from "./topic";

const guide = (id: string, guide_date: string | null, topic = `Topic ${id}`): GuideRow => ({
  id,
  guide_date,
  series: "James",
  topic,
  scripture: "James 1",
  pdf_url: null,
});

// The week of Monday 5 October to Sunday 11 October 2026.
const MONDAY = "2026-10-05";

describe("parseGuideDate", () => {
  it("reads DD/MM/YYYY, with or without leading zeros and spaces", () => {
    expect(parseGuideDate("27/12/2025")).toBe("2025-12-27");
    expect(parseGuideDate("1/2/2026")).toBe("2026-02-01");
    expect(parseGuideDate(" 05/10/2026 ")).toBe("2026-10-05");
  });

  it("rejects impossible dates and other formats", () => {
    expect(parseGuideDate("31/02/2026")).toBeNull();
    expect(parseGuideDate("2026-10-05")).toBeNull();
    expect(parseGuideDate("Week 3")).toBeNull();
    expect(parseGuideDate("")).toBeNull();
    expect(parseGuideDate(null)).toBeNull();
  });
});

describe("topicForWeek", () => {
  it("picks the guide dated inside the week, the earliest if there are two", () => {
    const { topic } = topicForWeek(
      [guide("a", "10/10/2026"), guide("b", "07/10/2026"), guide("c", "28/09/2026")],
      MONDAY
    );
    expect(topic).toEqual({ guide: guide("b", "07/10/2026"), date: "2026-10-07", thisWeek: true });
  });

  it("counts the Sunday but not the next Monday", () => {
    expect(topicForWeek([guide("sun", "11/10/2026")], MONDAY).topic?.thisWeek).toBe(true);
    expect(topicForWeek([guide("mon", "12/10/2026")], MONDAY).topic).toBeNull();
  });

  it("falls back to the most recent past guide", () => {
    const { topic } = topicForWeek([guide("old", "14/09/2026"), guide("recent", "28/09/2026")], MONDAY);
    expect(topic).toMatchObject({ date: "2026-09-28", thisWeek: false });
    expect(topic?.guide.id).toBe("recent");
  });

  it("is null with only future guides or none", () => {
    expect(topicForWeek([guide("future", "19/10/2026")], MONDAY).topic).toBeNull();
    expect(topicForWeek([], MONDAY).topic).toBeNull();
  });

  it("skips and reports rows whose date cannot be read", () => {
    const { topic, unparseable } = topicForWeek([guide("x", "Week 3"), guide("y", null), guide("z", "06/10/2026")], MONDAY);
    expect(topic?.guide.id).toBe("z");
    expect(unparseable).toEqual(['x ("Week 3")', "y (null)"]);
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run src/lib/emails/topic.test.ts`
Expected: FAIL, "Failed to resolve import ./topic".

- [ ] **Step 7: Write `src/lib/emails/topic.ts`**

```ts
// This week's Pathways topic for the Monday digest (spec 3.2). Pure.
// study_guides.guide_date is free text written as DD/MM/YYYY. A row whose
// date cannot be read is skipped and reported, never guessed at.
import { addDaysISO } from "@/lib/melbourneDate";

export interface GuideRow {
  id: string;
  guide_date: string | null;
  series: string | null;
  topic: string | null;
  scripture: string | null;
  pdf_url: string | null;
}

export interface WeekTopic {
  guide: GuideRow;
  date: string;
  thisWeek: boolean;
}

export function parseGuideDate(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The guide dated within Monday to Sunday of this week (the earliest if
// several), else the most recent past one, else null.
export function topicForWeek(guides: GuideRow[], mondayISO: string): { topic: WeekTopic | null; unparseable: string[] } {
  const sunday = addDaysISO(mondayISO, 6);
  const dated: { guide: GuideRow; date: string }[] = [];
  const unparseable: string[] = [];
  for (const guide of guides) {
    const date = parseGuideDate(guide.guide_date);
    if (date) dated.push({ guide, date });
    else unparseable.push(`${guide.id} (${JSON.stringify(guide.guide_date)})`);
  }
  const inWeek = dated.filter((d) => d.date >= mondayISO && d.date <= sunday).sort((a, b) => a.date.localeCompare(b.date));
  if (inWeek.length > 0) return { topic: { ...inWeek[0], thisWeek: true }, unparseable };
  const past = dated.filter((d) => d.date < mondayISO).sort((a, b) => b.date.localeCompare(a.date));
  return { topic: past.length > 0 ? { ...past[0], thisWeek: false } : null, unparseable };
}
```

- [ ] **Step 8: Run it to see it pass**

Run: `npx vitest run src/lib/emails/topic.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 9: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 378 tests pass (359 + 12 + 7); lint at most 54; build passes.

- [ ] **Step 10: Commit**

```bash
git add src/lib/emails/schedule.ts src/lib/emails/schedule.test.ts src/lib/emails/topic.ts src/lib/emails/topic.test.ts
git commit -m "Leader emails: Melbourne schedule and this week's Pathways topic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Branded layout and the five templates (TDD)

**Files:**
- Modify: `src/lib/apprentice.ts` (add the rung labels and how-to lines)
- Modify: `src/lib/apprentice.test.ts` (one new test)
- Modify: `src/app/leaders/training/Phase5Multiply.tsx` (lines 6 and 13 to 28: import the labels instead of declaring them)
- Modify: `src/lib/email.ts` (additive `SendOptions`, `isEmailConfigured`)
- Create: `src/lib/emails/layout.ts`
- Test: `src/lib/emails/layout.test.ts`
- Create: `src/lib/emails/templates.ts`
- Test: `src/lib/emails/templates.test.ts`

**Interfaces:**
- Consumes: `EmailKind` (Task 4); `METRIC_LABELS`, `MetricCounts` (Task 2); `dayMonthLabel` (Task 2); `STOP_NAMES` from `src/lib/avenue.ts`; `GAUGES`, `GaugeScores` from `src/lib/rpms.ts`; `METRICS`, `Metric` from `src/lib/people.ts`.
- Produces (`src/lib/apprentice.ts`): `APPRENTICE_STEPS: readonly { value: number; label: string }[]`, `apprenticeStepLabel(step: number): string`, `APPRENTICE_HOW_TO: Record<number, string>` (keys 1 to 5).
- Produces (`src/lib/email.ts`): `interface SendOptions { text?: string; headers?: Record<string, string> }`, `isEmailConfigured(): boolean`, `sendEmail(to, subject, html, options?: SendOptions)`.
- Produces (`src/lib/emails/layout.ts`):
  - `interface RenderedEmail { subject: string; html: string; text: string; headers: Record<string, string> }`
  - `type Block = { type: "p"; text } | { type: "h"; text } | { type: "list"; items: string[] } | { type: "stats"; rows: { label; value }[] } | { type: "link"; label; href }`
  - `interface EmailContent { kind: EmailKind; token: string; subject; preheader; eyebrow; heading: string; blocks: Block[]; cta?: { label: string; href: string } }`
  - `COLOURS`, `siteUrl(): string`, `absoluteUrl(path: string): string`, `unsubscribeUrl(token: string, kind: EmailKind | "all"): string`, `footerLinks(token, kind): FooterLinks`, `listUnsubscribeHeaders(token, kind): Record<string, string>`, `esc(value: string): string`, `isHttpUrl(value: string | null | undefined): value is string`, `renderEmail(content: EmailContent): RenderedEmail` (throws on any link or button whose href is not `http:` or `https:`)
- Produces (`src/lib/emails/templates.ts`):
  - `LINKS` (app paths), `type Milestone`, `interface DigestTopic { title; series: string | null; passage: string | null; href }`
  - `rpmsEmail(input: { firstName; token; lastWeek: GaugeScores | null }): RenderedEmail`
  - `digestEmail(input: { firstName; token; weekOf: string; topic: DigestTopic | null; trend: { weekStart: string; average: number | null }[]; followUps: string[]; next: { text; label; href } }): RenderedEmail`
  - `churchHealthEmail(input: { firstName; token; monthLabel: string; mine: Record<Metric, { count: number; change: number }>; church: MetricCounts }): RenderedEmail`
  - `apprenticeEmail(input: { firstName; token; apprentices: { name: string; step: number }[] }): RenderedEmail`
  - `milestoneEmail(input: { firstName; token; milestone: Milestone }): RenderedEmail`

- [ ] **Step 1: Write the failing apprentice label test**

Append to `src/lib/apprentice.test.ts` (and add `APPRENTICE_HOW_TO, APPRENTICE_STEPS, apprenticeStepLabel` to its import from `./apprentice`):

```ts
describe("apprentice rung labels", () => {
  it("names every rung, falls back to not started, and has a how-to for rungs 1 to 5", () => {
    expect(APPRENTICE_STEPS.map((s) => s.value)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(apprenticeStepLabel(1)).toBe("I do, you watch");
    expect(apprenticeStepLabel(5)).toBe("You do, someone else watches");
    expect(apprenticeStepLabel(9)).toBe("Not started yet");
    for (const rung of [1, 2, 3, 4, 5]) {
      expect(APPRENTICE_HOW_TO[rung]).toMatch(/\.$/);
      expect(APPRENTICE_HOW_TO[rung]).not.toContain(String.fromCharCode(0x2014));
    }
  });
});
```

Run: `npx vitest run src/lib/apprentice.test.ts`
Expected: FAIL, `APPRENTICE_STEPS` is not exported.

- [ ] **Step 2: Move the labels into the lib**

Append to `src/lib/apprentice.ts`:

```ts
// Hero Maker's five apprenticeship steps (Dave Ferguson). Index 0 is not one
// of the book's five: it is "not started yet", so every person in the
// network always has a valid label, including someone just added. The names
// are the teaching, so screens and emails always show the label, never the
// bare number.
export const APPRENTICE_STEPS: readonly { value: number; label: string }[] = [
  { value: 0, label: "Not started yet" },
  { value: 1, label: "I do, you watch" },
  { value: 2, label: "I do, you help" },
  { value: 3, label: "You do, I help" },
  { value: 4, label: "You do, I watch" },
  { value: 5, label: "You do, someone else watches" },
];

export function apprenticeStepLabel(step: number): string {
  return APPRENTICE_STEPS[step]?.label ?? APPRENTICE_STEPS[0].label;
}

// One line on how to help someone onto each rung (the apprentice email).
// Henry to check wording
export const APPRENTICE_HOW_TO: Record<number, string> = {
  1: "Bring them along and let them watch you lead one gathering.",
  2: "Give them one part to run with you, like the welcome or the prayer.",
  3: "Let them lead while you sit beside them and step in only if needed.",
  4: "Let them lead on their own while you watch, then talk it through together.",
  5: "Help them find their own apprentice to bring along.",
};
```

In `src/app/leaders/training/Phase5Multiply.tsx`, change line 6 from:

```tsx
import { rungAfterTap } from "@/lib/apprentice";
```

to:

```tsx
import { APPRENTICE_STEPS, apprenticeStepLabel, rungAfterTap } from "@/lib/apprentice";
```

and delete lines 13 to 28 exactly (the comment, the `APPRENTICE_STEPS` constant and the `apprenticeStepLabel` function):

```tsx
// Hero Maker's five apprenticeship steps (Dave Ferguson). Index 0 is not one
// of the book's five, it is "not started yet" so every person in the network
// always has a valid label, including someone just added. The names are the
// teaching, so the UI always shows the label, never the bare number.
const APPRENTICE_STEPS: { value: number; label: string }[] = [
  { value: 0, label: "Not started yet" },
  { value: 1, label: "I do, you watch" },
  { value: 2, label: "I do, you help" },
  { value: 3, label: "You do, I help" },
  { value: 4, label: "You do, I watch" },
  { value: 5, label: "You do, someone else watches" },
];

function apprenticeStepLabel(step: number): string {
  return APPRENTICE_STEPS[step]?.label ?? APPRENTICE_STEPS[0].label;
}
```

The two uses (`apprenticeStepLabel(person.apprenticeStep)` and `APPRENTICE_STEPS.filter(...)`) are unchanged.

Run: `npx vitest run src/lib/apprentice.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 3: Let `sendEmail` carry text and headers**

In `src/lib/email.ts` replace:

```ts
// Send email helper
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("Email service not configured - missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return;
  }

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}
```

with:

```ts
// Optional extras: a plain-text alternative and extra headers (the leader
// emails send List-Unsubscribe). Existing callers pass neither and behave
// exactly as before.
export interface SendOptions {
  text?: string;
  headers?: Record<string, string>;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

// Send email helper
export async function sendEmail(to: string, subject: string, html: string, options: SendOptions = {}): Promise<void> {
  if (!isEmailConfigured()) {
    console.error("Email service not configured - missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return;
  }

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    ...(options.text ? { text: options.text } : {}),
    ...(options.headers ? { headers: options.headers } : {}),
  });
}
```

- [ ] **Step 4: Write the failing layout tests**

Create `src/lib/emails/layout.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  esc,
  footerLinks,
  listUnsubscribeHeaders,
  renderEmail,
  siteUrl,
  unsubscribeUrl,
  type EmailContent,
} from "./layout";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const DASH = String.fromCharCode(0x2014);

const content = (over: Partial<EmailContent> = {}): EmailContent => ({
  kind: "digest",
  token: TOKEN,
  subject: "Your week",
  preheader: "A short preview line.",
  eyebrow: "Week of 5 October",
  heading: "Good morning, Sam.",
  blocks: [
    { type: "h", text: "This week" },
    { type: "p", text: "A paragraph." },
    { type: "list", items: ["One", "Two"] },
    { type: "stats", rows: [{ label: "Pathways", value: "3" }] },
    { type: "link", label: "Open the guide", href: "https://example.invalid/guide.pdf" },
  ],
  cta: { label: "Check in now", href: "https://www.avenuemission.com/leaders" },
  ...over,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("links", () => {
  it("uses the live site by default and AVENUE_SITE_URL when set, without a trailing slash", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    expect(siteUrl()).toBe("https://www.avenuemission.com");
    vi.stubEnv("AVENUE_SITE_URL", "http://localhost:3000/");
    expect(siteUrl()).toBe("http://localhost:3000");
    expect(absoluteUrl("/leaders")).toBe("http://localhost:3000/leaders");
  });

  it("builds unsubscribe and manage links", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    expect(unsubscribeUrl(TOKEN, "rpms")).toBe(
      `https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=rpms`
    );
    expect(footerLinks(TOKEN, "digest")).toEqual({
      manageUrl: "https://www.avenuemission.com/leaders/emails",
      unsubscribeUrl: `https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=digest`,
      unsubscribeAllUrl: `https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=all`,
    });
  });

  it("builds RFC 8058 one-click headers", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    expect(listUnsubscribeHeaders(TOKEN, "milestones")).toEqual({
      "List-Unsubscribe": `<https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=milestones>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("esc", () => {
  it("escapes the five HTML characters", () => {
    expect(esc(`<a href="x">Tom & Jo's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jo&#39;s&lt;/a&gt;");
  });
});

describe("renderEmail", () => {
  it("is table-based, inline-styled, 600 px wide, night ground, Georgia, blue button, lamp accent, text wordmark", () => {
    const { html } = renderEmail(content());
    expect(html).toContain('role="presentation"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("#05070c");
    expect(html).toContain("Georgia");
    expect(html).toContain("#4f7cff");
    expect(html).toContain("#ffc56b");
    expect(html).toContain(">Avenue<");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<style");
    expect(html).toContain("A short preview line.");
    expect(html).toContain("Good morning, Sam.");
    expect(html).toContain('href="https://www.avenuemission.com/leaders"');
  });

  it("escapes content in the HTML and keeps it plain in the text", () => {
    const email = renderEmail(content({ heading: "Hi <b>Sam</b> & co" }));
    expect(email.html).toContain("Hi &lt;b&gt;Sam&lt;/b&gt; &amp; co");
    expect(email.html).not.toContain("<b>Sam</b>");
    expect(email.text).toContain("Hi <b>Sam</b> & co");
  });

  it("refuses a link or button that is not http or https", () => {
    expect(() =>
      renderEmail(content({ blocks: [{ type: "link", label: "Guide", href: "javascript:alert(1)" }] }))
    ).toThrow("not http or https");
    expect(() => renderEmail(content({ cta: { label: "Go", href: "/leaders" } }))).toThrow("not http or https");
  });

  it("gives a plain-text version, both unsubscribe links, the manage link and the headers", () => {
    vi.stubEnv("AVENUE_SITE_URL", "");
    const email = renderEmail(content());
    expect(email.subject).toBe("Your week");
    expect(email.text).toContain("Good morning, Sam.");
    expect(email.text).toContain("- One");
    expect(email.text).toContain("Pathways: 3");
    expect(email.text).toContain("Open the guide: https://example.invalid/guide.pdf");
    expect(email.text).toContain("Check in now: https://www.avenuemission.com/leaders");
    expect(email.text).toContain(`Unsubscribe from these: https://www.avenuemission.com/api/email/unsubscribe?token=${TOKEN}&kind=digest`);
    expect(email.html).toContain(`kind=digest`);
    expect(email.html).toContain(`kind=all`);
    expect(email.html).toContain("https://www.avenuemission.com/leaders/emails");
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(email.html + email.text + email.subject).not.toContain(DASH);
  });
});
```

- [ ] **Step 5: Run it to see it fail**

Run: `npx vitest run src/lib/emails/layout.test.ts`
Expected: FAIL, "Failed to resolve import ./layout".

- [ ] **Step 6: Write `src/lib/emails/layout.ts`**

```ts
// The branded frame every leader email shares (spec 3.2). Pure.
// Mail clients handle <style> blocks and web fonts unevenly (Gmail strips
// some, Outlook renders with Word), so this is nested tables with inline
// styles only, Georgia for headings, and the Avenue wordmark as text: no
// remote image has to load for the email to look right.
import type { EmailKind } from "./prefs";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

export interface FooterLinks {
  manageUrl: string;
  unsubscribeUrl: string;
  unsubscribeAllUrl: string;
}

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "stats"; rows: { label: string; value: string }[] }
  | { type: "link"; label: string; href: string };

export interface EmailContent {
  kind: EmailKind;
  token: string;
  subject: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  blocks: Block[];
  cta?: { label: string; href: string };
}

export const COLOURS = {
  ground: "#05070c",
  card: "#0b1020",
  line: "#1c2436",
  ink: "#f4f1ea",
  muted: "#a3a9b8",
  lamp: "#ffc56b",
  button: "#4f7cff",
} as const;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function siteUrl(): string {
  const raw = process.env.AVENUE_SITE_URL?.trim();
  return (raw || "https://www.avenuemission.com").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function unsubscribeUrl(token: string, kind: EmailKind | "all"): string {
  return absoluteUrl(`/api/email/unsubscribe?token=${encodeURIComponent(token)}&kind=${kind}`);
}

export function footerLinks(token: string, kind: EmailKind): FooterLinks {
  return {
    manageUrl: absoluteUrl("/leaders/emails"),
    unsubscribeUrl: unsubscribeUrl(token, kind),
    unsubscribeAllUrl: unsubscribeUrl(token, "all"),
  };
}

// RFC 8058: mail clients that show their own "Unsubscribe" button POST
// "List-Unsubscribe=One-Click" to this URL.
export function listUnsubscribeHeaders(token: string, kind: EmailKind): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(token, kind)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only web links belong in an email. esc keeps an href inside its quotes,
// but a "javascript:" or "data:" link would survive it, so renderEmail
// refuses anything that is not an absolute http or https URL.
export function isHttpUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function assertWebLinks(content: EmailContent): void {
  const hrefs = content.blocks.flatMap((b) => (b.type === "link" ? [b.href] : []));
  if (content.cta) hrefs.push(content.cta.href);
  for (const href of hrefs) {
    if (!isHttpUrl(href)) throw new Error(`renderEmail: refusing a link that is not http or https: ${href}`);
  }
}

const TEXT = `font-family:${SANS};font-size:16px;line-height:1.6;color:${COLOURS.ink};`;

function blockHtml(block: Block): string {
  switch (block.type) {
    case "p":
      return `<p style="margin:0 0 16px 0;${TEXT}">${esc(block.text)}</p>`;
    case "h":
      return `<h2 style="margin:28px 0 10px 0;font-family:${SERIF};font-size:20px;line-height:1.3;font-weight:normal;color:${COLOURS.lamp};">${esc(block.text)}</h2>`;
    case "list":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">${block.items
        .map(
          (item) =>
            `<tr><td width="18" valign="top" style="${TEXT}color:${COLOURS.lamp};">&#8226;</td><td style="${TEXT}">${esc(item)}</td></tr>`
        )
        .join("")}</table>`;
    case "stats":
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;">${block.rows
        .map(
          (row) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid ${COLOURS.line};font-family:${SANS};font-size:15px;color:${COLOURS.muted};">${esc(row.label)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${COLOURS.line};font-family:${SANS};font-size:15px;font-weight:bold;color:${COLOURS.ink};">${esc(row.value)}</td></tr>`
        )
        .join("")}</table>`;
    case "link":
      return `<p style="margin:0 0 16px 0;${TEXT}"><a href="${esc(block.href)}" style="color:${COLOURS.lamp};text-decoration:underline;">${esc(block.label)}</a></p>`;
  }
}

function blockText(block: Block): string[] {
  switch (block.type) {
    case "p":
      return [block.text, ""];
    case "h":
      return [block.text.toUpperCase(), ""];
    case "list":
      return [...block.items.map((item) => `- ${item}`), ""];
    case "stats":
      return [...block.rows.map((row) => `${row.label}: ${row.value}`), ""];
    case "link":
      return [`${block.label}: ${block.href}`, ""];
  }
}

function renderHtml(content: EmailContent, footer: FooterLinks): string {
  const cta = content.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 4px 0;"><tr><td bgcolor="${COLOURS.button}" style="border-radius:999px;background-color:${COLOURS.button};"><a href="${esc(content.cta.href)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:16px;font-weight:bold;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(content.cta.label)}</a></td></tr></table>`
    : "";
  const link = `color:${COLOURS.muted};text-decoration:underline;`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOURS.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOURS.ground};">${esc(content.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${COLOURS.ground}" style="background-color:${COLOURS.ground};">
<tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 0 24px 4px;font-family:${SERIF};font-size:30px;line-height:1;color:${COLOURS.ink};">Avenue<span style="color:${COLOURS.lamp};">.</span></td></tr>
<tr><td bgcolor="${COLOURS.card}" style="background-color:${COLOURS.card};border:1px solid ${COLOURS.line};border-radius:16px;padding:32px 28px;">
<p style="margin:0 0 8px 0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLOURS.lamp};">${esc(content.eyebrow)}</p>
<h1 style="margin:0 0 20px 0;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:normal;color:${COLOURS.ink};">${esc(content.heading)}</h1>
${content.blocks.map(blockHtml).join("\n")}
${cta}
</td></tr>
<tr><td style="padding:24px 8px 0 8px;font-family:${SANS};font-size:12px;line-height:1.8;color:${COLOURS.muted};">
You get this because you lead with Avenue Mission.<br>
<a href="${esc(footer.manageUrl)}" style="${link}">Manage emails</a> &nbsp;|&nbsp; <a href="${esc(footer.unsubscribeUrl)}" style="${link}">Unsubscribe from these</a> &nbsp;|&nbsp; <a href="${esc(footer.unsubscribeAllUrl)}" style="${link}">Unsubscribe from all</a>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

function renderText(content: EmailContent, footer: FooterLinks): string {
  const lines = ["AVENUE", "", content.eyebrow, content.heading, "", ...content.blocks.flatMap(blockText)];
  if (content.cta) lines.push(`${content.cta.label}: ${content.cta.href}`, "");
  lines.push(
    "--",
    "You get this because you lead with Avenue Mission.",
    `Manage emails: ${footer.manageUrl}`,
    `Unsubscribe from these: ${footer.unsubscribeUrl}`,
    `Unsubscribe from all: ${footer.unsubscribeAllUrl}`
  );
  return lines.join("\n");
}

export function renderEmail(content: EmailContent): RenderedEmail {
  assertWebLinks(content);
  const footer = footerLinks(content.token, content.kind);
  return {
    subject: content.subject,
    html: renderHtml(content, footer),
    text: renderText(content, footer),
    headers: listUnsubscribeHeaders(content.token, content.kind),
  };
}
```

(The footer line "You get this because you lead with Avenue Mission." is plan copy: add `// Henry to check wording` above `function renderHtml` and above `function renderText`.)

- [ ] **Step 7: Run it to see it pass**

Run: `npx vitest run src/lib/emails/layout.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 8: Write the failing template tests**

Create `src/lib/emails/templates.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailKind } from "./prefs";
import type { RenderedEmail } from "./layout";
import {
  apprenticeEmail,
  churchHealthEmail,
  digestEmail,
  milestoneEmail,
  rpmsEmail,
  type DigestTopic,
} from "./templates";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const SITE = "https://www.avenuemission.com";
const DASH = String.fromCharCode(0x2014);

beforeEach(() => {
  vi.stubEnv("AVENUE_SITE_URL", "");
});

// Every email: per-kind and all-kinds unsubscribe links, the one-click
// header for its own kind, a plain-text version, and no em dash anywhere.
function expectCommon(email: RenderedEmail, kind: EmailKind) {
  expect(email.html).toContain(`${SITE}/api/email/unsubscribe?token=${TOKEN}&amp;kind=${kind}`);
  expect(email.html).toContain(`${SITE}/api/email/unsubscribe?token=${TOKEN}&amp;kind=all`);
  expect(email.headers["List-Unsubscribe"]).toBe(`<${SITE}/api/email/unsubscribe?token=${TOKEN}&kind=${kind}>`);
  expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  expect(email.text).toContain(`Unsubscribe from these: ${SITE}/api/email/unsubscribe?token=${TOKEN}&kind=${kind}`);
  expect(email.subject + email.html + email.text).not.toContain(DASH);
}

const topic: DigestTopic = {
  title: "Joy in trials",
  series: "James",
  passage: "James 1",
  href: "https://example.invalid/james-1.pdf",
};

describe("rpmsEmail", () => {
  it("shows last week's four scores and links to this week's check-in", () => {
    const email = rpmsEmail({
      firstName: "Sam",
      token: TOKEN,
      lastWeek: { relational: 7, physical: 6, mental: 5, spiritual: 8 },
    });
    expect(email.subject).toBe("Your Sunday check-in");
    expect(email.text).toContain("How are you, really, Sam?");
    expect(email.text).toContain("Relational: 7/10");
    expect(email.text).toContain("Spiritual: 8/10");
    expect(email.text).toContain(`Check in now: ${SITE}/leaders/training?phase=phase4`);
    expectCommon(email, "rpms");
  });

  it("says so when there was no check-in last week", () => {
    const email = rpmsEmail({ firstName: "Sam", token: TOKEN, lastWeek: null });
    expect(email.text).toContain("There was no check-in last week.");
    expect(email.text).not.toContain("/10");
  });
});

describe("digestEmail", () => {
  it("carries the topic, the trend, the follow-ups and the next step", () => {
    const email = digestEmail({
      firstName: "Sam",
      token: TOKEN,
      weekOf: "2026-10-05",
      topic,
      trend: [
        { weekStart: "2026-09-07", average: 6.5 },
        { weekStart: "2026-09-14", average: null },
        { weekStart: "2026-09-21", average: 7 },
        { weekStart: "2026-09-28", average: 8.3 },
      ],
      followUps: ["Jo Park", "Lee"],
      next: { text: "3 of 6 Calling sections done.", label: "Continue Calling", href: `${SITE}/leaders/training/calling` },
    });
    expect(email.subject).toBe("Your week: Joy in trials");
    expect(email.text).toContain("Week of 5 October");
    expect(email.text).toContain("Joy in trials (James)");
    expect(email.text).toContain("Read: James 1");
    expect(email.text).toContain("Open the guide: https://example.invalid/james-1.pdf");
    expect(email.text).toContain("Week of 7 September: 6.5 out of 10");
    expect(email.text).toContain("Week of 14 September: No check-in");
    expect(email.text).toContain("- Jo Park");
    expect(email.text).toContain("3 of 6 Calling sections done.");
    expect(email.text).toContain(`Continue Calling: ${SITE}/leaders/training/calling`);
    expectCommon(email, "digest");
  });

  it("reads well with no topic, no check-ins and nobody new", () => {
    const email = digestEmail({
      firstName: "Sam",
      token: TOKEN,
      weekOf: "2026-10-05",
      topic: null,
      trend: [
        { weekStart: "2026-09-07", average: null },
        { weekStart: "2026-09-14", average: null },
      ],
      followUps: [],
      next: { text: "All five streetlights on.", label: "Open Growth", href: `${SITE}/leaders/training?phase=phase4` },
    });
    expect(email.subject).toBe("Your week ahead");
    expect(email.text).toContain("No Pathways guide is set for this week yet.");
    expect(email.text).toContain("No check-ins in the last four weeks.");
    expect(email.text).toContain("No new people in the last 30 days.");
  });
});

describe("churchHealthEmail", () => {
  it("asks for the three lists, with counts, change and church totals", () => {
    const email = churchHealthEmail({
      firstName: "Sam",
      token: TOKEN,
      monthLabel: "October 2026",
      mine: {
        pathways: { count: 5, change: 2 },
        intersections: { count: 1, change: 0 },
        streetlights: { count: 3, change: -1 },
      },
      church: { pathways: 40, intersections: 12, streetlights: 25 },
    });
    expect(email.subject).toBe("Church health for October 2026");
    expect(email.text).toContain("Pathways: 5 (+2 this past month)");
    expect(email.text).toContain("Intersections: 1 (no change this past month)");
    expect(email.text).toContain("Streetlights: 3 (-1 this past month)");
    expect(email.text).toContain("Pathways: 40");
    expect(email.text).toContain(`Update your lists: ${SITE}/leaders/training?phase=phase4`);
    expectCommon(email, "church_health");
  });
});

describe("apprenticeEmail", () => {
  it("names each apprentice's rung and the next step with a how-to", () => {
    const email = apprenticeEmail({
      firstName: "Sam",
      token: TOKEN,
      apprentices: [
        { name: "Jo Park", step: 0 },
        { name: "Lee", step: 2 },
        { name: "Max", step: 5 },
      ],
    });
    expect(email.subject).toBe("Your apprentices this month");
    expect(email.text).toContain("JO PARK");
    expect(email.text).toContain("Now: Not started yet.");
    expect(email.text).toContain("Next: I do, you watch. Bring them along and let them watch you lead one gathering.");
    expect(email.text).toContain("Next: You do, I help.");
    expect(email.text).toContain("They are on the last step. Help them find their own apprentice to bring along.");
    expect(email.text).toContain(`Open Multiply: ${SITE}/leaders/training?phase=phase5`);
    expectCommon(email, "apprentice");
  });
});

describe("milestoneEmail", () => {
  it("celebrates a walked phase and names what is next", () => {
    const email = milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "walked", stop: "phase1" } });
    expect(email.subject).toBe("You walked Foundations");
    expect(email.text).toContain("Calling is next");
    expect(email.text).toContain(`Open your avenue: ${SITE}/leaders`);
    expectCommon(email, "milestones");
  });

  it("marks Growth and Multiply as ongoing rhythms", () => {
    const growth = milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "ongoing", stop: "phase4" } });
    expect(growth.subject).toBe("Growth is lit");
    expect(growth.text).toContain(`Open Growth: ${SITE}/leaders/training?phase=phase4`);
    const multiply = milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "ongoing", stop: "phase5" } });
    expect(multiply.subject).toBe("Multiply is lit");
    expectCommon(multiply, "milestones");
  });

  it("counts down to the launch date at 30, 7 and 1 days", () => {
    const at = (daysBefore: 30 | 7 | 1) =>
      milestoneEmail({ firstName: "Sam", token: TOKEN, milestone: { type: "launch", daysBefore, launchDate: "2026-10-12" } });
    expect(at(30).subject).toBe("30 days until you launch");
    expect(at(7).subject).toBe("One week until you launch");
    expect(at(1).subject).toBe("You launch tomorrow");
    expect(at(7).text).toContain("Your launch date is 12 October 2026.");
    expect(at(7).text).toContain(`Open your Launch Plan: ${SITE}/leaders/training/launch/plan`);
    expectCommon(at(1), "milestones");
  });

  it("escapes a name in the HTML", () => {
    const email = milestoneEmail({ firstName: "<b>Sam</b>", token: TOKEN, milestone: { type: "walked", stop: "phase2" } });
    expect(email.html).toContain("&lt;b&gt;Sam&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Sam</b>");
  });
});
```

Note the `&amp;` in the HTML assertions: `esc` escapes the `&` inside `href` attributes, which is correct HTML; mail clients decode it back to `&`.

- [ ] **Step 9: Run it to see it fail**

Run: `npx vitest run src/lib/emails/templates.test.ts`
Expected: FAIL, "Failed to resolve import ./templates".

- [ ] **Step 10: Write `src/lib/emails/templates.ts`**

```ts
// The five leader emails (spec 3.2). Pure: each takes plain data and
// returns { subject, html, text, headers } through renderEmail. compose.ts
// decides who gets which email with which data.
// Henry to check wording (every string in this file)
import { STOP_NAMES } from "@/lib/avenue";
import { APPRENTICE_HOW_TO, apprenticeStepLabel } from "@/lib/apprentice";
import { METRICS, type Metric } from "@/lib/people";
import { GAUGES, type GaugeScores } from "@/lib/rpms";
import { METRIC_LABELS, type MetricCounts } from "@/lib/churchHealth";
import { dayMonthLabel } from "@/lib/melbourneDate";
import { absoluteUrl, renderEmail, type Block, type RenderedEmail } from "./layout";

export const LINKS = {
  dashboard: "/leaders",
  growth: "/leaders/training?phase=phase4",
  multiply: "/leaders/training?phase=phase5",
  launchPlan: "/leaders/training/launch/plan",
  studyGuides: "/leaders/study-guides",
} as const;

interface Base {
  firstName: string;
  token: string;
}

export function rpmsEmail(input: Base & { lastWeek: GaugeScores | null }): RenderedEmail {
  const blocks: Block[] = [
    {
      type: "p",
      text: "Before the week turns over, take five minutes to check in on your four gauges: Relational, Physical, Mental and Spiritual.",
    },
  ];
  const last = input.lastWeek;
  if (last) {
    blocks.push(
      { type: "h", text: "Last week" },
      { type: "stats", rows: GAUGES.map((g) => ({ label: g.label, value: `${last[g.key]}/10` })) }
    );
  } else {
    blocks.push({ type: "p", text: "There was no check-in last week. This is a good week to start again." });
  }
  blocks.push({ type: "p", text: "A few honest numbers each week show you the trend before it becomes a problem." });
  return renderEmail({
    kind: "rpms",
    token: input.token,
    subject: "Your Sunday check-in",
    preheader: "Five minutes with your four gauges before the week turns over.",
    eyebrow: "Sunday reflection",
    heading: `How are you, really, ${input.firstName}?`,
    blocks,
    cta: { label: "Check in now", href: absoluteUrl(LINKS.growth) },
  });
}

export interface DigestTopic {
  title: string;
  series: string | null;
  passage: string | null;
  href: string;
}

export interface DigestInput extends Base {
  weekOf: string;
  topic: DigestTopic | null;
  trend: { weekStart: string; average: number | null }[];
  followUps: string[];
  next: { text: string; label: string; href: string };
}

export function digestEmail(input: DigestInput): RenderedEmail {
  const blocks: Block[] = [{ type: "h", text: "This week in Pathways" }];
  const t = input.topic;
  if (t) {
    blocks.push({ type: "p", text: t.series ? `${t.title} (${t.series})` : t.title });
    if (t.passage) blocks.push({ type: "p", text: `Read: ${t.passage}` });
    blocks.push({ type: "link", label: "Open the guide", href: t.href });
  } else {
    blocks.push({ type: "p", text: "No Pathways guide is set for this week yet." });
  }

  blocks.push({ type: "h", text: "Your last four weeks" });
  if (input.trend.every((w) => w.average === null)) {
    blocks.push({ type: "p", text: "No check-ins in the last four weeks." });
  } else {
    blocks.push({
      type: "stats",
      rows: input.trend.map((w) => ({
        label: `Week of ${dayMonthLabel(w.weekStart)}`,
        value: w.average === null ? "No check-in" : `${w.average} out of 10`,
      })),
    });
  }

  blocks.push({ type: "h", text: "People to follow up" });
  if (input.followUps.length > 0) {
    blocks.push(
      { type: "p", text: "You added these people in the last 30 days. A message from you this week could mean a lot." },
      { type: "list", items: input.followUps }
    );
  } else {
    blocks.push({ type: "p", text: "No new people in the last 30 days." });
  }

  blocks.push({ type: "h", text: "Your next step" }, { type: "p", text: input.next.text });

  return renderEmail({
    kind: "digest",
    token: input.token,
    subject: t ? `Your week: ${t.title}` : "Your week ahead",
    preheader: t ? `This week in Pathways: ${t.title}.` : "Your week at a glance.",
    eyebrow: `Week of ${dayMonthLabel(input.weekOf)}`,
    heading: `Good morning, ${input.firstName}.`,
    blocks,
    cta: { label: input.next.label, href: input.next.href },
  });
}

export interface ChurchHealthEmailInput extends Base {
  monthLabel: string;
  mine: Record<Metric, { count: number; change: number }>;
  church: MetricCounts;
}

function changeText(change: number): string {
  if (change === 0) return "no change this past month";
  return `${change > 0 ? "+" : ""}${change} this past month`;
}

export function churchHealthEmail(input: ChurchHealthEmailInput): RenderedEmail {
  const blocks: Block[] = [
    {
      type: "p",
      text: "Take ten minutes to bring your Pathways, Intersections and Streetlights lists up to date. Add the new names, and thank God for each one.",
    },
    { type: "h", text: "Your lists" },
    {
      type: "stats",
      rows: METRICS.map((m) => ({
        label: METRIC_LABELS[m],
        value: `${input.mine[m].count} (${changeText(input.mine[m].change)})`,
      })),
    },
    { type: "h", text: "Across Avenue" },
    { type: "stats", rows: METRICS.map((m) => ({ label: METRIC_LABELS[m], value: String(input.church[m]) })) },
    { type: "p", text: "Every name is a person someone is praying for. Thank you for being part of it." },
  ];
  return renderEmail({
    kind: "church_health",
    token: input.token,
    subject: `Church health for ${input.monthLabel}`,
    preheader: "A moment to update your three lists, and to see what God is doing across Avenue.",
    eyebrow: "Monthly church health",
    heading: `${input.monthLabel}: your three lists`,
    blocks,
    cta: { label: "Update your lists", href: absoluteUrl(LINKS.growth) },
  });
}

export interface ApprenticeInput extends Base {
  apprentices: { name: string; step: number }[];
}

export function apprenticeEmail(input: ApprenticeInput): RenderedEmail {
  const blocks: Block[] = [
    {
      type: "p",
      text: "Here is where each person you have sent out is on Hero Maker's five steps, and one way to help them take the next one.",
    },
  ];
  for (const a of input.apprentices) {
    blocks.push({ type: "h", text: a.name }, { type: "p", text: `Now: ${apprenticeStepLabel(a.step)}.` });
    blocks.push(
      a.step < 5
        ? { type: "p", text: `Next: ${apprenticeStepLabel(a.step + 1)}. ${APPRENTICE_HOW_TO[a.step + 1]}` }
        : { type: "p", text: `They are on the last step. ${APPRENTICE_HOW_TO[5]}` }
    );
  }
  return renderEmail({
    kind: "apprentice",
    token: input.token,
    subject: "Your apprentices this month",
    preheader: "Where each person you are apprenticing is, and the next step.",
    eyebrow: "Multiply",
    heading: `Who are you raising up, ${input.firstName}?`,
    blocks,
    cta: { label: "Open Multiply", href: absoluteUrl(LINKS.multiply) },
  });
}

export type Milestone =
  | { type: "walked"; stop: "phase1" | "phase2" | "phase3" }
  | { type: "ongoing"; stop: "phase4" | "phase5" }
  | { type: "launch"; daysBefore: 30 | 7 | 1; launchDate: string };

const WALKED_NEXT: Record<"phase1" | "phase2" | "phase3", string> = {
  phase1: "Calling is next: discovering the people and the place God is sending you to.",
  phase2: "Launch is next: turning your calling into a plan and a first gathering.",
  phase3: "Growth is next: a weekly check-in to keep you healthy as you lead.",
};

const ONGOING_TEXT: Record<"phase4" | "phase5", string> = {
  phase4:
    "You have done your first weekly check-in. Growth is a rhythm, not a finish line, so this streetlight stays on while you keep coming back.",
  phase5: "You have started apprenticing someone. Multiply is a rhythm too: every leader you raise up can raise up another.",
};

const LAUNCH_COPY: Record<30 | 7 | 1, { subject: string; heading: string; text: string }> = {
  30: {
    subject: "30 days until you launch",
    heading: "A month to go",
    text: "A month out is the time to confirm your space and start inviting.",
  },
  7: {
    subject: "One week until you launch",
    heading: "One week to go",
    text: "This week: confirm your team, pray together, and send a personal invite to everyone on your list.",
  },
  1: {
    subject: "You launch tomorrow",
    heading: "Tomorrow is the day",
    text: "Pray, prepare the space, and expect God to be at work.",
  },
};

export function milestoneEmail(input: Base & { milestone: Milestone }): RenderedEmail {
  const m = input.milestone;
  if (m.type === "walked") {
    const name = STOP_NAMES[m.stop];
    return renderEmail({
      kind: "milestones",
      token: input.token,
      subject: `You walked ${name}`,
      preheader: "Another streetlight on your avenue is lit.",
      eyebrow: "Milestone",
      heading: `A streetlight is on, ${input.firstName}.`,
      blocks: [
        { type: "p", text: `You have walked ${name}. That streetlight on your avenue is now lit.` },
        { type: "p", text: WALKED_NEXT[m.stop] },
      ],
      cta: { label: "Open your avenue", href: absoluteUrl(LINKS.dashboard) },
    });
  }
  if (m.type === "ongoing") {
    const name = STOP_NAMES[m.stop];
    return renderEmail({
      kind: "milestones",
      token: input.token,
      subject: `${name} is lit`,
      preheader: `${name} is a rhythm you have now started.`,
      eyebrow: "Milestone",
      heading: `${name} is lit, ${input.firstName}.`,
      blocks: [{ type: "p", text: ONGOING_TEXT[m.stop] }],
      cta:
        m.stop === "phase4"
          ? { label: "Open Growth", href: absoluteUrl(LINKS.growth) }
          : { label: "Open Multiply", href: absoluteUrl(LINKS.multiply) },
    });
  }
  const copy = LAUNCH_COPY[m.daysBefore];
  return renderEmail({
    kind: "milestones",
    token: input.token,
    subject: copy.subject,
    preheader: copy.text,
    eyebrow: "Launch countdown",
    heading: `${copy.heading}, ${input.firstName}.`,
    blocks: [
      { type: "p", text: `Your launch date is ${dayMonthLabel(m.launchDate)} ${m.launchDate.slice(0, 4)}.` },
      { type: "p", text: copy.text },
    ],
    cta: { label: "Open your Launch Plan", href: absoluteUrl(LINKS.launchPlan) },
  });
}
```

- [ ] **Step 11: Run it to see it pass**

Run: `npx vitest run src/lib/emails/templates.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 12: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 397 tests pass (378 + 1 + 8 + 10); lint at most 54; build passes.

- [ ] **Step 13: Commit**

```bash
git add src/lib/apprentice.ts src/lib/apprentice.test.ts src/app/leaders/training/Phase5Multiply.tsx src/lib/email.ts src/lib/emails/layout.ts src/lib/emails/layout.test.ts src/lib/emails/templates.ts src/lib/emails/templates.test.ts
git commit -m "Leader emails: branded table layout and the five templates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Compose: who gets what from a snapshot (TDD)

**Files:**
- Create: `src/lib/emails/compose.ts`
- Test: `src/lib/emails/compose.test.ts`

**Interfaces:**
- Consumes: `apprenticesOnRung`, `avenueStops`, `hereActionFor`, `stopWalked`, `AvenueProgress` from `src/lib/avenue.ts`; `callingCompleteCount`, `launchCompleteCount`, `isIsoDate`, `recordOf` from `src/lib/journey.ts`; `countMetrics`, `fullName`, `normEmail` and row types (Task 2); Melbourne helpers (Task 2); `PREVIEW_TOKEN`, `EmailKind`, `LeaderRow`, `PrefsRow`, `Recipient` (Task 4); `periodKeyFor` (Task 5); `topicForWeek`, `GuideRow` (Task 5); templates, `LINKS`, `Milestone`, `absoluteUrl`, `isHttpUrl`, `RenderedEmail` (Task 6).
- Produces:
  - `interface NetworkRow { id: string; email: string | null; first_name: string; last_name: string | null; sent_out_by: string | null; apprentice_step: number | null }`
  - `interface TrainingRow { email: string; completed_modules: string[] | null }`
  - `interface WorksheetRow { email: string; kind: string; data: unknown }`
  - `interface Snapshot { now: Date; leaders: LeaderRow[]; prefs: PrefsRow[]; profiles: HealthProfileRow[]; checkins: HealthCheckinRow[]; people: HealthPersonRow[]; network: NetworkRow[]; training: TrainingRow[]; worksheets: WorksheetRow[]; guides: GuideRow[]; foundationsModuleIds: string[] }`
  - `interface Outgoing { kind: EmailKind; email: string; periodKey: string; baselineable: boolean; message: RenderedEmail }`
  - `firstNameOf(recipient: Recipient, snap: Snapshot): string`
  - `progressFor(email: string, snap: Snapshot): AvenueProgress`
  - `milestonesFor(email: string, snap: Snapshot): Milestone[]`
  - `milestoneKey(m: Milestone): string`
  - `composeFor(kind: EmailKind, recipient: Recipient, snap: Snapshot): Outgoing[]` (empty when there is nothing to send, e.g. no apprentices, no milestone)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/emails/compose.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HealthCheckinRow, HealthPersonRow } from "@/lib/churchHealth";
import type { Recipient } from "./prefs";
import { composeFor, progressFor, type NetworkRow, type Snapshot } from "./compose";

const SAM = "sam@example.invalid";
const OTHER = "other@example.invalid";
const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const SITE = "https://www.avenuemission.com";
const recipient: Recipient = { email: SAM, name: "Samuel Stone", token: TOKEN };

// Monday 5 October 2026, 07:00 in Melbourne (AEDT).
const MONDAY_7AM = new Date("2026-10-04T20:00:00Z");

function snap(over: Partial<Snapshot> = {}): Snapshot {
  return {
    now: MONDAY_7AM,
    leaders: [
      { email: SAM, name: "Samuel Stone", full_access: true },
      { email: OTHER, name: "Other", full_access: true },
    ],
    prefs: [],
    profiles: [{ email: SAM, display_name: "Sam Stone", pathway_group: null }],
    checkins: [],
    people: [],
    network: [],
    training: [],
    worksheets: [],
    guides: [],
    foundationsModuleIds: ["p1m0", "p1m1"],
    ...over,
  };
}

const checkin = (email: string, week_start: string, r: number, p: number, m: number, s: number): HealthCheckinRow => ({
  email,
  week_start,
  relational: r,
  physical: p,
  mental: m,
  spiritual: s,
});

const person = (owner_email: string, first_name: string, created_at: string, metrics: string[] = []): HealthPersonRow => ({
  owner_email,
  first_name,
  last_name: null,
  metrics,
  created_at,
});

const node = (id: string, first_name: string, sent_out_by: string | null, step: number | null, email: string | null = null): NetworkRow => ({
  id,
  email,
  first_name,
  last_name: null,
  sent_out_by,
  apprentice_step: step,
});

beforeEach(() => {
  vi.stubEnv("AVENUE_SITE_URL", "");
});

describe("composeFor rpms", () => {
  // Sunday 4 October 2026, 19:00 in Melbourne. This week's Monday is
  // 28 September, so last week's check-in is the one for 21 September.
  const SUNDAY_EVENING = new Date("2026-10-04T08:00:00Z");

  it("sends last week's scores to the recipient only, keyed by the Sunday", () => {
    const [out, ...rest] = composeFor(
      "rpms",
      recipient,
      snap({
        now: SUNDAY_EVENING,
        checkins: [checkin(SAM, "2026-09-21", 7, 6, 5, 8), checkin(SAM, "2026-09-28", 1, 1, 1, 1), checkin(OTHER, "2026-09-21", 2, 2, 2, 2)],
      })
    );
    expect(rest).toEqual([]);
    expect(out).toMatchObject({ kind: "rpms", email: SAM, periodKey: "2026-10-04", baselineable: false });
    expect(out.message.text).toContain("How are you, really, Sam?");
    expect(out.message.text).toContain("Relational: 7/10");
  });

  it("says there was no check-in when last week is missing", () => {
    const [out] = composeFor("rpms", recipient, snap({ now: SUNDAY_EVENING }));
    expect(out.message.text).toContain("There was no check-in last week.");
  });
});

describe("composeFor digest", () => {
  it("uses this week's guide, keyed by the Monday, linking only to a web address", () => {
    const guides = [
      { id: "g1", guide_date: "07/10/2026", series: "James", topic: "Joy in trials", scripture: "James 1", pdf_url: "https://example.invalid/j1.pdf" },
    ];
    const [out] = composeFor("digest", recipient, snap({ guides }));
    expect(out.periodKey).toBe("2026-10-05");
    expect(out.message.subject).toBe("Your week: Joy in trials");
    expect(out.message.text).toContain("Open the guide: https://example.invalid/j1.pdf");

    const noPdf = [{ ...guides[0], pdf_url: null }];
    const [fallback] = composeFor("digest", recipient, snap({ guides: noPdf }));
    expect(fallback.message.text).toContain(`Open the guide: ${SITE}/leaders/study-guides`);

    const unsafe = [{ ...guides[0], pdf_url: "javascript:alert(1)" }];
    const [safe] = composeFor("digest", recipient, snap({ guides: unsafe }));
    expect(safe.message.text).toContain(`Open the guide: ${SITE}/leaders/study-guides`);
    expect(safe.message.html).not.toContain("javascript:");
  });

  it("names at most three of their own people from the last 30 days, newest first", () => {
    const people = [
      person(SAM, "Dee", "2026-09-06T00:00:00Z"),
      person(SAM, "Ann", "2026-10-01T00:00:00Z"),
      person(SAM, "Ben", "2026-09-20T00:00:00Z"),
      person(SAM, "Cal", "2026-09-10T00:00:00Z"),
      person(SAM, "Old", "2026-08-01T00:00:00Z"),
      person(OTHER, "Fay", "2026-10-02T00:00:00Z"),
    ];
    const text = composeFor("digest", recipient, snap({ people }))[0].message.text;
    expect(text).toContain("- Ann\n- Ben\n- Cal");
    expect(text).not.toContain("- Dee");
    expect(text).not.toContain("- Old");
    expect(text).not.toContain("- Fay");
  });

  it("shows the four weeks before this Monday", () => {
    const text = composeFor("digest", recipient, snap({ checkins: [checkin(SAM, "2026-09-07", 6, 7, 6, 7)] }))[0].message.text;
    expect(text).toContain("Week of 7 September: 6.5 out of 10");
    expect(text).toContain("Week of 28 September: No check-in");
    expect(text).not.toContain("Week of 5 October:");
  });

  it("gives the next step at the stop they are at", () => {
    const text = composeFor("digest", recipient, snap({ training: [{ email: SAM, completed_modules: ["p1m0"] }] }))[0].message
      .text;
    expect(text).toContain("1 of 2 Foundations modules ticked.");
    expect(text).toContain(`Continue Foundations: ${SITE}/leaders/training?phase=phase1`);
  });
});

describe("composeFor church_health", () => {
  it("counts their lists, the change over the past month, and the whole church", () => {
    const people = [
      person(SAM, "Pat", "2026-08-15T00:00:00Z", ["pathways"]),
      person(SAM, "Ray", "2026-09-10T00:00:00Z", ["pathways", "streetlights"]),
      person(OTHER, "Ivy", "2026-05-01T00:00:00Z", ["intersections"]),
      person("gone@example.invalid", "Old", "2026-05-01T00:00:00Z", ["pathways"]),
    ];
    // Thursday 1 October 2026, 07:00 in Melbourne.
    const [out] = composeFor("church_health", recipient, snap({ now: new Date("2026-09-30T21:00:00Z"), people }));
    expect(out.periodKey).toBe("2026-10");
    expect(out.message.subject).toBe("Church health for October 2026");
    expect(out.message.text).toContain("Pathways: 2 (+1 this past month)");
    expect(out.message.text).toContain("Intersections: 0 (no change this past month)");
    expect(out.message.text).toContain("Streetlights: 1 (+1 this past month)");
    expect(out.message.text).toContain("Intersections: 1\n");
  });
});

describe("composeFor apprentice", () => {
  it("lists everyone they sent out with their rung", () => {
    const network = [
      node("n1", "Sam", null, 0, SAM),
      node("n2", "Jo", "n1", 2),
      node("n3", "Al", "n1", null),
      node("n4", "Zed", "other-node", 3),
    ];
    // Thursday 15 October 2026, 07:00 in Melbourne.
    const [out] = composeFor("apprentice", recipient, snap({ now: new Date("2026-10-14T20:00:00Z"), network }));
    expect(out.periodKey).toBe("2026-10");
    expect(out.message.text).toContain("AL\n\nNow: Not started yet.");
    expect(out.message.text).toContain("JO\n\nNow: I do, you help.");
    expect(out.message.text).not.toContain("ZED");
  });

  it("sends nothing to a leader with no apprentices", () => {
    expect(composeFor("apprentice", recipient, snap())).toEqual([]);
    expect(composeFor("apprentice", recipient, snap({ network: [node("n1", "Sam", null, 0, SAM)] }))).toEqual([]);
  });
});

describe("composeFor milestones", () => {
  it("lists every walked and ongoing stop, each baselineable, keyed by stop", () => {
    const out = composeFor(
      "milestones",
      recipient,
      snap({
        training: [{ email: SAM, completed_modules: ["p1m0", "p1m1"] }],
        checkins: [checkin(SAM, "2026-09-28", 5, 5, 5, 5)],
      })
    );
    expect(out.map((o) => o.periodKey)).toEqual(["phase1-walked", "phase4-ongoing"]);
    expect(out.every((o) => o.baselineable && o.kind === "milestones" && o.email === SAM)).toBe(true);
    expect(out[0].message.subject).toBe("You walked Foundations");
  });

  it("counts down to the launch date on the exact day only, never baselined", () => {
    const launch = (launchDate: string) => [{ email: SAM, kind: "launch", data: { rhythm: { launchDate } } }];
    const [out] = composeFor("milestones", recipient, snap({ worksheets: launch("2026-10-12") }));
    expect(out).toMatchObject({ periodKey: "launch-2026-10-12-7d", baselineable: false });
    expect(out.message.subject).toBe("One week until you launch");
    expect(composeFor("milestones", recipient, snap({ worksheets: launch("2026-10-13") }))).toEqual([]);
  });
});

describe("progressFor", () => {
  it("counts apprentices on a rung through the leader's own network node", () => {
    const network = [node("n1", "Sam", null, 0, "SAM@example.invalid"), node("n2", "Jo", "n1", 2), node("n3", "Al", "n1", 0)];
    expect(progressFor(SAM, snap({ network })).apprenticesOnRung).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/emails/compose.test.ts`
Expected: FAIL, "Failed to resolve import ./compose".

- [ ] **Step 3: Write `src/lib/emails/compose.ts`**

```ts
// Who gets which email with what data (spec 3.2). Pure: loadSnapshot.ts
// reads the tables once per run, and composeFor turns one recipient and one
// kind into zero or more ready-to-send emails. Every email it returns is
// addressed to that recipient and nobody else.
import { apprenticesOnRung, avenueStops, hereActionFor, stopWalked, type AvenueProgress } from "@/lib/avenue";
import {
  callingCompleteCount,
  isIsoDate,
  launchCompleteCount,
  recordOf,
  type CallingData,
  type LaunchData,
} from "@/lib/journey";
import { METRICS, type Metric } from "@/lib/people";
import {
  countMetrics,
  fullName,
  normEmail,
  type HealthCheckinRow,
  type HealthPersonRow,
  type HealthProfileRow,
} from "@/lib/churchHealth";
import {
  addDaysISO,
  addMonthsKey,
  daysBetweenISO,
  melbourneDateOf,
  melbourneParts,
  mondayOfISO,
  monthKeyOf,
  monthLabel,
} from "@/lib/melbourneDate";
import { absoluteUrl, isHttpUrl, type RenderedEmail } from "./layout";
import { PREVIEW_TOKEN, type EmailKind, type LeaderRow, type PrefsRow, type Recipient } from "./prefs";
import { periodKeyFor } from "./schedule";
import {
  apprenticeEmail,
  churchHealthEmail,
  digestEmail,
  LINKS,
  milestoneEmail,
  rpmsEmail,
  type DigestTopic,
  type Milestone,
} from "./templates";
import { topicForWeek, type GuideRow } from "./topic";

export interface NetworkRow {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string | null;
  sent_out_by: string | null;
  apprentice_step: number | null;
}

export interface TrainingRow {
  email: string;
  completed_modules: string[] | null;
}

export interface WorksheetRow {
  email: string;
  kind: string;
  data: unknown;
}

export interface Snapshot {
  now: Date;
  leaders: LeaderRow[];
  prefs: PrefsRow[];
  profiles: HealthProfileRow[];
  checkins: HealthCheckinRow[];
  people: HealthPersonRow[];
  network: NetworkRow[];
  training: TrainingRow[];
  worksheets: WorksheetRow[];
  guides: GuideRow[];
  foundationsModuleIds: string[];
}

export interface Outgoing {
  kind: EmailKind;
  email: string;
  periodKey: string;
  // True for milestones a leader can already have had before emails were
  // switched on (walked and ongoing stops). The engine records those as a
  // baseline on a leader's first live run instead of sending them.
  baselineable: boolean;
  message: RenderedEmail;
}

const FOLLOW_UP_DAYS = 30;
const FOLLOW_UP_MAX = 3;
const LAUNCH_COUNTDOWN = [30, 7, 1] as const;

function sheetOf(snap: Snapshot, email: string, kind: "calling" | "launch"): Record<string, unknown> {
  return recordOf(snap.worksheets.find((w) => normEmail(w.email) === email && w.kind === kind)?.data);
}

function nodeOf(snap: Snapshot, email: string): NetworkRow | undefined {
  return snap.network.find((n) => n.email !== null && normEmail(n.email) === email);
}

export function firstNameOf(recipient: Recipient, snap: Snapshot): string {
  const display = snap.profiles.find((p) => normEmail(p.email) === recipient.email)?.display_name?.trim();
  return (display || recipient.name).split(/\s+/)[0] || recipient.name;
}

// The same AvenueProgress the dashboard builds, from the snapshot.
export function progressFor(email: string, snap: Snapshot): AvenueProgress {
  const done = new Set(snap.training.find((t) => normEmail(t.email) === email)?.completed_modules ?? []);
  const me = nodeOf(snap, email);
  return {
    foundationsDone: snap.foundationsModuleIds.filter((id) => done.has(id)).length,
    foundationsTotal: snap.foundationsModuleIds.length,
    callingDone: callingCompleteCount(sheetOf(snap, email, "calling") as CallingData),
    launchDone: launchCompleteCount(sheetOf(snap, email, "launch") as LaunchData),
    checkinCount: snap.checkins.filter((c) => normEmail(c.email) === email).length,
    apprenticesOnRung: apprenticesOnRung(
      snap.network.map((n) => ({ sentOutBy: n.sent_out_by, apprenticeStep: n.apprentice_step ?? 0 })),
      me?.id ?? null
    ),
  };
}

// Every milestone the leader has right now. The log decides which are new.
export function milestonesFor(email: string, snap: Snapshot): Milestone[] {
  const p = progressFor(email, snap);
  const out: Milestone[] = [];
  for (const stop of ["phase1", "phase2", "phase3"] as const) if (stopWalked(stop, p)) out.push({ type: "walked", stop });
  for (const stop of ["phase4", "phase5"] as const) if (stopWalked(stop, p)) out.push({ type: "ongoing", stop });
  const launchDate = recordOf(sheetOf(snap, email, "launch").rhythm).launchDate;
  if (isIsoDate(launchDate)) {
    const days = daysBetweenISO(melbourneParts(snap.now).date, launchDate);
    for (const n of LAUNCH_COUNTDOWN) if (days === n) out.push({ type: "launch", daysBefore: n, launchDate });
  }
  return out;
}

export function milestoneKey(m: Milestone): string {
  switch (m.type) {
    case "walked":
      return `${m.stop}-walked`;
    case "ongoing":
      return `${m.stop}-ongoing`;
    case "launch":
      return `launch-${m.launchDate}-${m.daysBefore}d`;
  }
}

function gaugeAverage(row: HealthCheckinRow): number {
  return Math.round(((row.relational + row.physical + row.mental + row.spiritual) / 4) * 10) / 10;
}

function digestTopic(guides: GuideRow[], monday: string): DigestTopic | null {
  const found = topicForWeek(guides, monday).topic;
  if (!found) return null;
  const topic = found.guide.topic?.trim() || "";
  const series = found.guide.series?.trim() || "";
  const pdf = found.guide.pdf_url?.trim();
  return {
    // Henry to check wording
    title: topic || series || "This week's guide",
    series: topic && series ? series : null,
    passage: found.guide.scripture?.trim() || null,
    // A guide link that is not a web address falls back to the guides page.
    href: isHttpUrl(pdf) ? pdf : absoluteUrl(LINKS.studyGuides),
  };
}

export function composeFor(kind: EmailKind, recipient: Recipient, snap: Snapshot): Outgoing[] {
  const email = recipient.email;
  const token = recipient.token ?? PREVIEW_TOKEN;
  const firstName = firstNameOf(recipient, snap);
  const today = melbourneParts(snap.now).date;
  const thisMonday = mondayOfISO(today);
  const myCheckins = snap.checkins.filter((c) => normEmail(c.email) === email);
  const one = (periodKey: string, message: RenderedEmail, baselineable = false): Outgoing => ({
    kind,
    email,
    periodKey,
    baselineable,
    message,
  });

  switch (kind) {
    case "rpms": {
      const row = myCheckins.find((c) => c.week_start === addDaysISO(thisMonday, -7));
      const lastWeek = row
        ? { relational: row.relational, physical: row.physical, mental: row.mental, spiritual: row.spiritual }
        : null;
      return [one(periodKeyFor("rpms", snap.now), rpmsEmail({ firstName, token, lastWeek }))];
    }
    case "digest": {
      const trend = [28, 21, 14, 7].map((back) => {
        const weekStart = addDaysISO(thisMonday, -back);
        const row = myCheckins.find((c) => c.week_start === weekStart);
        return { weekStart, average: row ? gaugeAverage(row) : null };
      });
      const since = addDaysISO(today, -FOLLOW_UP_DAYS);
      const followUps = snap.people
        .filter((p) => normEmail(p.owner_email) === email && melbourneDateOf(p.created_at) >= since)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, FOLLOW_UP_MAX)
        .map(fullName);
      const progress = progressFor(email, snap);
      const here = avenueStops(progress).find((s) => s.status === "here");
      const action = here
        ? hereActionFor(here.id, progress)
        : // Henry to check wording
          { text: "All five streetlights on.", label: "Open Growth", href: LINKS.growth };
      return [
        one(
          periodKeyFor("digest", snap.now),
          digestEmail({
            firstName,
            token,
            weekOf: thisMonday,
            topic: digestTopic(snap.guides, thisMonday),
            trend,
            followUps,
            next: { ...action, href: absoluteUrl(action.href) },
          })
        ),
      ];
    }
    case "church_health": {
      const leaderEmails = new Set(snap.leaders.map((l) => normEmail(l.email)));
      const mine = snap.people.filter((p) => normEmail(p.owner_email) === email);
      // "This past month": people recorded since the 1st of last month.
      const cutoff = `${addMonthsKey(monthKeyOf(today), -1)}-01`;
      const now = countMetrics(mine);
      const before = countMetrics(mine.filter((p) => melbourneDateOf(p.created_at) < cutoff));
      const counts = {} as Record<Metric, { count: number; change: number }>;
      for (const m of METRICS) counts[m] = { count: now[m], change: now[m] - before[m] };
      const church = countMetrics(snap.people.filter((p) => leaderEmails.has(normEmail(p.owner_email))));
      return [
        one(
          periodKeyFor("church_health", snap.now),
          churchHealthEmail({ firstName, token, monthLabel: monthLabel(monthKeyOf(today)), mine: counts, church })
        ),
      ];
    }
    case "apprentice": {
      const me = nodeOf(snap, email);
      if (!me) return [];
      const apprentices = snap.network
        .filter((n) => n.sent_out_by === me.id)
        .map((n) => ({ name: fullName(n), step: Math.min(5, Math.max(0, Math.trunc(n.apprentice_step ?? 0))) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (apprentices.length === 0) return [];
      return [one(periodKeyFor("apprentice", snap.now), apprenticeEmail({ firstName, token, apprentices }))];
    }
    case "milestones":
      return milestonesFor(email, snap).map((milestone) =>
        one(milestoneKey(milestone), milestoneEmail({ firstName, token, milestone }), milestone.type !== "launch")
      );
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/emails/compose.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 409 tests pass (397 + 12); lint at most 54; build passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/emails/compose.ts src/lib/emails/compose.test.ts
git commit -m "Leader emails: compose each kind for one recipient from a snapshot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Engine, adapters and the scheduled function (TDD)

**Files:**
- Create: `src/lib/emails/engine.ts`
- Test: `src/lib/emails/engine.test.ts`
- Create: `src/lib/emails/engineDb.ts`
- Test: `src/lib/emails/engineDb.test.ts`
- Create: `src/lib/emails/loadSnapshot.ts`
- Test: `src/lib/emails/loadSnapshot.test.ts`
- Create: `src/lib/emails/runScheduled.ts`
- Test: `src/lib/emails/runScheduled.test.ts`
- Create: `netlify/functions/leader-emails.mts`
- Modify: `package.json`, `package-lock.json` (via npm)

**Interfaces:**
- Consumes: `composeFor`, `Snapshot`, `Outgoing`, row types (Task 7); `recipientsFor`, `PrefsRow`, `EmailKind`, `PREFS_COLUMNS`, `emailTablesError` (Task 4); `dueKinds`, `periodKeyFor` (Task 5); `topicForWeek` (Task 5); `RenderedEmail` (Task 6); `sendEmail`, `isEmailConfigured` (Task 6); `readRows`, `ROW_CAP` (Task 3); `fakeSupabase` (Task 3); `INITIAL_PHASES` from `src/app/leaders/training/phases.ts`.
- Produces:
  - `type LogStatus = "sent" | "baseline"`
  - `interface EngineDb { ensurePrefs(emails: string[]): Promise<PrefsRow[]>; loggedKeys(kind: EmailKind, periodKey: string | null): Promise<Set<string>>; claim(email, kind, periodKey, status: LogStatus): Promise<boolean>; release(email, kind, periodKey): Promise<void> }` (`loggedKeys` returns `"<email>|<period_key>"` strings: this period's rows for a periodic kind, every row for milestones when `periodKey` is null)
  - `interface EngineDeps extends EngineDb { now: Date; dryRun: boolean; maxSends: number; delayMs: number; budgetMs: number; clock(): number; loadSnapshot(): Promise<Snapshot>; send(to: string, message: RenderedEmail): Promise<void>; sleep(ms: number): Promise<void>; log(line: string): void }`
  - `interface RunReport { dryRun; due: EmailKind[]; wouldSend; sent; skipped; baselined; failed; deferred; unparseableGuides: string[] }` (each entry `"<kind> <email> <periodKey>"`, failures with `": <message>"`)
  - `BASELINE_KEY = "baseline"`, `runLeaderEmails(deps: EngineDeps): Promise<RunReport>`
  - `createEngineDb(db: SupabaseClient): EngineDb`
  - `foundationsModuleIds(): string[]`, `loadSnapshot(db: SupabaseClient, now: Date): Promise<Snapshot>` (Task 10 uses it)
  - `MAX_SENDS_PER_RUN = 20`, `SEND_DELAY_MS = 1000`, `RUN_BUDGET_MS = 20_000`, `isDryRun(env): boolean`, `runScheduled(now?: Date, env?): Promise<RunReport>`
  - The Netlify scheduled function `leader-emails`, schedule `@hourly`.

- [ ] **Step 1: Write the failing engine tests**

Create `src/lib/emails/engine.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { Snapshot } from "./compose";
import { MISSING_TABLES_MESSAGE, type PrefsRow } from "./prefs";
import { runLeaderEmails, type EngineDeps } from "./engine";

const ANN = "ann@example.invalid";
const DAN = "dan@example.invalid";
const BOB = "bob@example.invalid";
const CAT = "cat@example.invalid";
const STRANGER = "stranger@example.invalid";

// Monday 5 October 2026, 07:00 in Melbourne: digest and milestones are due.
const MONDAY_7AM = new Date("2026-10-04T20:00:00Z");
const WEEK = "2026-10-05";

const prefs = (email: string, token: string, over: Partial<PrefsRow> = {}): PrefsRow => ({
  email,
  rpms: true,
  digest: true,
  church_health: true,
  apprentice: true,
  milestones: true,
  unsubscribe_token: token,
  ...over,
});

const PREFS: PrefsRow[] = [
  prefs(ANN, "11111111-1111-4111-8111-111111111111"),
  prefs(DAN, "22222222-2222-4222-8222-222222222222"),
  prefs(BOB, "33333333-3333-4333-8333-333333333333", { digest: false }),
  // A preferences row alone never makes anyone a recipient.
  prefs(STRANGER, "44444444-4444-4444-8444-444444444444"),
];

function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    now: MONDAY_7AM,
    leaders: [
      { email: ANN, name: "Ann", full_access: true },
      { email: DAN, name: "Dan", full_access: true },
      { email: BOB, name: "Bob", full_access: true },
      { email: CAT, name: "Cat", full_access: false },
    ],
    prefs: PREFS,
    profiles: [],
    checkins: [],
    people: [],
    network: [],
    training: [],
    worksheets: [],
    guides: [],
    foundationsModuleIds: ["p1m0"],
    ...over,
  };
}

// Everyone already has a milestone baseline unless a test says otherwise.
const BASELINES = [ANN, DAN, BOB].map((email) => `milestones|${email}|baseline`);

function harness(opts: { snapshot?: Snapshot; logged?: string[]; deps?: Partial<EngineDeps> } = {}) {
  const events: string[] = [];
  const logged = new Set(opts.logged ?? BASELINES);
  const deps: EngineDeps = {
    now: MONDAY_7AM,
    dryRun: false,
    maxSends: 20,
    delayMs: 1000,
    budgetMs: 20_000,
    clock: () => 0,
    loadSnapshot: vi.fn(async () => opts.snapshot ?? snapshot()),
    ensurePrefs: vi.fn(async (emails: string[]) => {
      events.push(`ensurePrefs ${emails.join(",")}`);
      return PREFS;
    }),
    // "<email>|<period_key>" for one kind (one period, or all when null).
    loggedKeys: vi.fn(async (kind: string, key: string | null) => {
      const keys = [...logged]
        .filter((id) => id.startsWith(`${kind}|`) && (key === null || id.endsWith(`|${key}`)))
        .map((id) => id.slice(kind.length + 1));
      return new Set(keys);
    }),
    claim: vi.fn(async (email: string, kind: string, key: string, status: string) => {
      events.push(`claim ${status} ${kind} ${email} ${key}`);
      const id = `${kind}|${email}|${key}`;
      if (logged.has(id)) return false;
      logged.add(id);
      return true;
    }),
    release: vi.fn(async (email: string, kind: string, key: string) => {
      events.push(`release ${kind} ${email} ${key}`);
      logged.delete(`${kind}|${email}|${key}`);
    }),
    send: vi.fn(async (to: string, message: { subject: string }) => {
      events.push(`send ${to} ${message.subject}`);
    }),
    sleep: vi.fn(async (ms: number) => {
      events.push(`sleep ${ms}`);
    }),
    log: vi.fn(),
    ...opts.deps,
  };
  return { deps, events, logged };
}

describe("runLeaderEmails", () => {
  it("loads nothing and sends nothing when no kind is due", async () => {
    // Thursday 24 September 2026, 04:00 in Melbourne.
    const { deps } = harness({ deps: { now: new Date("2026-09-23T18:00:00Z") } });
    const report = await runLeaderEmails(deps);
    expect(report.due).toEqual([]);
    expect(deps.loadSnapshot).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("in dry run reports who would get what, and sends and writes nothing", async () => {
    const { deps } = harness({ deps: { dryRun: true } });
    const report = await runLeaderEmails(deps);
    expect(report.dryRun).toBe(true);
    expect(report.due).toEqual(["digest", "milestones"]);
    expect(report.wouldSend).toEqual([`digest ${ANN} ${WEEK}`, `digest ${DAN} ${WEEK}`]);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.release).not.toHaveBeenCalled();
    expect(deps.ensurePrefs).not.toHaveBeenCalled();
  });

  it("live: claims before sending, to full-access leaders who did not opt out, pausing between sends", async () => {
    const { deps, events } = harness();
    const report = await runLeaderEmails(deps);
    // The pause comes before the claim, so a run stopped mid-pause leaves
    // no claimed-but-unsent row behind.
    expect(events).toEqual([
      `ensurePrefs ${ANN},${BOB},${DAN}`,
      `claim sent digest ${ANN} ${WEEK}`,
      `send ${ANN} Your week ahead`,
      "sleep 1000",
      `claim sent digest ${DAN} ${WEEK}`,
      `send ${DAN} Your week ahead`,
    ]);
    expect(report.sent).toEqual([`digest ${ANN} ${WEEK}`, `digest ${DAN} ${WEEK}`]);
    const sentTo = vi.mocked(deps.send).mock.calls.map((c) => c[0]);
    expect(sentTo).not.toContain(BOB);
    expect(sentTo).not.toContain(CAT);
    expect(sentTo).not.toContain(STRANGER);
  });

  it("skips anything another run already claimed, from one log read per kind", async () => {
    const { deps } = harness({ logged: [...BASELINES, `digest|${ANN}|${WEEK}`] });
    const report = await runLeaderEmails(deps);
    expect(report.skipped).toEqual([`digest ${ANN} ${WEEK}`]);
    expect(report.sent).toEqual([`digest ${DAN} ${WEEK}`]);
    expect(vi.mocked(deps.loggedKeys).mock.calls).toEqual([
      ["digest", WEEK],
      ["milestones", null],
    ]);
    expect(vi.mocked(deps.claim).mock.calls.map((c) => c[0])).toEqual([DAN]);
  });

  it("releases and reports a failed send, and carries on with the next leader", async () => {
    const { deps, events, logged } = harness({
      deps: {
        send: vi.fn(async (to: string) => {
          if (to === ANN) throw new Error("SMTP down");
          events.push(`send ${to}`);
        }),
      },
    });
    const report = await runLeaderEmails(deps);
    expect(report.failed).toEqual([`digest ${ANN} ${WEEK}: SMTP down`]);
    expect(events).toContain(`release digest ${ANN} ${WEEK}`);
    expect(logged.has(`digest|${ANN}|${WEEK}`)).toBe(false);
    expect(report.sent).toEqual([`digest ${DAN} ${WEEK}`]);
  });

  it("caps sends per run and leaves the rest for the next hour", async () => {
    const { deps } = harness({ deps: { maxSends: 1 } });
    const report = await runLeaderEmails(deps);
    expect(report.sent).toEqual([`digest ${ANN} ${WEEK}`]);
    expect(report.deferred).toEqual([`digest ${DAN} ${WEEK}`]);
    expect(deps.claim).toHaveBeenCalledTimes(1);
  });

  it("stops claiming once the time budget is spent, leaving the rest for the next hour", async () => {
    let t = 0;
    const { deps } = harness({
      deps: {
        clock: () => t,
        send: vi.fn(async () => {
          t += 25_000;
        }),
      },
    });
    const report = await runLeaderEmails(deps);
    expect(report.sent).toEqual([`digest ${ANN} ${WEEK}`]);
    expect(report.deferred).toEqual([`digest ${DAN} ${WEEK}`]);
    expect(deps.claim).toHaveBeenCalledTimes(1);
    expect(deps.sleep).not.toHaveBeenCalled();
  });

  it("refuses an address that could reach more than one inbox, and writes nothing for it", async () => {
    const TWO = "ann@example.invalid,eve@example.invalid";
    const { deps } = harness({ snapshot: snapshot({ leaders: [{ email: TWO, name: "Two", full_access: true }] }) });
    const report = await runLeaderEmails(deps);
    expect(report.failed).toEqual([
      `digest ${TWO}: refusing digest to ${TWO}: not one plain full-access address`,
      `milestones ${TWO}: refusing milestones to ${TWO}: not one plain full-access address`,
    ]);
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.ensurePrefs).toHaveBeenCalledWith([]);
  });

  it("on a leader's first live run, baselines milestones they already had and sends none of them", async () => {
    const { deps, events } = harness({
      snapshot: snapshot({ training: [{ email: ANN, completed_modules: ["p1m0"] }] }),
      logged: [`milestones|${DAN}|baseline`, `milestones|${BOB}|baseline`],
    });
    const report = await runLeaderEmails(deps);
    expect(events).toContain(`claim baseline milestones ${ANN} phase1-walked`);
    expect(events).toContain(`claim baseline milestones ${ANN} baseline`);
    expect(events.some((e) => e.includes("You walked Foundations"))).toBe(false);
    expect(report.baselined).toEqual([`milestones ${ANN} phase1-walked`]);
  });

  it("sends a new milestone once, and a second run sends nothing again", async () => {
    const { deps, events } = harness({ snapshot: snapshot({ training: [{ email: ANN, completed_modules: ["p1m0"] }] }) });
    const first = await runLeaderEmails(deps);
    expect(first.sent).toContain(`milestones ${ANN} phase1-walked`);
    const second = await runLeaderEmails(deps);
    expect(second.sent).toEqual([]);
    expect(second.skipped).toContain(`milestones ${ANN} phase1-walked`);
    expect(events.filter((e) => e === `send ${ANN} You walked Foundations`)).toHaveLength(1);
  });

  it("fails loud when the email tables are missing", async () => {
    const { deps } = harness({
      deps: {
        loadSnapshot: vi.fn(async () => {
          throw new Error(MISSING_TABLES_MESSAGE);
        }),
      },
    });
    await expect(runLeaderEmails(deps)).rejects.toThrow("Leader email tables are missing");
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("reports study guides whose date cannot be read", async () => {
    const guides = [{ id: "g1", guide_date: "Week 3", series: null, topic: "Joy", scripture: null, pdf_url: null }];
    const { deps } = harness({ snapshot: snapshot({ guides }), deps: { dryRun: true } });
    const report = await runLeaderEmails(deps);
    expect(report.unparseableGuides).toEqual(['g1 ("Week 3")']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/emails/engine.test.ts`
Expected: FAIL, "Failed to resolve import ./engine".

- [ ] **Step 3: Write `src/lib/emails/engine.ts`**

```ts
// The hourly leader email run (spec 3.3). The database, the mailer, the
// clock and the pause between sends are injected, so the whole flow is
// unit tested without Supabase or Gmail.
//
// Safety, in order:
// 1. Nothing is loaded unless a kind is due this hour (Melbourne time).
// 2. Recipients come only from recipientsFor: full-access leaders who have
//    not turned the kind off. An email for any other address, or for an
//    address that is not one plain address, is refused.
// 3. Dry run (the default) renders and reports; it never sends or writes.
// 4. What is already done comes from one log read per due kind. Live, the
//    log row is claimed BEFORE sending. A duplicate claim means another run
//    has it, so nothing is sent. A failed send releases the claim so a
//    later run that day retries, and is reported loud.
// 5. One recipient failing never stops the others. Sends are sequential,
//    paused before each claim after the first, capped per run, and stop
//    once the time budget is spent (the rest wait for the next hour).
import { melbourneParts, mondayOfISO } from "@/lib/melbourneDate";
import { composeFor, type Outgoing, type Snapshot } from "./compose";
import type { RenderedEmail } from "./layout";
import { recipientsFor, type EmailKind, type PrefsRow } from "./prefs";
import { dueKinds, periodKeyFor } from "./schedule";
import { topicForWeek } from "./topic";

export type LogStatus = "sent" | "baseline";

export interface EngineDb {
  // Makes sure every email has a preferences row (and so a token); returns all rows.
  ensurePrefs(emails: string[]): Promise<PrefsRow[]>;
  // Every "<email>|<period_key>" already logged for one kind, in one read:
  // this period's rows for a periodic kind, every row for milestones (null).
  loggedKeys(kind: EmailKind, periodKey: string | null): Promise<Set<string>>;
  // Inserts the log row. False when it already exists (unique constraint).
  claim(email: string, kind: EmailKind, periodKey: string, status: LogStatus): Promise<boolean>;
  // Deletes a "sent" claim after a failed send.
  release(email: string, kind: EmailKind, periodKey: string): Promise<void>;
}

export interface EngineDeps extends EngineDb {
  now: Date;
  dryRun: boolean;
  maxSends: number;
  delayMs: number;
  // A live run claims nothing new once this many ms have passed since it
  // started (Netlify stops a scheduled function at 30 s).
  budgetMs: number;
  clock(): number;
  loadSnapshot(): Promise<Snapshot>;
  send(to: string, message: RenderedEmail): Promise<void>;
  sleep(ms: number): Promise<void>;
  log(line: string): void;
}

export interface RunReport {
  dryRun: boolean;
  due: EmailKind[];
  wouldSend: string[];
  sent: string[];
  skipped: string[];
  baselined: string[];
  failed: string[];
  deferred: string[];
  unparseableGuides: string[];
}

export const BASELINE_KEY = "baseline";

// One address and nothing else: no spaces, commas, semicolons, quotes or
// angle brackets, any of which could turn one "to" into several.
const PLAIN_ADDRESS = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

const label = (o: { kind: EmailKind; email: string; periodKey: string }) => `${o.kind} ${o.email} ${o.periodKey}`;

// A leader's first milestones run (no baseline marker in the log) records
// what they already have without sending it. Launch countdowns are dated,
// so they are never baselined. Returns what is left to send.
async function baselineFirst(deps: EngineDeps, email: string, outgoing: Outgoing[], report: RunReport): Promise<Outgoing[]> {
  const already = outgoing.filter((o) => o.baselineable);
  for (const o of already) {
    if (!deps.dryRun) await deps.claim(email, "milestones", o.periodKey, "baseline");
    report.baselined.push(label(o));
  }
  if (!deps.dryRun) await deps.claim(email, "milestones", BASELINE_KEY, "baseline");
  deps.log(`${deps.dryRun ? "would baseline" : "baselined"} ${already.length} milestone(s) for ${email}`);
  return outgoing.filter((o) => !o.baselineable);
}

export async function runLeaderEmails(deps: EngineDeps): Promise<RunReport> {
  const started = deps.clock();
  const outOfTime = () => deps.clock() - started >= deps.budgetMs;
  const report: RunReport = {
    dryRun: deps.dryRun,
    due: dueKinds(deps.now),
    wouldSend: [],
    sent: [],
    skipped: [],
    baselined: [],
    failed: [],
    deferred: [],
    unparseableGuides: [],
  };
  if (report.due.length === 0) {
    deps.log("nothing due this hour");
    return report;
  }
  deps.log(`${deps.dryRun ? "DRY RUN" : "LIVE"}: due ${report.due.join(", ")}`);

  // Throws (loud) on any read error, including missing email tables.
  let snap = await deps.loadSnapshot();
  const fullAccess = new Set(
    snap.leaders
      .filter((l) => l.full_access === true)
      .map((l) => l.email.trim().toLowerCase())
      .filter((email) => PLAIN_ADDRESS.test(email))
  );
  if (!deps.dryRun) snap = { ...snap, prefs: await deps.ensurePrefs([...fullAccess].sort()) };

  // What is already done: one read per due kind, so a run spends its time
  // on new work rather than re-checking old sends one by one. The claim
  // below stays the guarantee (another run may claim in between).
  const logged = new Map<EmailKind, Set<string>>();
  for (const kind of report.due) {
    logged.set(kind, await deps.loggedKeys(kind, kind === "milestones" ? null : periodKeyFor(kind, deps.now)));
  }
  const isLogged = (kind: EmailKind, email: string, periodKey: string) =>
    logged.get(kind)?.has(`${email}|${periodKey}`) ?? false;

  if (report.due.includes("digest")) {
    report.unparseableGuides = topicForWeek(snap.guides, mondayOfISO(melbourneParts(deps.now).date)).unparseable;
    for (const g of report.unparseableGuides) deps.log(`study guide skipped, date not DD/MM/YYYY: ${g}`);
  }

  let sends = 0;
  for (const kind of report.due) {
    for (const recipient of recipientsFor(kind, snap.leaders, snap.prefs)) {
      try {
        if (!fullAccess.has(recipient.email)) {
          throw new Error(`refusing ${kind} to ${recipient.email}: not one plain full-access address`);
        }
        let outgoing = composeFor(kind, recipient, snap);
        for (const out of outgoing) {
          if (out.email !== recipient.email) {
            throw new Error(`refusing to send ${out.kind} to ${out.email}: not this recipient`);
          }
        }
        if (kind === "milestones" && !isLogged("milestones", recipient.email, BASELINE_KEY)) {
          if (!deps.dryRun && outOfTime()) {
            for (const out of outgoing) report.deferred.push(label(out));
            continue;
          }
          outgoing = await baselineFirst(deps, recipient.email, outgoing, report);
        }

        for (const out of outgoing) {
          if (isLogged(out.kind, out.email, out.periodKey)) {
            report.skipped.push(label(out));
            continue;
          }
          if (deps.dryRun) {
            report.wouldSend.push(label(out));
            deps.log(`would send ${label(out)}: ${out.message.subject}`);
            continue;
          }
          if (sends >= deps.maxSends || outOfTime()) {
            report.deferred.push(label(out));
            continue;
          }
          // Pause BEFORE claiming: a run stopped mid-pause leaves no
          // claimed-but-unsent row that would drop this email for the period.
          if (sends > 0) await deps.sleep(deps.delayMs);
          if (!(await deps.claim(out.email, out.kind, out.periodKey, "sent"))) {
            report.skipped.push(label(out));
            continue;
          }
          sends += 1;
          try {
            await deps.send(out.email, out.message);
            report.sent.push(label(out));
            deps.log(`sent ${label(out)}`);
          } catch (e) {
            report.failed.push(`${label(out)}: ${(e as Error).message}`);
            console.error(`[leader-emails] SEND FAILED ${label(out)}`, e);
            await deps.release(out.email, out.kind, out.periodKey);
          }
        }
      } catch (e) {
        report.failed.push(`${kind} ${recipient.email}: ${(e as Error).message}`);
        console.error(`[leader-emails] FAILED ${kind} ${recipient.email}`, e);
      }
    }
  }

  deps.log(
    `done: ${report.sent.length} sent, ${report.wouldSend.length} would send, ${report.skipped.length} skipped, ` +
      `${report.deferred.length} deferred, ${report.failed.length} failed`
  );
  return report;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/emails/engine.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Write the failing adapter tests**

Create `src/lib/emails/engineDb.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase, type FakeResult } from "@/test/fakeSupabase";
import { ROW_CAP } from "@/lib/adminRead";
import { MISSING_TABLES_MESSAGE, PREFS_COLUMNS } from "./prefs";
import { createEngineDb } from "./engineDb";

const A = "ann@example.invalid";
const B = "bob@example.invalid";
const setup = (results: Record<string, FakeResult> = {}) => {
  const fake = fakeSupabase(results);
  return { fake, engineDb: createEngineDb(fake.db as unknown as SupabaseClient) };
};

describe("createEngineDb", () => {
  it("claim inserts one log row and says yes", async () => {
    const { fake, engineDb } = setup();
    expect(await engineDb.claim(A, "digest", "2026-10-05", "sent")).toBe(true);
    expect(fake.calls).toEqual([
      ["leader_email_log", "from"],
      ["leader_email_log", "insert", { email: A, kind: "digest", period_key: "2026-10-05", status: "sent" }],
    ]);
  });

  it("claim says no when the unique constraint already has the row", async () => {
    const { engineDb } = setup({ "leader_email_log.insert": { error: { message: "duplicate key value", code: "23505" } } });
    expect(await engineDb.claim(A, "digest", "2026-10-05", "sent")).toBe(false);
  });

  it("claim fails loud with the migration hint when the table is missing", async () => {
    const { engineDb } = setup({
      "leader_email_log.insert": {
        error: { message: "Could not find the table 'public.leader_email_log' in the schema cache", code: "PGRST205" },
      },
    });
    await expect(engineDb.claim(A, "digest", "2026-10-05", "sent")).rejects.toThrow(MISSING_TABLES_MESSAGE);
  });

  it("loggedKeys reads one kind's rows for one period in a single query", async () => {
    const { fake, engineDb } = setup({ leader_email_log: { data: [{ email: A, period_key: "2026-10-05" }] } });
    expect(await engineDb.loggedKeys("digest", "2026-10-05")).toEqual(new Set([`${A}|2026-10-05`]));
    expect(fake.calls).toEqual([
      ["leader_email_log", "from"],
      ["leader_email_log", "select", "email, period_key"],
      ["leader_email_log", "eq", "kind", "digest"],
      ["leader_email_log", "eq", "period_key", "2026-10-05"],
    ]);
  });

  it("loggedKeys reads every milestones row, and fails loud at the row cap", async () => {
    const some = setup({
      leader_email_log: { data: [{ email: A, period_key: "baseline" }, { email: B, period_key: "phase1-walked" }] },
    });
    expect(await some.engineDb.loggedKeys("milestones", null)).toEqual(new Set([`${A}|baseline`, `${B}|phase1-walked`]));
    expect(some.fake.calls.filter((c) => c[1] === "eq")).toEqual([["leader_email_log", "eq", "kind", "milestones"]]);
    const data = Array.from({ length: ROW_CAP }, (_, i) => ({ email: `l${i}@example.invalid`, period_key: "baseline" }));
    const full = setup({ leader_email_log: { data } });
    await expect(full.engineDb.loggedKeys("milestones", null)).rejects.toThrow("row read cap");
  });

  it("ensurePrefs adds missing rows without touching existing ones, then returns every row", async () => {
    const row = { email: A, rpms: true, digest: false, church_health: true, apprentice: true, milestones: true, unsubscribe_token: "t" };
    const { fake, engineDb } = setup({ "leader_email_prefs.select": { data: [row] } });
    expect(await engineDb.ensurePrefs([A, B])).toEqual([row]);
    expect(fake.calls).toContainEqual([
      "leader_email_prefs",
      "upsert",
      [{ email: A }, { email: B }],
      { onConflict: "email", ignoreDuplicates: true },
    ]);
    expect(fake.calls).toContainEqual(["leader_email_prefs", "select", PREFS_COLUMNS]);
  });

  it("release deletes only that sent claim", async () => {
    const { fake, engineDb } = setup();
    await engineDb.release(A, "digest", "2026-10-05");
    expect(fake.calls).toEqual([
      ["leader_email_log", "from"],
      ["leader_email_log", "delete"],
      ["leader_email_log", "eq", "email", A],
      ["leader_email_log", "eq", "kind", "digest"],
      ["leader_email_log", "eq", "period_key", "2026-10-05"],
      ["leader_email_log", "eq", "status", "sent"],
    ]);
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run src/lib/emails/engineDb.test.ts`
Expected: FAIL, "Failed to resolve import ./engineDb".

- [ ] **Step 7: Write `src/lib/emails/engineDb.ts`**

```ts
// The engine's database, on Supabase (service role). Every error names the
// table and, while migration 009 is not applied, says so.
import type { SupabaseClient } from "@supabase/supabase-js";
import { readRows, ROW_CAP } from "@/lib/adminRead";
import type { EngineDb } from "./engine";
import { emailTablesError, PREFS_COLUMNS, type PrefsRow } from "./prefs";

const UNIQUE_VIOLATION = "23505";

export function createEngineDb(db: SupabaseClient): EngineDb {
  const fail = (table: string, message: string) => new Error(`${table}: ${emailTablesError(message)}`);
  return {
    async ensurePrefs(emails) {
      if (emails.length > 0) {
        const { error } = await db
          .from("leader_email_prefs")
          .upsert(
            emails.map((email) => ({ email })),
            { onConflict: "email", ignoreDuplicates: true }
          );
        if (error) throw fail("leader_email_prefs", error.message);
      }
      try {
        return await readRows<PrefsRow>(db, "leader_email_prefs", PREFS_COLUMNS);
      } catch (e) {
        throw new Error(emailTablesError((e as Error).message));
      }
    },
    async loggedKeys(kind, periodKey) {
      let query = db.from("leader_email_log").select("email, period_key").eq("kind", kind);
      if (periodKey !== null) query = query.eq("period_key", periodKey);
      const { data, error } = await query;
      if (error) throw fail("leader_email_log", error.message);
      const rows = (data ?? []) as { email: string; period_key: string }[];
      if (rows.length >= ROW_CAP) {
        throw new Error(
          `leader_email_log: ${rows.length} ${kind} rows reached the ${ROW_CAP} row read cap. Paginate this read before sending.`
        );
      }
      return new Set(rows.map((r) => `${r.email}|${r.period_key}`));
    },
    async claim(email, kind, periodKey, status) {
      const { error } = await db.from("leader_email_log").insert({ email, kind, period_key: periodKey, status });
      if (!error) return true;
      if (error.code === UNIQUE_VIOLATION) return false;
      throw fail("leader_email_log", error.message);
    },
    async release(email, kind, periodKey) {
      const { error } = await db
        .from("leader_email_log")
        .delete()
        .eq("email", email)
        .eq("kind", kind)
        .eq("period_key", periodKey)
        .eq("status", "sent");
      if (error) throw fail("leader_email_log", error.message);
    },
  };
}
```

- [ ] **Step 8: Run it to see it pass**

Run: `npx vitest run src/lib/emails/engineDb.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 9: Write the failing snapshot loader tests**

Create `src/lib/emails/loadSnapshot.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabase } from "@/test/fakeSupabase";
import { MISSING_TABLES_MESSAGE } from "./prefs";
import { loadSnapshot } from "./loadSnapshot";

const asClient = (db: unknown) => db as SupabaseClient;

describe("loadSnapshot", () => {
  it("reads the nine tables into a snapshot with the Foundations module ids", async () => {
    const fake = fakeSupabase({ leaders: { data: [{ email: "ann@example.invalid", name: "Ann", full_access: true }] } });
    const now = new Date("2026-10-04T20:00:00Z");
    const snap = await loadSnapshot(asClient(fake.db), now);
    expect(snap.now).toBe(now);
    expect(snap.leaders).toHaveLength(1);
    expect(snap.foundationsModuleIds).toContain("p1m0");
    expect(fake.tables().sort()).toEqual([
      "leader_checkins",
      "leader_email_prefs",
      "leader_people",
      "leader_profiles",
      "leader_training_progress",
      "leader_worksheets",
      "leaders",
      "network_people",
      "study_guides",
    ]);
  });

  it("fails loud with the migration hint when the email tables are missing", async () => {
    const fake = fakeSupabase({
      leader_email_prefs: { error: { message: "Could not find the table 'public.leader_email_prefs' in the schema cache" } },
    });
    await expect(loadSnapshot(asClient(fake.db), new Date())).rejects.toThrow(MISSING_TABLES_MESSAGE);
  });
});
```

- [ ] **Step 10: Run it to see it fail**

Run: `npx vitest run src/lib/emails/loadSnapshot.test.ts`
Expected: FAIL, "Failed to resolve import ./loadSnapshot".

- [ ] **Step 11: Write `src/lib/emails/loadSnapshot.ts`**

```ts
// Reads everything one email run needs, once (spec 3.3). Nine whole-table
// reads through readRows, which fails loud on any error or on the row cap.
import type { SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_PHASES } from "@/app/leaders/training/phases";
import { readRows } from "@/lib/adminRead";
import type { HealthCheckinRow, HealthPersonRow, HealthProfileRow } from "@/lib/churchHealth";
import type { NetworkRow, Snapshot, TrainingRow, WorksheetRow } from "./compose";
import { emailTablesError, PREFS_COLUMNS, type LeaderRow, type PrefsRow } from "./prefs";
import type { GuideRow } from "./topic";

// The Foundations module ids, from the same content the training page uses.
export function foundationsModuleIds(): string[] {
  const phase = INITIAL_PHASES.find((p) => p.id === "phase1");
  if (!phase || phase.modules.length === 0) throw new Error("loadSnapshot: no Foundations modules in INITIAL_PHASES");
  return phase.modules.map((m) => m.id);
}

export async function loadSnapshot(db: SupabaseClient, now: Date): Promise<Snapshot> {
  try {
    const [leaders, prefs, profiles, checkins, people, network, training, worksheets, guides] = await Promise.all([
      readRows<LeaderRow>(db, "leaders", "email, name, full_access"),
      readRows<PrefsRow>(db, "leader_email_prefs", PREFS_COLUMNS),
      readRows<HealthProfileRow>(db, "leader_profiles", "email, display_name, pathway_group"),
      readRows<HealthCheckinRow>(db, "leader_checkins", "email, week_start, relational, physical, mental, spiritual"),
      readRows<HealthPersonRow>(db, "leader_people", "owner_email, first_name, last_name, metrics, created_at"),
      readRows<NetworkRow>(db, "network_people", "id, email, first_name, last_name, sent_out_by, apprentice_step"),
      readRows<TrainingRow>(db, "leader_training_progress", "email, completed_modules"),
      readRows<WorksheetRow>(db, "leader_worksheets", "email, kind, data"),
      readRows<GuideRow>(db, "study_guides", "id, guide_date, series, topic, scripture, pdf_url"),
    ]);
    return {
      now,
      leaders,
      prefs,
      profiles,
      checkins,
      people,
      network,
      training,
      worksheets,
      guides,
      foundationsModuleIds: foundationsModuleIds(),
    };
  } catch (e) {
    throw new Error(emailTablesError((e as Error).message));
  }
}
```

- [ ] **Step 12: Run it to see it pass**

Run: `npx vitest run src/lib/emails/loadSnapshot.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 13: Write the failing scheduled-run tests**

Create `src/lib/emails/runScheduled.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { isDryRun, runScheduled } from "./runScheduled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runScheduled", () => {
  it("stays in dry run unless LEADER_EMAILS_DRY_RUN is exactly false", () => {
    expect(isDryRun({})).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "FALSE" })).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "0" })).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "true" })).toBe(true);
    expect(isDryRun({ LEADER_EMAILS_DRY_RUN: "false" })).toBe(false);
  });

  it("fails loud without Supabase credentials", async () => {
    await expect(runScheduled(new Date(), {})).rejects.toThrow("SUPABASE_SERVICE_ROLE_KEY must be set");
  });

  it("refuses a live run without Gmail credentials", async () => {
    vi.stubEnv("GMAIL_USER", "");
    vi.stubEnv("GMAIL_APP_PASSWORD", "");
    await expect(
      runScheduled(new Date(), {
        LEADER_EMAILS_DRY_RUN: "false",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      })
    ).rejects.toThrow("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  });
});
```

- [ ] **Step 14: Run it to see it fail**

Run: `npx vitest run src/lib/emails/runScheduled.test.ts`
Expected: FAIL, "Failed to resolve import ./runScheduled".

- [ ] **Step 15: Write `src/lib/emails/runScheduled.ts`**

```ts
// Wires the engine to the real world for the Netlify scheduled function:
// a service-role Supabase client, Gmail through the shared sendEmail, a
// real pause between sends. Dry run unless LEADER_EMAILS_DRY_RUN is exactly
// "false". Kept in src/lib so Vitest covers it; the .mts file only calls it.
// It builds its own client rather than using getSupabaseAdmin, which pulls
// next/server into the function bundle.
import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { runLeaderEmails, type RunReport } from "./engine";
import { createEngineDb } from "./engineDb";
import { loadSnapshot } from "./loadSnapshot";

export const MAX_SENDS_PER_RUN = 20;
export const SEND_DELAY_MS = 1000;
// Netlify stops a scheduled function at 30 s. Each send opens a fresh Gmail
// SMTP connection (the shared transporter is not pooled), so a run stops
// claiming new work after 20 s and leaves the rest for the next hour.
export const RUN_BUDGET_MS = 20_000;

type Env = Record<string, string | undefined>;

export function isDryRun(env: Env = process.env): boolean {
  return env.LEADER_EMAILS_DRY_RUN !== "false";
}

export async function runScheduled(now: Date = new Date(), env: Env = process.env): Promise<RunReport> {
  const dryRun = isDryRun(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("leader-emails: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  if (!dryRun && !isEmailConfigured()) {
    throw new Error("leader-emails: GMAIL_USER and GMAIL_APP_PASSWORD must be set for a live run");
  }
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const report = await runLeaderEmails({
    now,
    dryRun,
    maxSends: MAX_SENDS_PER_RUN,
    delayMs: SEND_DELAY_MS,
    budgetMs: RUN_BUDGET_MS,
    clock: () => Date.now(),
    loadSnapshot: () => loadSnapshot(db, now),
    ...createEngineDb(db),
    send: (to, message) => sendEmail(to, message.subject, message.html, { text: message.text, headers: message.headers }),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (line) => console.log(`[leader-emails] ${line}`),
  });
  console.log(`[leader-emails] report ${JSON.stringify(report)}`);
  return report;
}
```

- [ ] **Step 16: Run it to see it pass**

Run: `npx vitest run src/lib/emails/runScheduled.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 17: Add the Netlify Functions types**

`@netlify/functions` is not installed (only `@netlify/blobs` is). It is used for its `Config` type only.

Run: `npm install --save-dev @netlify/functions`
Expected: `package.json` gains `"@netlify/functions": "^<version>"` under `devDependencies` and `package-lock.json` updates. Record the installed version in the task report.

- [ ] **Step 18: Write the scheduled function**

Create `netlify/functions/leader-emails.mts`:

```ts
// Hourly leader emails (spec 2026-09-24 church health emails, 3.3).
// Netlify runs this at minute 0 of every UTC hour; runScheduled works out
// what is due in Melbourne. Dry run unless LEADER_EMAILS_DRY_RUN is exactly
// "false". Scheduled functions run only on the published deploy and stop
// after 30 seconds, which is why each run sends at most 20 emails and
// claims nothing new after 20 seconds.
import type { Config } from "@netlify/functions";
import { runScheduled } from "../../src/lib/emails/runScheduled";

export default async function leaderEmails(): Promise<Response> {
  const report = await runScheduled();
  return new Response(JSON.stringify(report), { headers: { "content-type": "application/json" } });
}

export const config: Config = {
  schedule: "@hourly",
};
```

Do not edit `netlify.toml`. Netlify always bundles TypeScript (`.mts`) functions with esbuild, which resolves the `@/` alias from `tsconfig.json` `paths`; Task 11 Step 8 proves the bundle locally.

- [ ] **Step 19: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing (it checks `netlify/functions/*.mts` through `tsconfig.json` `include`); 433 tests pass (409 + 12 + 7 + 2 + 3); lint at most 54; build passes.

- [ ] **Step 20: Commit**

```bash
git add src/lib/emails/engine.ts src/lib/emails/engine.test.ts src/lib/emails/engineDb.ts src/lib/emails/engineDb.test.ts src/lib/emails/loadSnapshot.ts src/lib/emails/loadSnapshot.test.ts src/lib/emails/runScheduled.ts src/lib/emails/runScheduled.test.ts netlify/functions/leader-emails.mts package.json package-lock.json
git commit -m "Leader emails: claim-then-send engine and hourly scheduled function (dry run by default)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Preference and unsubscribe routes (TDD)

**Files:**
- Create: `src/app/api/email-prefs/route.ts`
- Test: `src/app/api/email-prefs/route.test.ts`
- Create: `src/lib/emails/noticePage.ts`
- Create: `src/app/api/email/unsubscribe/route.ts`
- Test: `src/app/api/email/unsubscribe/route.test.ts`

**Interfaces:**
- Consumes: `requireLeader` from `src/lib/requireLeader.ts`; `adminConfigError`, `getSupabaseAdmin` from `src/lib/supabaseAdmin.ts`; `PREFS_COLUMNS`, `prefsFromRow`, `validatePrefsPatch`, `parseUnsubscribe`, `unsubscribePatch`, `emailTablesError`, `EMAIL_KIND_INFO` (Task 4); `COLOURS`, `esc`, `absoluteUrl` (Task 6); `fakeSupabase` (Task 3).
- Produces:
  - `GET /api/email-prefs` returns `{ prefs: EmailPrefs }`; `PATCH /api/email-prefs` with a body like `{ "digest": false }` returns `{ prefs: EmailPrefs }`. Task 10's panel calls both.
  - `GET /api/email/unsubscribe?token=&kind=` returns an HTML confirm page; `POST` to the same URL turns the setting(s) off and returns an HTML result page.
  - `renderNoticePage(input: { title: string; message: string; form?: { action: string; button: string }; link?: { label: string; href: string } }): string`

- [ ] **Step 1: Write the failing preference route tests**

Create `src/app/api/email-prefs/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";
import { DEFAULT_PREFS, MISSING_TABLES_MESSAGE, PREFS_COLUMNS } from "@/lib/emails/prefs";

// The route's two server dependencies are replaced, so these tests run with
// no Supabase and no session. requireLeader's own checks are covered by
// leaderAuth.test.ts and scripts/check-auth.mjs.
const h = vi.hoisted(() => ({ requireLeader: vi.fn(), getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/requireLeader", () => ({ requireLeader: h.requireLeader }));
vi.mock("@/lib/supabaseAdmin", () => ({ adminConfigError: () => null, getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET, PATCH } from "./route";

const SESSION_EMAIL = "prefs-a@example.invalid";
const url = "http://localhost/api/email-prefs";
const get = () => GET(new NextRequest(url));
const patch = (body: unknown, query = "") =>
  PATCH(new NextRequest(`${url}${query}`, { method: "PATCH", body: JSON.stringify(body) }));

beforeEach(() => {
  h.requireLeader.mockReset();
  h.getSupabaseAdmin.mockReset();
  h.requireLeader.mockResolvedValue({ leader: { email: SESSION_EMAIL, name: "Prefs A", fullAccess: true } });
});

describe("GET /api/email-prefs", () => {
  it("passes requireLeader's 401 straight back and touches no table", async () => {
    h.requireLeader.mockResolvedValue({ response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) });
    const res = await get();
    expect(res.status).toBe(401);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is all on when the leader has no row, reading only their own row", async () => {
    const fake = fakeSupabase({ leader_email_prefs: { data: null } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ prefs: DEFAULT_PREFS });
    expect(fake.calls).toEqual([
      ["leader_email_prefs", "from"],
      ["leader_email_prefs", "select", PREFS_COLUMNS],
      ["leader_email_prefs", "eq", "email", SESSION_EMAIL],
      ["leader_email_prefs", "maybeSingle"],
    ]);
  });

  it("returns the stored settings", async () => {
    const row = { email: SESSION_EMAIL, rpms: true, digest: false, church_health: true, apprentice: false, milestones: true, unsubscribe_token: "t" };
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ leader_email_prefs: { data: row } }).db);
    expect(await (await get()).json()).toEqual({ prefs: { ...DEFAULT_PREFS, digest: false, apprentice: false } });
  });

  it("fails loud with the migration hint while the table is missing", async () => {
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({
        leader_email_prefs: { error: { message: "Could not find the table 'public.leader_email_prefs' in the schema cache" } },
      }).db
    );
    const res = await get();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain(MISSING_TABLES_MESSAGE);
  });
});

describe("PATCH /api/email-prefs", () => {
  it("is 400 for a body that is not a set of known true or false settings, and touches no table", async () => {
    for (const body of [null, {}, { digest: "no" }, { email: "someone-else@example.invalid", digest: false }]) {
      const res = await patch(body);
      expect(res.status).toBe(400);
    }
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("saves the signed-in leader's settings only, ignoring an email in the query", async () => {
    const saved = { email: SESSION_EMAIL, rpms: false, digest: true, church_health: true, apprentice: true, milestones: true, unsubscribe_token: "t" };
    const fake = fakeSupabase({ "leader_email_prefs.upsert": { data: saved } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await patch({ rpms: false }, `?email=${encodeURIComponent("someone-else@example.invalid")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ prefs: { ...DEFAULT_PREFS, rpms: false } });
    const upsert = fake.calls.find((c) => c[1] === "upsert");
    expect(upsert?.[2]).toEqual({ rpms: false, email: SESSION_EMAIL, updated_at: expect.any(String) });
    expect(upsert?.[3]).toEqual({ onConflict: "email" });
  });

  it("fails loud with the database message", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leader_email_prefs.upsert": { error: { message: "permission denied" } } }).db);
    const res = await patch({ rpms: false });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "permission denied" });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/app/api/email-prefs/route.test.ts`
Expected: FAIL, "Failed to resolve import ./route".

- [ ] **Step 3: Write the preference route**

Create `src/app/api/email-prefs/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { adminConfigError, getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireLeader } from "@/lib/requireLeader";
import { emailTablesError, PREFS_COLUMNS, prefsFromRow, validatePrefsPatch, type PrefsRow } from "@/lib/emails/prefs";

// The signed-in leader's own email settings (spec 3.4). The email is only
// ever auth.leader.email, never the body or the query. A missing row
// means every email is on.

// GET /api/email-prefs
export async function GET(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await getSupabaseAdmin()
    .from("leader_email_prefs")
    .select(PREFS_COLUMNS)
    .eq("email", auth.leader.email)
    .maybeSingle();
  if (error) return NextResponse.json({ error: emailTablesError(error.message) }, { status: 500 });
  return NextResponse.json({ prefs: prefsFromRow(data as PrefsRow | null) });
}

// PATCH /api/email-prefs  { rpms?, digest?, church_health?, apprentice?, milestones?: boolean }
export async function PATCH(request: NextRequest) {
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;
  const auth = await requireLeader(request);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = validatePrefsPatch(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("leader_email_prefs")
    .upsert({ ...parsed.patch, email: auth.leader.email, updated_at: new Date().toISOString() }, { onConflict: "email" })
    .select(PREFS_COLUMNS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: emailTablesError(error.message) }, { status: 500 });
  return NextResponse.json({ prefs: prefsFromRow(data as PrefsRow | null) });
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/app/api/email-prefs/route.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing unsubscribe tests**

Create `src/app/api/email/unsubscribe/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeSupabase } from "@/test/fakeSupabase";

// No session is involved: the token is the only key. Only the database is
// replaced.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: h.getSupabaseAdmin }));

import { GET, POST } from "./route";

const TOKEN = "6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a";
const at = (query: string) => `http://localhost/api/email/unsubscribe${query}`;
const get = (query: string) => GET(new NextRequest(at(query)));
// A mail client's RFC 8058 one-click POST carries this body; it is ignored.
const post = (query: string) =>
  POST(
    new NextRequest(at(query), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click&email=someone-else%40example.invalid&rpms=true",
    })
  );

beforeEach(() => {
  h.getSupabaseAdmin.mockReset();
  vi.stubEnv("AVENUE_SITE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const updatePayload = (calls: unknown[][]) => calls.find((c) => c[1] === "update")?.[2];

describe("GET /api/email/unsubscribe", () => {
  it("shows a one-button confirm page and writes nothing", async () => {
    const res = await get(`?token=${TOKEN}&kind=digest`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('<form method="post"');
    expect(html).toContain(`/api/email/unsubscribe?token=${TOKEN}&amp;kind=digest`);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("is 400 for a token that is not a UUID, and writes nothing", async () => {
    const res = await get("?token=abc&kind=digest");
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("not valid");
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe("POST /api/email/unsubscribe", () => {
  it("turns only that kind off, on the row with that token, ignoring the body", async () => {
    const fake = fakeSupabase({ "leader_email_prefs.update": { data: [{ email: "a@example.invalid" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    const res = await post(`?token=${TOKEN}&kind=digest`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
    expect(updatePayload(fake.calls)).toEqual({ digest: false, updated_at: expect.any(String) });
    expect(fake.calls).toContainEqual(["leader_email_prefs", "eq", "unsubscribe_token", TOKEN]);
    expect(fake.tables()).toEqual(["leader_email_prefs"]);
  });

  it("turns every kind off for kind=all, and nothing on", async () => {
    const fake = fakeSupabase({ "leader_email_prefs.update": { data: [{ email: "a@example.invalid" }] } });
    h.getSupabaseAdmin.mockReturnValue(fake.db);
    await post(`?token=${TOKEN}&kind=all`);
    expect(updatePayload(fake.calls)).toEqual({
      rpms: false,
      digest: false,
      church_health: false,
      apprentice: false,
      milestones: false,
      updated_at: expect.any(String),
    });
  });

  it("is 404 for a token that matches nobody", async () => {
    h.getSupabaseAdmin.mockReturnValue(fakeSupabase({ "leader_email_prefs.update": { data: [] } }).db);
    const res = await post(`?token=${TOKEN}&kind=rpms`);
    expect(res.status).toBe(404);
  });

  it("is 400 for an unknown kind, and writes nothing", async () => {
    const res = await post(`?token=${TOKEN}&kind=everything`);
    expect(res.status).toBe(400);
    expect(h.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("fails loud in the log but shows the reader no database detail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.getSupabaseAdmin.mockReturnValue(
      fakeSupabase({
        "leader_email_prefs.update": {
          error: { message: "Could not find the table 'public.leader_email_prefs' in the schema cache" },
        },
      }).db
    );
    const res = await post(`?token=${TOKEN}&kind=rpms`);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("schema cache");
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0].join(" "))).toContain("Leader email tables are missing");
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run src/app/api/email/unsubscribe/route.test.ts`
Expected: FAIL, "Failed to resolve import ./route".

- [ ] **Step 7: Write the notice page**

Create `src/lib/emails/noticePage.ts`:

```ts
// A small branded page for the unsubscribe link. It is a web page, not an
// email, so it may use a <style> block (for the focus ring), but it shares
// the emails' night palette and text wordmark.
import { COLOURS, esc } from "./layout";

export interface NoticePage {
  title: string;
  message: string;
  form?: { action: string; button: string };
  link?: { label: string; href: string };
}

export function renderNoticePage(input: NoticePage): string {
  const form = input.form
    ? `<form method="post" action="${esc(input.form.action)}"><button type="submit">${esc(input.form.button)}</button></form>`
    : "";
  const link = input.link ? `<p><a href="${esc(input.link.href)}">${esc(input.link.label)}</a></p>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${esc(input.title)} | Avenue</title>
<style>
body{margin:0;background:${COLOURS.ground};color:${COLOURS.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
main{max-width:480px;margin:0 auto;padding:64px 16px;}
.mark{font-family:Georgia,'Times New Roman',serif;font-size:30px;margin:0 0 32px;}
.mark span{color:${COLOURS.lamp};}
h1{font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;margin:0 0 12px;}
p{line-height:1.6;}
button{min-height:44px;padding:0 24px;border:0;border-radius:999px;background:${COLOURS.button};color:#fff;font-size:16px;font-weight:bold;cursor:pointer;}
a{color:${COLOURS.lamp};display:inline-block;min-height:44px;line-height:44px;}
button:focus-visible,a:focus-visible{outline:2px solid ${COLOURS.lamp};outline-offset:3px;}
</style>
</head>
<body><main><p class="mark">Avenue<span>.</span></p><h1>${esc(input.title)}</h1><p>${esc(input.message)}</p>${form}${link}</main></body>
</html>`;
}
```

- [ ] **Step 8: Write the unsubscribe route**

Create `src/app/api/email/unsubscribe/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { absoluteUrl } from "@/lib/emails/layout";
import { renderNoticePage, type NoticePage } from "@/lib/emails/noticePage";
import { EMAIL_KIND_INFO, emailTablesError, parseUnsubscribe, unsubscribePatch, type EmailKind } from "@/lib/emails/prefs";

// One-click unsubscribe (spec 3.2). No sign-in: the token in the link is the
// only key, it must be a UUID, and the only write sets preference columns
// to false on the row with that token. It never reads an email from the
// request. GET shows a confirm button and writes nothing, because mail
// scanners open every GET link; POST (that button, or a mail client's
// RFC 8058 one-click) turns the emails off. Repeating it is harmless.

function page(status: number, body: NoticePage): NextResponse {
  return new NextResponse(renderNoticePage(body), {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

// Henry to check wording (every page string in this file)
function which(kinds: EmailKind[]): string {
  return kinds.length > 1 ? "any Avenue leader emails" : `"${EMAIL_KIND_INFO[kinds[0]].label}" emails`;
}

const manage = () => ({ label: "Manage emails", href: absoluteUrl("/leaders/emails") });

const invalid = (): NoticePage => ({
  title: "This link is not valid",
  message: "This unsubscribe link is not valid. You can change your emails any time from your dashboard.",
  link: manage(),
});

function parse(request: NextRequest) {
  const url = new URL(request.url);
  return parseUnsubscribe(url.searchParams.get("token"), url.searchParams.get("kind"));
}

// GET /api/email/unsubscribe?token=<uuid>&kind=<kind|all>
export async function GET(request: NextRequest) {
  const parsed = parse(request);
  if ("error" in parsed) return page(400, invalid());
  const kind = parsed.kinds.length > 1 ? "all" : parsed.kinds[0];
  return page(200, {
    title: "Unsubscribe?",
    message: `Stop getting ${which(parsed.kinds)} from Avenue?`,
    form: { action: `/api/email/unsubscribe?token=${encodeURIComponent(parsed.token)}&kind=${kind}`, button: "Unsubscribe" },
  });
}

// POST /api/email/unsubscribe?token=<uuid>&kind=<kind|all>
export async function POST(request: NextRequest) {
  const parsed = parse(request);
  if ("error" in parsed) return page(400, invalid());

  const { data, error } = await getSupabaseAdmin()
    .from("leader_email_prefs")
    .update({ ...unsubscribePatch(parsed.kinds), updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", parsed.token)
    .select("email");
  if (error) {
    console.error("unsubscribe: update failed:", emailTablesError(error.message));
    return page(500, {
      title: "Something went wrong",
      message: "We could not update your emails just now. Please try the link again later.",
    });
  }
  if (!Array.isArray(data) || data.length === 0) return page(404, invalid());
  return page(200, {
    title: "You're unsubscribed",
    message: `You won't get ${which(parsed.kinds)} any more. You can turn them back on any time.`,
    link: manage(),
  });
}
```

- [ ] **Step 9: Run it to see it pass**

Run: `npx vitest run src/app/api/email/unsubscribe/route.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 10: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 447 tests pass (433 + 7 + 7); lint at most 54; build passes.

- [ ] **Step 11: Commit**

```bash
git add src/app/api/email-prefs/route.ts src/app/api/email-prefs/route.test.ts src/lib/emails/noticePage.ts src/app/api/email/unsubscribe/route.ts src/app/api/email/unsubscribe/route.test.ts
git commit -m "Leader emails: own-settings route and token unsubscribe (confirm on GET, off on POST)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Email previews tab, Emails panel and `/leaders/emails`

**Files:**
- Create: `src/app/api/admin/email-preview/route.ts`
- Test: `src/app/api/admin/email-preview/route.test.ts`
- Create: `src/components/admin/EmailPreviewTab.tsx`
- Modify: `src/app/leaders/admin/page.tsx` (`TABS` and the tab render list)
- Create: `src/components/ui/EmailPrefsPanel.tsx`
- Modify: `src/components/avenue/HeaderAvatar.tsx` (import and the sheet body, about line 147)
- Create: `src/app/leaders/emails/page.tsx`

**Interfaces:**
- Consumes: `loadSnapshot` (Task 8); `composeFor`, `firstNameOf`, `Snapshot` (Task 7); `milestoneEmail` (Task 6); `isEmailKind`, `PREVIEW_TOKEN`, `Recipient`, `EMAIL_KINDS`, `EMAIL_KIND_INFO`, `EmailKind`, `EmailPrefs` (Task 4); `normEmail` (Task 2); `GET/PATCH /api/email-prefs` (Task 9); `isAdminAuthorized`, `adminConfigError`, `getSupabaseAdmin`; `leaderFetch`; `useLeaderGate`; the existing `GET /api/leader-access/admin` (lists leaders).
- Produces:
  - `GET /api/admin/email-preview?kind=&email=` returning `{ subject: string | null; html: string | null; text: string | null; periodKey: string | null; note: string | null }`
  - `EmailPreviewTab({ adminKey }: { adminKey: string })`, `EmailPrefsPanel()` default exports
  - The page `/leaders/emails` (the "Manage emails" link in every email)

- [ ] **Step 1: Write the failing preview route tests**

Create `src/app/api/admin/email-preview/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Snapshot } from "@/lib/emails/compose";
import { PREVIEW_TOKEN } from "@/lib/emails/prefs";

// The database and the snapshot loader are replaced; the admin key check is
// the real one.
const h = vi.hoisted(() => ({ getSupabaseAdmin: vi.fn(), loadSnapshot: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabaseAdmin")>()),
  getSupabaseAdmin: h.getSupabaseAdmin,
}));
vi.mock("@/lib/emails/loadSnapshot", () => ({ loadSnapshot: h.loadSnapshot }));

import { GET } from "./route";

const KEY = "test-admin-key";
const ANN = "ann@example.invalid";
const TOKEN = "11111111-1111-4111-8111-111111111111";

// Monday 5 October 2026, 07:00 in Melbourne.
const snapshot: Snapshot = {
  now: new Date("2026-10-04T20:00:00Z"),
  leaders: [{ email: ANN, name: "Ann Lee", full_access: true }],
  prefs: [
    { email: ANN, rpms: true, digest: true, church_health: true, apprentice: true, milestones: true, unsubscribe_token: TOKEN },
  ],
  profiles: [],
  checkins: [],
  people: [],
  network: [],
  training: [],
  worksheets: [],
  guides: [],
  foundationsModuleIds: ["p1m0"],
};

const get = (query: string, key: string | null = KEY) =>
  GET(
    new NextRequest(`http://localhost/api/admin/email-preview${query}`, {
      headers: key ? { authorization: `Bearer ${key}` } : {},
    })
  );

beforeEach(() => {
  h.getSupabaseAdmin.mockReset().mockReturnValue({});
  h.loadSnapshot.mockReset().mockResolvedValue(snapshot);
  vi.stubEnv("ADMIN_API_KEY", KEY);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  vi.stubEnv("AVENUE_SITE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/admin/email-preview", () => {
  it("is 401 without the admin key and loads nothing", async () => {
    const res = await get(`?kind=digest&email=${ANN}`, null);
    expect(res.status).toBe(401);
    expect(h.loadSnapshot).not.toHaveBeenCalled();
  });

  it("is 400 for an unknown kind or a missing email", async () => {
    expect((await get(`?kind=weekly&email=${ANN}`)).status).toBe(400);
    expect((await get("?kind=digest")).status).toBe(400);
    expect(h.loadSnapshot).not.toHaveBeenCalled();
  });

  it("is 404 for someone who is not a leader", async () => {
    const res = await get("?kind=digest&email=nobody%40example.invalid");
    expect(res.status).toBe(404);
  });

  it("renders the leader's email as the engine would, with a preview token instead of theirs", async () => {
    const res = await get(`?kind=digest&email=${encodeURIComponent(ANN.toUpperCase())}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subject).toBe("Your week ahead");
    expect(body.periodKey).toBe("2026-10-05");
    expect(body.html).toContain("<!DOCTYPE html>");
    expect(body.html).toContain(`token=${PREVIEW_TOKEN}`);
    expect(body.html + body.text).not.toContain(TOKEN);
    expect(body.text).toContain("Good morning, Ann.");
    expect(body.note).toBeNull();
  });

  it("shows a sample milestone when none is due, and says so", async () => {
    const body = await (await get(`?kind=milestones&email=${ANN}`)).json();
    expect(body.subject).toBe("You walked Foundations");
    expect(body.note).toContain("sample");
  });

  it("says the apprentice email would be skipped for a leader with no apprentices", async () => {
    const body = await (await get(`?kind=apprentice&email=${ANN}`)).json();
    expect(body.html).toBeNull();
    expect(body.note).toContain("no apprentices");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/app/api/admin/email-preview/route.test.ts`
Expected: FAIL, "Failed to resolve import ./route".

- [ ] **Step 3: Write the preview route**

Create `src/app/api/admin/email-preview/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { adminConfigError, getSupabaseAdmin, isAdminAuthorized } from "@/lib/supabaseAdmin";
import { normEmail } from "@/lib/churchHealth";
import { composeFor, firstNameOf } from "@/lib/emails/compose";
import { loadSnapshot } from "@/lib/emails/loadSnapshot";
import { isEmailKind, PREVIEW_TOKEN, type Recipient } from "@/lib/emails/prefs";
import { milestoneEmail } from "@/lib/emails/templates";

// GET /api/admin/email-preview?kind=<kind>&email=<leader email> (admin key).
// Renders one leader's email as the engine would right now. Sends nothing
// and writes nothing. It always uses PREVIEW_TOKEN, never the leader's real
// unsubscribe token: the admin passcode must not be a way to collect
// tokens, and the sandboxed preview frame cannot follow links anyway.
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfgErr = adminConfigError();
  if (cfgErr) return cfgErr;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (!isEmailKind(kind)) {
    return NextResponse.json(
      { error: "kind must be one of rpms, digest, church_health, apprentice, milestones" },
      { status: 400 }
    );
  }
  const email = normEmail(url.searchParams.get("email") ?? "");
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  try {
    const snap = await loadSnapshot(getSupabaseAdmin(), new Date());
    const leader = snap.leaders.find((l) => normEmail(l.email) === email);
    if (!leader) return NextResponse.json({ error: "No leader with that email" }, { status: 404 });
    const row = snap.prefs.find((p) => normEmail(p.email) === email);
    const recipient: Recipient = {
      email,
      name: leader.name?.trim() || email.split("@")[0],
      token: PREVIEW_TOKEN,
    };

    // Henry to check wording (the notes below)
    const notes: string[] = [];
    if (leader.full_access !== true) notes.push("This leader does not have full access, so the engine would not email them.");
    if (row && row[kind] === false) notes.push("This leader has turned this email off, so the engine would skip them.");

    const outgoing = composeFor(kind, recipient, snap);
    if (outgoing.length > 1) notes.push(`${outgoing.length} are due today; this is the first.`);
    const first = outgoing[0];
    if (first) {
      const { subject, html, text } = first.message;
      return NextResponse.json({ subject, html, text, periodKey: first.periodKey, note: notes.join(" ") || null });
    }
    if (kind === "milestones") {
      const sample = milestoneEmail({
        firstName: firstNameOf(recipient, snap),
        token: PREVIEW_TOKEN,
        milestone: { type: "walked", stop: "phase1" },
      });
      notes.unshift("Nothing is due for this leader today. This is a sample (Foundations walked).");
      return NextResponse.json({ subject: sample.subject, html: sample.html, text: sample.text, periodKey: null, note: notes.join(" ") });
    }
    notes.unshift("This leader has no apprentices, so this email would be skipped.");
    return NextResponse.json({ subject: null, html: null, text: null, periodKey: null, note: notes.join(" ") });
  } catch (e) {
    console.error("email-preview:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/app/api/admin/email-preview/route.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the Email previews tab**

Create `src/components/admin/EmailPreviewTab.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { EMAIL_KIND_INFO, EMAIL_KINDS, type EmailKind } from "@/lib/emails/prefs";

// Spec 3.3 preview: render any leader's email as the engine would send it
// now, in a sandboxed frame. Nothing is sent from here.
interface LeaderOption {
  email: string;
  name: string | null;
  full_access: boolean;
}

interface Preview {
  subject: string | null;
  html: string | null;
  text: string | null;
  periodKey: string | null;
  note: string | null;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]";
const field = `min-h-[44px] rounded-lg border border-[var(--border)] bg-black/30 px-3 text-sm normal-case tracking-normal text-white ${focus}`;
const label = "flex flex-col gap-1 text-xs uppercase tracking-wider text-[var(--muted)]";

export default function EmailPreviewTab({ adminKey }: { adminKey: string }) {
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<EmailKind>("digest");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leader-access/admin", { headers: { authorization: `Bearer ${adminKey}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load leaders (${res.status})`);
        return (body.leaders ?? []) as LeaderOption[];
      })
      .then((list) => {
        if (cancelled) return;
        setLeaders(list);
        const first = list.find((l) => l.full_access) ?? list[0];
        if (first) setEmail((current) => current || first.email);
      })
      .catch((e: Error) => {
        console.error("EmailPreviewTab: leaders failed", e);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  const show = async () => {
    if (!email || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-preview?kind=${kind}&email=${encodeURIComponent(email)}`, {
        headers: { authorization: `Bearer ${adminKey}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not render the preview (${res.status})`);
      setPreview(body as Preview);
    } catch (e) {
      console.error("EmailPreviewTab: preview failed", e);
      setPreview(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Henry to check wording */}
      <p className="text-sm text-[var(--muted)]">
        See any leader&rsquo;s email as it would be sent right now. Nothing is sent from here.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className={label}>
          Email
          <select value={kind} onChange={(e) => setKind(e.target.value as EmailKind)} className={field}>
            {EMAIL_KINDS.map((k) => (
              <option key={k} value={k}>
                {EMAIL_KIND_INFO[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Leader
          <select value={email} onChange={(e) => setEmail(e.target.value)} className={field}>
            {leaders.map((l) => (
              <option key={l.email} value={l.email}>
                {(l.name || l.email) + (l.full_access ? "" : " (no full access)")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={show}
          aria-busy={busy}
          className={`min-h-[44px] rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white ${focus}`}
        >
          {busy ? "Rendering..." : "Show preview"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          {preview.note ? <p className="text-sm text-amber-400">{preview.note}</p> : null}
          {preview.subject ? (
            <p className="text-sm text-white">
              <span className="text-[var(--muted)]">Subject: </span>
              {preview.subject}
            </p>
          ) : null}
          {preview.html ? (
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-[900px] w-full rounded-xl border border-[var(--border)] bg-[#05070c]"
            />
          ) : null}
          {preview.text ? (
            <details>
              <summary className={`flex min-h-[44px] cursor-pointer items-center text-sm text-[var(--muted)] hover:text-white ${focus}`}>
                Plain-text version
              </summary>
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] p-4 text-xs text-[var(--muted)]">
                {preview.text}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Add the tab to the admin page**

In `src/app/leaders/admin/page.tsx` (`Mail` is already imported from `lucide-react`):

1. Below `import ChurchHealthTab from "@/components/admin/ChurchHealthTab";` add `import EmailPreviewTab from "@/components/admin/EmailPreviewTab";`
2. In `TABS`, after the `health` entry add:

```ts
  { id: "emails", label: "Email Previews", icon: Mail },
```

3. After `{activeTab === "health" && <ChurchHealthTab adminKey={adminKey} />}` add:

```tsx
        {activeTab === "emails" && <EmailPreviewTab adminKey={adminKey} />}
```

- [ ] **Step 7: Write the Emails panel**

Create `src/components/ui/EmailPrefsPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { leaderFetch } from "@/lib/leaderFetch";
import { EMAIL_KIND_INFO, EMAIL_KINDS, type EmailKind, type EmailPrefs } from "@/lib/emails/prefs";

// Spec 3.4: the leader's five email switches. Each change saves at once
// through PATCH /api/email-prefs, which takes the email from the session.
// A failed save puts the switch back and says why. The buttons are never
// disabled while saving (a disabled button drops keyboard focus); a second
// tap during a save is ignored instead.
export default function EmailPrefsPanel() {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<EmailKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    leaderFetch("/api/email-prefs")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load your email settings (${res.status})`);
        return body.prefs as EmailPrefs;
      })
      .then((loaded) => {
        if (!cancelled) setPrefs(loaded);
      })
      .catch((e: Error) => {
        console.error("EmailPrefsPanel: load failed", e);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (kind: EmailKind) => {
    if (!prefs || saving) return;
    const next = !prefs[kind];
    setSaving(kind);
    setError(null);
    setPrefs({ ...prefs, [kind]: next });
    try {
      const res = await leaderFetch("/api/email-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [kind]: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not save your email settings (${res.status})`);
      setPrefs(body.prefs as EmailPrefs);
    } catch (e) {
      console.error("EmailPrefsPanel: save failed", e);
      setPrefs((p) => (p ? { ...p, [kind]: !next } : p));
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby="email-prefs-heading" className="night-card p-5 sm:p-6">
      <h2 id="email-prefs-heading" className="font-serif text-2xl text-[var(--ink)]">
        Emails
      </h2>
      {/* Henry to check wording */}
      <p className="mt-1 text-sm text-[var(--muted)]">
        Choose which emails Avenue sends you. Every email also has an unsubscribe link.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-amber-400">
          {error}
        </p>
      ) : null}
      {!prefs && !error ? <p className="mt-4 text-sm text-[var(--muted)]">Loading your email settings...</p> : null}
      {prefs ? (
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {EMAIL_KINDS.map((kind) => {
            const on = prefs[kind];
            return (
              <li key={kind}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`email-pref-${kind}-label`}
                  aria-describedby={`email-pref-${kind}-desc`}
                  aria-busy={saving === kind}
                  onClick={() => toggle(kind)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]"
                >
                  <span className="min-w-0">
                    <span id={`email-pref-${kind}-label`} className="block text-sm font-semibold text-[var(--ink)]">
                      {EMAIL_KIND_INFO[kind].label}
                    </span>
                    <span id={`email-pref-${kind}-desc`} className="block text-xs text-[var(--muted)]">
                      {EMAIL_KIND_INFO[kind].description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors ${
                      on ? "border-[var(--lamp)] bg-[var(--lamp-soft)]" : "border-[var(--line-2)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${
                        on ? "translate-x-6 bg-[var(--lamp)]" : "translate-x-1 bg-[var(--dim)]"
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 8: Show the panel under the profile card**

In `src/components/avenue/HeaderAvatar.tsx`, below `import ProfileCard from "@/components/ui/ProfileCard";` add:

```tsx
import EmailPrefsPanel from "@/components/ui/EmailPrefsPanel";
```

and replace:

```tsx
          {/* Mounted only while open, so ProfileCard loads fresh each time. */}
          {open ? <ProfileCard email={user.email} fallbackName={user.name} /> : null}
```

with:

```tsx
          {/* Mounted only while open, so both load fresh each time. */}
          {open ? (
            <div className="space-y-6">
              <ProfileCard email={user.email} fallbackName={user.name} />
              <EmailPrefsPanel />
            </div>
          ) : null}
```

- [ ] **Step 9: Write the "Manage emails" page**

Create `src/app/leaders/emails/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLeaderGate } from "@/lib/useLeaderGate";
import EmailPrefsPanel from "@/components/ui/EmailPrefsPanel";

// Where "Manage emails" in every leader email lands (spec 3.2 footer).
// The same panel as the profile sheet, behind the usual leader gate.
export default function LeaderEmailsPage() {
  const { ready, error } = useLeaderGate();
  return (
    <div className="avenue-night">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/leaders"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        {/* Henry to check wording */}
        <h1 className="mt-4 font-serif text-4xl text-[var(--ink)]">Your emails</h1>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-amber-400">
            {error}
          </p>
        ) : null}
        {ready ? (
          <div className="mt-6">
            <EmailPrefsPanel />
          </div>
        ) : null}
      </main>
    </div>
  );
}
```

- [ ] **Step 10: Gates**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
Expected: tsc prints nothing; 453 tests pass (447 + 6); lint at most 54; build passes.

- [ ] **Step 11: Commit**

```bash
git add src/app/api/admin/email-preview/route.ts src/app/api/admin/email-preview/route.test.ts src/components/admin/EmailPreviewTab.tsx src/app/leaders/admin/page.tsx src/components/ui/EmailPrefsPanel.tsx src/components/avenue/HeaderAvatar.tsx src/app/leaders/emails/page.tsx
git commit -m "Leader emails: admin previews, the Emails panel and /leaders/emails

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 12: Controller browser check**

Migration 009 is not applied yet, so the preview route and the panel must fail loud. With `npm run dev`, at 375 px and desktop:
- `/leaders/admin`, "Email Previews" tab: the two selects and the button are at least 44 px tall with the lamp-colour focus ring. "Show preview" shows the red message containing "Leader email tables are missing. Apply supabase/migrations/009_leader_emails.sql first." Nothing else happens.
- `/leaders`, open the avatar sheet: the profile card, then the "Emails" panel showing the same missing-tables message in amber; the sheet still scrolls and closes as before (Escape, close button, backdrop).
- `/leaders/emails`: the "Dashboard" back link (44 px), the "Your emails" heading, the panel with the same message; no horizontal scroll at 375 px.
- The switch list itself is checked in Task 11 Step 4, after the migration.

---

### Task 11: Final pass (controller-run, gated steps)

**Files:** none new in the repo. Scratch scripts live outside the repo, in the session scratchpad (called `$SCRATCH` below), and are deleted at the end. Fixes found here go in their own small commits with exact paths.

Steps 3 and 7 are **gated on Henry**: ask him in chat with a multiple-choice question and wait for a clear yes. Steps 5 and 8 run `npx --yes tsx` and `npx --yes esbuild@0.25`, which download those tools from npm; ask Henry first if downloads are not already allowed in this session.

- [ ] **Step 1: Gates on the whole branch**

With the dev server stopped:

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
npm run guard
```

Expected: tsc prints nothing; 453 tests pass; lint at most 54 problems; build passes; guard prints `clean`.

- [ ] **Step 2: Protected files untouched, scope as planned**

```bash
git diff --stat main...HEAD -- src/lib/auth.ts src/lib/requireLeader.ts src/lib/leaderAuth.ts src/lib/leaderFetch.ts src/lib/supabaseAdmin.ts src/lib/journey.ts src/lib/avenue.ts src/lib/worksheets.ts src/lib/useWorksheet.ts src/lib/useMyPeople.ts src/app/leaders/training/useTrainingProgress.ts src/app/leaders/training/progressMerge.ts src/app/leaders/training/useCheckins.ts src/app/leaders/training/useNetworkView.ts src/components/ui/ProfileCard.tsx
git diff --name-only --diff-filter=M main...HEAD -- src/app/api
git diff --name-only --diff-filter=A main...HEAD -- src/app/api
git diff main...HEAD -- src/lib/email.ts | grep "^-" | grep -v "^---"
```

Expected: no output from the first two. The third lists exactly the eight new route files (`admin/church-health`, `admin/email-preview`, `email-prefs`, `email/unsubscribe`, each `route.ts` and `route.test.ts`). The fourth shows exactly the two removed lines from Task 6 Step 3 (the old `sendEmail` signature and its `if (!process.env.GMAIL_USER ...` line).

- [ ] **Step 3: GATED: apply migration 009**

Ask Henry: "Apply migration 009 (two new tables, leader_email_prefs and leader_email_log, no changes to existing tables) to production Supabase now?" Options: "Yes, apply it now" / "I'll paste it into the SQL editor myself" / "Not yet". Do nothing until he answers yes to one of the first two.

When applied (by the controller on his yes, or by Henry), verify with a read-only script. Write `$SCRATCH/check-009.mjs`:

```js
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
for (const table of ["leader_email_prefs", "leader_email_log"]) {
  const { error, count } = await db.from(table).select("*", { count: "exact", head: true });
  console.log(table, error ? `ERROR ${error.message}` : `ok, ${count} rows`);
}
```

Run from the repo root: `node --env-file=.env.local $SCRATCH/check-009.mjs`
Expected: `leader_email_prefs ok, 0 rows` and `leader_email_log ok, 0 rows`. Then `npm run guard` prints `clean`.

- [ ] **Step 4: Browser pass after the migration**

With `npm run dev`, at 375 px and desktop, signed in as a fixture leader (`@example.invalid`, full access):
- Avatar sheet and `/leaders/emails`: five switches with label and description, all on. Toggle "Your week" off: the switch moves, no error; reload: still off. Toggle it back on. Keyboard: Tab reaches each switch with the lamp ring; Space and Enter toggle it; a screen reader name is the label, the description is read after it, and the state is "on" or "off".
- `/leaders/admin`, "Email Previews": all five kinds for the fixture leader and for one real leader. Each renders in the frame (night ground, Avenue wordmark, Georgia heading, blue button, footer links); "Milestones" shows the sample note when nothing is due; "Apprentice" says skipped when there are none. Open "Plain-text version" once.
- `/leaders/admin`, "Church Health": still renders with real data.
- Delete the fixture leader's `leader_email_prefs` row by exact email (and any fixture rows the run created), then `npm run guard` prints `clean`.

- [ ] **Step 5: Engine dry run against real data (read only)**

Write `$SCRATCH/dry-run.ts` (replace `<repo>` with `C:/Users/User/CascadeProjects/Avenue`):

```ts
import { isDryRun, runScheduled } from "<repo>/src/lib/emails/runScheduled";

if (!isDryRun()) throw new Error("LEADER_EMAILS_DRY_RUN is set to false: stop, this script must only dry run");

// Sunday 18:00, Monday 07:00, the 1st and the 15th, all Melbourne time.
const instants = ["2026-10-04T07:00:00Z", "2026-10-04T20:00:00Z", "2026-10-31T20:00:00Z", "2026-10-14T20:00:00Z"];
for (const iso of instants) {
  const report = await runScheduled(new Date(iso));
  console.log(iso, JSON.stringify({ due: report.due, wouldSend: report.wouldSend.length, skipped: report.skipped.length, baselined: report.baselined.length, failed: report.failed, unparseableGuides: report.unparseableGuides }));
}
```

Run from the repo root: `npx --yes tsx --env-file=.env.local $SCRATCH/dry-run.ts`
Expected: four report lines; `failed` empty; `wouldSend` counts no larger than the number of full-access leaders per kind; any `unparseableGuides` listed are shown to Henry. Confirm nothing was written: rerun `node --env-file=.env.local $SCRATCH/check-009.mjs` and both tables still hold 0 rows (dry run never calls `ensurePrefs`, `claim` or `release`).

- [ ] **Step 6: Henry reviews the emails**

Publish the five previews (subjects, a screenshot of each rendered email at desktop and phone width, and every line marked `// Henry to check wording`) as one private artifact page and send Henry the link. Record his wording changes; any change is a small commit to `src/lib/emails/templates.ts`, `layout.ts`, `prefs.ts` or `apprentice.ts` with its tests updated, then Step 1 again. Step 7 waits until Henry says the previews are approved.

- [ ] **Step 7: GATED: one test email to Henry**

Ask Henry: "Send one test email now to henrymcmahon@avenuemission.com? Which one?" Options: the five kinds, plus "Not yet". Only on a clear yes, write `$SCRATCH/send-one-test.ts`:

```ts
// ONE test email to Henry, and nobody else. Run only after Henry says yes.
import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL, isEmailConfigured, sendEmail } from "<repo>/src/lib/email";
import { composeFor } from "<repo>/src/lib/emails/compose";
import { loadSnapshot } from "<repo>/src/lib/emails/loadSnapshot";
import { isEmailKind } from "<repo>/src/lib/emails/prefs";

const TO = "henrymcmahon@avenuemission.com";
const kind = process.argv[2];
if (!isEmailKind(kind)) throw new Error("usage: send-one-test.ts <rpms|digest|church_health|apprentice|milestones>");
if (ADMIN_EMAIL !== TO) throw new Error(`ADMIN_EMAIL is ${ADMIN_EMAIL}, expected ${TO}: stop`);
if (!isEmailConfigured()) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env.local");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const snap = await loadSnapshot(db, new Date());
const token = snap.prefs.find((p) => p.email.trim().toLowerCase() === TO)?.unsubscribe_token ?? null;
const [out] = composeFor(kind, { email: TO, name: "Henry", token }, snap);
if (!out) throw new Error(`Nothing to send for ${kind} today; pick another kind`);
if (out.email !== TO) throw new Error(`Refusing: composed for ${out.email}`);
await sendEmail(TO, `[TEST] ${out.message.subject}`, out.message.html, { text: out.message.text, headers: out.message.headers });
console.log(`Sent one ${kind} test email to ${TO}.`);
```

Run once from the repo root: `npx --yes tsx --env-file=.env.local $SCRATCH/send-one-test.ts <kind>`
Expected: `Sent one <kind> test email to henrymcmahon@avenuemission.com.` Tell Henry: the unsubscribe and "Manage emails" links point at the live site and work only after the branch is pushed. Ask him how it looks in Gmail, Outlook and Apple Mail (dark ground, text wordmark, button, footer). Run this script once only; never loop it, never change `TO`.

- [ ] **Step 8: Function bundle check and em dash sweep**

```bash
npx --yes esbuild@0.25 netlify/functions/leader-emails.mts --bundle --platform=node --format=esm --packages=external --outfile=$SCRATCH/leader-emails.mjs
grep -cE 'from "(next|react|react-dom)(/[^"]*)?"' $SCRATCH/leader-emails.mjs
grep -n 'schedule: "@hourly"' netlify/functions/leader-emails.mts
git diff main...HEAD | grep "^+" | python -c "import sys; print(sys.stdin.read().count(chr(0x2014)))"
python -c "print(open('docs/superpowers/plans/2026-09-24-church-health-emails.md', encoding='utf-8').read().count(chr(0x2014)))"
```

Expected: esbuild writes the bundle with no "Could not resolve" error (the `@/` imports resolved from `tsconfig.json`); the first grep prints `0` (no `next`, `react` or `react-dom` import reached the function bundle); the second grep prints the schedule line; both em dash counts print `0`.

- [ ] **Step 9: Push-time notes and the ledger**

Delete the scratch scripts and the bundle. Do not push. Add to the handover for Henry (not committed):
- Netlify env at push: `ADMIN_API_KEY` = the passcode Henry chose; `AVENUE_SITE_URL` only if the site is not `https://www.avenuemission.com`; leave `LEADER_EMAILS_DRY_RUN` unset (dry run). The function logs `[leader-emails]` lines hourly; read them for a week before going live.
- Going live is Henry's call: set `LEADER_EMAILS_DRY_RUN=false` in Netlify. The first live milestones run baselines every leader (no old-news emails).

Mark every task done in `.superpowers/sdd/church-health-emails/progress.md` with its commit hash and review verdict.

