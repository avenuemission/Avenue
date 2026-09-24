# Cleanup, speed, security and database: design

**Date:** 2026-09-24 (Melbourne)
**Branch:** `chore/cleanup`, cut from `feat/church-health-emails` at `4e52fff`
**Audit inputs:** `.superpowers/sdd/cleanup/audit/01-code.md`, `02-security.md`, `03-database.md`, `04-performance.md`, `05-research.md`
**Mode:** Henry handed over the wheel ("full speed ahead") and is away. Every judgement call below is marked **[Decision]** so he can overturn it later.

## 1. Goals and success criteria

| Goal | Done when |
|---|---|
| Speed | Mobile Lighthouse performance 85+ on `/`, `/vision`, `/intersection`, `/streetlights`, `/login`; 80+ on `/pathways`; CLS under 0.05 everywhere; desktop stays 90+. Before and after table recorded |
| Codebase | Conventional structure (section 4), no dead code (knip clean), one implementation per concern, lint 0 problems, README + ARCHITECTURE + CONTRIBUTING + docs a new engineer can follow |
| Security | No High or Medium audit item left open in code. Admin passcode stays exactly `avenue` |
| Database | Every live table in the repo as migrations, least-privilege grants and RLS, consistent types and constraints, backups taken before any drop or delete |

Always true: tests green and the count only goes up (dead tests deleted with a reason), `npx tsc --noEmit` clean, `npm run build` passes, `npm run guard` prints `clean`, zero em dashes, nothing pushed.

## 2. Hard constraints

1. The live site runs `main`. Nothing may be applied to the live database that breaks `main`'s code or the `feat/church-health-emails` code. Database work is therefore split in two phases (section 7).
2. Leader-facing behaviour stays the same: saving, sign-in, emails, the journey, profile, network, check-ins. Any deliberate change is listed in section 9 for Henry.
3. Old URLs keep working. No page URL changes are planned. `/api/email/unsubscribe` never moves (it is inside sent emails).
4. Env var names stay the same (no Netlify env edits needed for this branch beyond the existing go-live checklist).

## 3. Decisions taken for Henry

| # | Decision | Why |
|---|---|---|
| D1 | Keep localStorage Supabase sessions. No move to `@supabase/ssr` cookies and no `proxy.ts` | Big behaviour change for sign-in; out of scope for a cleanup |
| D2 | No Next.js `cacheComponents`. Public pages become Server Components with `export const revalidate = 300`, and admin writes call `revalidatePath` so edits still show at once | Speed without rewriting rendering rules |
| D3 | Public forms go through one server route. Netlify Forms and the browser-side `send-email` call are removed. Admin notification and the visitor's confirmation email still send, now built on the server | Removes an open email relay and a triple write |
| D4 | Pending leaders (`full_access = false`) still reach the network page, but `GET /api/network` only returns their own node, the person who sent them out, and their own descendants. Emails are not returned for anyone unless the client needs them | Stops a self sign-up from reading the whole church list; approved leaders see no change |
| D5 | Deleting a leader deletes their personal data (profile, training, check-ins, people, worksheets, email prefs, email log) by foreign key cascade | Today it leaves orphans in 8 tables |
| D6 | Enforced CSP (not Report-Only), verified locally on every page before commit | Report-Only would cost a second Netlify deploy to switch |
| D7 | Keep the old `anon`/`service_role` env names and keys | Renaming needs Netlify env edits and a deploy |
| D8 | Keep the workshop "Did you mean" code suggestion, add a rate limit | It helps people typing a code in a room |
| D9 | Rate limits and admin lockout live in a Supabase table plus one SQL function (no new service) | Works on Netlify functions with no extra infra |
| D10 | Workshop, discussion guide and AI recommendation files at the repo root move to `docs/archive/`; the Stitch design export and `data/leaders.csv` are deleted | Root clutter; the CSV holds a real email |
| D11 | No page renames (`/technological-stewardship` stays) | No evidence it helps; avoids redirects |

## 4. Target structure

```
src/
  app/
    (site)/            public pages, route group (no URL change) + its layout (Navbar, footer)
    login/
    leaders/           layout.tsx = the one auth gate + shared header
      training/_components, calling/_steps, launch/_steps
    api/
      admin/           every admin-key route (leaders, submissions, content writes, church-health, email-preview, session)
      forms/[type]     every public form
      email/unsubscribe  (never moves)
      ...leader routes stay at their current URLs
    robots.ts sitemap.ts
  components/
    ui/                primitives only
    site/              public site components
    leaders/           leader feature components by area
  content/             static editorial content (no logic)
  hooks/               client hooks
  lib/
    domain/            pure logic, no React/Next/Supabase imports
    client/            browser only
    server/            every file starts with import "server-only"
    emails/            server email system (templates, layout, engine)
  test/
```

Rules, enforced by ESLint `no-restricted-imports`: `lib/` never imports `app/`; client files never import `lib/server/*`; `lib/domain/*` imports nothing framework specific. Tests stay colocated as `*.test.ts`.

## 5. Workstreams

### 5.1 Codebase
- Delete dead files, routes and deps (audit 01 section 2), the Netlify Blobs mirror, root and `public/` clutter.
- Move files into section 4 with `git mv` (history kept); update imports; `tsc` after every batch.
- Consolidate: one mailer and one email layout (`lib/emails`), one admin check (`requireAdmin`), one admin fetch, one admin API for `leaders`, one leader gate (the leaders layout), one Melbourne date module, one study-guide date parser, one countdown hook, one workshop survey definition, one type per domain concept, shared route error helpers.
- Remove silent fallbacks to hard-coded content and CSV (fail loud).
- Split the 967-line admin page into one file per tab.
- Tooling: `eslint .`, import-boundary rules, knip with config, lint 0 problems, `vitest.config.mts`.
- Docs: README (engineer entry point), `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/` (setup, deployment, database, security, operations), `supabase/README.md`, `.env.example`. Old specs move to `docs/history/`.

