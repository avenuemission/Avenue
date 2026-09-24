# Deployment

How the site gets to production on Netlify, which environment variables it needs, and the go-live checklist.

## How a deploy happens

- Netlify builds and deploys **every push to `main`** automatically.
- Build command: `npm run build`. Publish folder: `.next` (`netlify.toml`).
- The Netlify Next.js runtime (`@netlify/plugin-nextjs`) turns pages and route handlers into Netlify functions. Netlify installs it itself; it is not in `package.json`.
- `netlify/functions/leader-emails.mts` is deployed alongside as a scheduled function.

💰 **Each production deploy costs Netlify credits, and credits are limited.** Batch work on a branch and push once. Do not push to test a small fix. Check everything locally first (`npm run check`, `npm run build`).

⚠️ A change to an environment variable only takes effect on the **next** deploy. Set variables before the push that needs them.

## The build reads the database

Public pages are server-rendered from Supabase content and pre-built at build time. So the **build** needs Supabase access, not just the running site.

In Netlify (Site configuration > Environment variables), `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must include the **Builds** scope as well as Functions and Runtime. If they are missing at build time, the build fails (loudly, by design).

## Environment variables

Names never change: code, `.env.example` and Netlify all use these exact names.

| Name | Used by | Secret? | Needed at |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser sign-in, all server code, the email function, the CSP header (`next.config.ts`) | Public | Build and runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser sign-in (`lib/client/supabaseBrowser.ts`), the key sanity check | Public | Build (inlined into the browser bundle) and runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Every table read and write, the email function, APEST text signing | 🔒 Secret | Build and runtime |
| `ADMIN_API_KEY` | `requireAdmin`: the admin passcode | 🔒 Secret | Runtime |
| `GMAIL_USER` | Sender address for every email | 🔒 Secret | Runtime |
| `GMAIL_APP_PASSWORD` | Gmail app password for SMTP | 🔒 Secret | Runtime |
| `AVENUE_SITE_URL` | Links inside leader emails. Defaults to `https://www.avenuemission.com` | Public | Runtime (email function) |
| `LEADER_EMAILS_DRY_RUN` | The email function sends only when this is exactly `false` | Public | Runtime (email function) |
| `OPENAI_API_KEY` | `/api/apest-results`, `/api/workshops/ai-recommendation`, `/api/workshops/ai-speak` | 🔒 Secret | Runtime |
| `GOOGLE_CALENDAR_API_KEY` | `/api/calendar-events` | 🔒 Secret | Runtime |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | The `/pathways` map | Public (restrict by referrer in Google Cloud) | Build (inlined into the browser bundle) |

- ❌ A `NEXT_PUBLIC_` variable is copied into the browser JavaScript. Never give a secret that prefix.
- The site does not use `NODE_ENV` from Netlify; Next sets it.

## The scheduled email function

| Fact | Detail |
|---|---|
| File | `netlify/functions/leader-emails.mts` (calls `src/lib/emails/runScheduled.ts`) |
| Schedule | `@hourly`: minute 0 of every UTC hour |
| Runs on | The published production deploy only. Not deploy previews, not locally |
| Time limit | Netlify stops it at 30 seconds. It sends at most 20 emails and claims nothing new after 20 seconds |
| Dry run | On unless `LEADER_EMAILS_DRY_RUN` is exactly `false`. A dry run renders and reports, never sends or writes |
| Logs | Netlify > Logs > Functions > `leader-emails`. Each run prints `[leader-emails] report {...}` |
| Pre-push check | `npm run check:function` bundles it like Netlify does and checks it loads |

What it sends and when: [ARCHITECTURE.md](../ARCHITECTURE.md#leader-email-engine).

## Go-live checklist

Do these in order. The owner decides when to push.

### 1. Before the push

- [ ] Local gates pass: `npm run check`, `npm run knip`, `npm run build`.
- [ ] `npm run guard` prints `clean`.
- [ ] Netlify env vars set (all scopes that need them):
  - [ ] `ADMIN_API_KEY`: the passcode the owner chose (unchanged; ask them).
  - [ ] `LEADER_EMAILS_DRY_RUN=false` (live emails from this deploy).
  - [ ] `AVENUE_SITE_URL=https://www.avenuemission.com`.
  - [ ] Still present: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GOOGLE_CALENDAR_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` include the **Builds** scope.

### 2. Push once

- [ ] Merge to `main` and push. One push ships everything.
- [ ] Watch the Netlify build log until the deploy is **Published**.

### 3. Check the live site

- [ ] Public pages load: `/`, `/pathways`, `/intersection`, `/vision`, `/streetlights`.
- [ ] `/robots.txt` and `/sitemap.xml` load.
- [ ] Sign in as a leader. Dashboard, network and study guides load.
- [ ] `/leaders/admin` accepts the passcode.
- [ ] Browser console shows no CSP errors.
- [ ] After the next full hour, the `leader-emails` log shows a report with `dryRun: false`.

### 4. Lock down the database (phase B), only after step 3

`supabase/migrations/018_post_push_lockdown.sql` removes every anon and authenticated grant and policy, and drops two old columns. The **old** code reads tables with the anon key, so running it before the new code is live breaks the site.

- [ ] Confirm no route handler uses the browser client: `grep -rn "supabaseBrowser" src/app/api` prints nothing.
- [ ] Back up every table (it drops columns): `node --env-file=.env.local scripts/db/export-tables.mjs C:\Users\User\Documents\Avenue-backups\<date>`. Never inside the repo.
- [ ] Run `scripts/db/catalog.sql` in the Supabase SQL Editor. Save the result.
- [ ] Run `018_post_push_lockdown.sql` in the SQL Editor. It is one transaction: an error changes nothing.
- [ ] Run `scripts/db/catalog.sql` again. Expect: RLS on for every table, **zero** policies, **zero** anon or authenticated grants, the two `*_sync_*` triggers gone.
- [ ] In the Table Editor, `study_guides.guide_date` and `leader_profiles.pathway_group` are gone.
- [ ] Recheck step 3, plus the workshop tool and the admin study guide editor.
- [ ] `npm run guard` prints `clean`.

If a page breaks after 018, some code is still using the anon key for a table. Fix the code to use `getSupabaseAdmin()`. Do not re-grant the anon role.