### 5.2 Speed
- Newsreader font only on leader and login pages; Geist Mono only if still used.
- Google tag and Meta pixel via `next/script` after the page is interactive.
- Navbar stops importing supabase-js.
- Carousel image lists read at build time on the server; the carousel reserves its height (no layout shift).
- Google Maps loads when the map scrolls near view, with a sized placeholder.
- Home earth image: one `<Image>` with correct `sizes`; `preload` instead of the deprecated `priority`.
- `images.formats` AVIF + WebP; images over 200 KB in `public/` re-encoded (WebP, max 2400 px), references updated.
- Long cache headers on `public/images`.
- Public pages as Server Components reading content on the server with `revalidate`; client islands only for interactive parts.
- Leader pages: one gate in the layout, shared in-flight dedupe for `/api/leader-access` and `/api/network`.

### 5.3 Security
- `next` to the latest 16.x, `nodemailer` to the latest major, unused deps removed, `npm audit fix`.
- `POST /api/forms/[type]`: server picks recipients (one validated visitor address, admin address from config), fixed templates, every value escaped, size caps, honeypot, rate limit per IP and per recipient. Leader support confirmations go to the signed-in leader's own email with the Zoom details from server config.
- APEST email content is generated on the server, not taken from the request.
- `requireAdmin`: one helper, SHA-256 plus `timingSafeEqual`, lockout after 5 failures in 15 minutes per IP (429), failures and successes logged without the key. Passcode unchanged.
- `POST /api/leader-access`: validation, caps, honeypot, rate limit, same answer whether or not the email exists, server-generated id.
- Network scoping for pending leaders (D4).
- Workshop routes use the service role client; caps on text sent to OpenAI; rate limit on public OpenAI routes.
- Admin-written URLs must be `https:`; avatars must be `data:image/(png|jpeg|webp);base64,`.
- Generic error messages to callers, details to logs.
- `import "server-only"` on every server module.
- Security headers and CSP in `next.config.ts` (the Netlify adapter ignores `netlify.toml` headers for Next pages).

### 5.4 Database
See section 7.

## 6. Testing and verification

- TDD for every new helper and route (rate limit, requireAdmin, forms validation, network scoping, URL checks, date module).
- Each task: implementer runs `tsc`, `npm test`, `npm run lint`, and the build when it touches config; a separate reviewer reviews the diff.
- Controller checks every changed screen in the browser pane at 375 px and desktop, signed out and as a fixture leader.
- Lighthouse after, same method and pages as the baseline (`audit/perf/`).
- Final whole-branch review before the summary.

## 7. Database plan

**Backup first:** every table exported as JSON (service role) plus the catalog snapshot, saved outside the repo at `C:\Users\User\Documents\Avenue-backups\2026-09-24\`.

**Phase A: apply now** (safe with `main` and the email branch still live):

| File | Change |
|---|---|
| `010_baseline_workshops.sql` | `create table if not exists` for `workshop_sessions` and `survey_responses` as they exist live (no-op live) |
| `011_rate_limits.sql` | `rate_limits` table (RLS on, no policies, no anon grants) and `rate_limit_hit(key, window_seconds, max_hits)` function |
| `012_updated_at_triggers.sql` | One `set_updated_at()` trigger function on the 7 tables with `updated_at` |
| `013_email_checks.sql` | `email = lower(btrim(email))` checks on every email key column |
| `014_leader_fks.sql` | Delete the 1 orphan profile (exported first), FKs to `leaders(email)` with cascade (D5) |
| `015_check_constraints.sql` | CHECKs (form types, roles, APEST, lat/lng, stats, colours), defaults and NOT NULL on workshop columns |
| `016_typed_columns.sql` | `study_guides.guide_on date` and `leader_profiles.pathway_group_id` FK, backfilled, kept in sync with the old text columns by triggers until phase B; `pdf_url ''` to null |
| `017_indexes_invoker_and_submissions.sql` | Two indexes, `worksheet_set_section` to security invoker, drop the unused anon insert policy on `form_submissions` |

**Phase B: apply right after Henry's push** (file `018_post_push_lockdown.sql`, written and tested now, NOT applied): revoke all table, sequence and function grants from `anon` and `authenticated` plus default privileges; RLS on the workshop tables with every anon policy dropped; drop the public read policies on content tables; drop `study_guides.guide_date`, `leader_profiles.pathway_group` and the sync triggers. After it runs, the anon key can do nothing but sign in.

`supabase/schema.sql` (a destructive drop-and-recreate script) becomes `supabase/legacy/schema-001.sql` with a warning banner; `supabase/README.md` explains the order.

## 8. Out of scope

Cookie-based auth, Cache Components, env key renames, disabling public Supabase sign-ups (needs a live sign-in test), moving private leader resources to Supabase Storage, rotating Google keys (Henry's Google Cloud console). All listed as recommendations in the final summary.

## 9. Behaviour changes Henry should know about

1. Pending leaders see only their own part of the network (D4).
2. Deleting a leader deletes their data (D5).
3. Public form submissions no longer appear in the Netlify Forms dashboard; they are in the admin page as before (D3).
4. Content edits in the admin page appear on the public site at once (via revalidation), as today; if Supabase is down, public pages keep their last good copy instead of falling back to old hard-coded data.
5. Repeated wrong admin passcodes lock that device out for 15 minutes.
