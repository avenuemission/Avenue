# Church Health admin view, header tidy, and leader emails

**Date:** 2026-09-24
**Status:** Approved in chat by Henry ("Go")
**Branch:** `feat/church-health-emails` (from `main` at `1825655`). Nothing is pushed until Henry says "push" (Netlify redeploy credits are limited).

## Decisions (Henry, 24 Sep, multiple choice)

| Question | Decision |
|---|---|
| Admin passcode | Passcode only, value `avenue` (Henry chose this over a login-backed admin after the risk was explained). It is the `ADMIN_API_KEY` env var: set in Netlify at push time and in local `.env.local`. No code change for the value |
| Collective church health page | Church totals over time, by pathway group, by leader including names, and leader health (RPMS) |
| "Leaders Hub" | Remove the "Leaders Hub" label from the dashboard header; the five "Leaders Hub" back links become "Dashboard" |
| Emails asked for | Weekly RPMS reminder, weekly Pathways topic, monthly church health update |
| Extra emails chosen | Monday "Your week" digest, apprentice nudges, milestone celebrations (not the pastor care check) |
| Timing (Melbourne) | RPMS Sunday 18:00; Monday digest 07:00 (it carries this week's Pathways topic, so it IS the weekly topic email: one Monday email, not two); church health 1st of the month 07:00 |
| Opt-out | Per-email-type toggles in the leader's profile plus a one-click unsubscribe link in every email |
| Monthly church health content | Ask to update the three lists, their own counts and change since last month, and the whole church's totals as encouragement |
| Sender | The existing Gmail SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`), from "Avenue Mission" |

## 1. Header tidy

- `src/app/leaders/page.tsx`: remove the "Leaders Hub" label from the header bar (the avatar and logout stay).
- Back links on `leaders/network`, `leaders/resources`, `leaders/study-guides`, `leaders/support`, `leaders/workshops`: text "Leaders Hub" becomes "Dashboard" (still linking to `/leaders`).

## 2. Church Health admin tab

- A new "Church Health" tab on `/leaders/admin`, alongside the existing tabs, loaded with the same admin Bearer key.
- New read-only route `GET /api/admin/church-health` guarded by the existing server-side admin key check (`isAdminAuthorized` in `src/lib/supabaseAdmin.ts`), reads through `getSupabaseAdmin()`: `leaders`, `leader_profiles` (for `pathway_group` and name), `leader_people` (owner_email, names, metrics, created_at), `leader_checkins` (email, week_start, four scores). Fails loud.
- Sections:
  1. **Church totals over time:** current totals of named people per metric, and a month-by-month line (last 12 months) built from `leader_people.created_at` (a person counts from the month they were first recorded; a person removed is no longer counted). Say in a footnote that history is reconstructed from record dates.
  2. **By pathway group:** totals per `leader_profiles.pathway_group` (free text, grouped case-insensitively and trimmed; blank shows as "No group set").
  3. **By leader:** one row per leader: name, group, three counts, expandable list of the names per metric.
  4. **Leader health:** per leader, last check-in date, last four-week average of each RPMS gauge, and a "no check-in for 3+ weeks" flag; plus church-wide averages. Colours use the gauge colours from round 2 only here.
- Aggregation logic is pure (in `src/lib/churchHealth.ts`) with unit tests; the route only loads rows and calls it.

## 3. Leader emails

### 3.1 Data (one migration, `009_leader_emails.sql`, applied by Henry or on his explicit instruction)

- `leader_email_prefs(email text primary key, rpms boolean default true, digest boolean default true, church_health boolean default true, apprentice boolean default true, milestones boolean default true, unsubscribe_token uuid not null default gen_random_uuid(), updated_at timestamptz default now())`. A missing row means all on.
- `leader_email_log(id bigserial primary key, email text not null, kind text not null, period_key text not null, sent_at timestamptz default now(), unique(email, kind, period_key))`. `period_key` is e.g. the Melbourne date of the Sunday for RPMS, `2026-10` for monthly, `phase3-walked` or `launch-7d` for milestones. The unique constraint is the guarantee against double sends.
- No RLS policies (service role only), matching earlier migrations.

### 3.2 Emails

| Kind | When (Melbourne) | Content |
|---|---|---|
| `rpms` | Sunday 18:00 | Short reflective nudge, last week's four scores if any, button to this week's check-in (`/leaders/training?phase=phase4`) |
| `digest` | Monday 07:00 | This week's Pathways topic (title, passage, link), RPMS trend (last 4 weeks), up to 3 people named in the last 30 days to follow up, their next journey step (from `hereActionFor`) |
| `church_health` | 1st of month 07:00 | Ask to update the three lists, their counts and change vs last month, church-wide totals, button to Growth |
| `apprentice` | 15th of month 07:00 | Each apprentice (network_people sent by them) with current rung and the next step, with a one-line how-to per rung; skipped if they have none |
| `milestones` | Checked daily 07:00 | A phase newly walked since the last run (Foundations, Calling, Launch; Growth/Multiply first-ongoing), launch date in 30, 7 or 1 days; each sent once via the log |

- "This week's topic": parse `study_guides.guide_date` as `DD/MM/YYYY` (free text; unparseable rows are skipped and reported in the job log); the topic for a week is the guide dated within that Monday-to-Sunday, else the most recent past one.
- Recipients: `leaders` rows with `full_access = true`, minus those whose pref for that kind is false. Never sends to anyone else.
- Every email: Avenue branding (night palette `#05070c` ground, `#ffc56b` lamp accent, `#4f7cff` button, Newsreader-style serif heading with Georgia fallback since mail clients cannot load web fonts reliably, Avenue wordmark), a plain-text alternative, a footer with "Manage emails" (profile) and a one-click unsubscribe link `/api/email/unsubscribe?token=...&kind=...` (sets that kind off; `kind=all` turns all off) plus the RFC 8058 `List-Unsubscribe` and `List-Unsubscribe-Post` headers.
- Templates are pure functions (`src/lib/emails/*.ts`) returning `{ subject, html, text }`, with unit tests (content present, unsubscribe link present, no em dash).

### 3.3 Engine

- A Netlify Scheduled Function `netlify/functions/leader-emails.mts`, schedule `@hourly`. Each run computes Melbourne local time (via `Intl.DateTimeFormat` with `Australia/Melbourne`, so daylight saving is handled) and decides which kinds are due this hour; for each due kind it loads recipients, renders, and sends through the shared `sendEmail` (nodemailer/Gmail), inserting the log row first (unique constraint) so a retry or overlap never double-sends. Sends are sequential with a small delay to respect Gmail limits. Errors are logged loud per recipient and do not stop the rest.
- A `DRY_RUN` env flag (default on until Henry says otherwise): renders and logs what would be sent without sending or writing the log.
- Preview: an admin-key-guarded route `GET /api/admin/email-preview?kind=...&email=...` returns the rendered HTML for a given leader so Henry can see each email before anything is sent.

### 3.4 Preferences UI

- In the ProfileCard edit view (or a small "Emails" section in the profile panel): five toggles with one-line descriptions, saved via a new `GET/PATCH /api/email-prefs` route (`requireLeader`, email from session only).

## 4. Safety

- No email is sent during development or tests. The only real send is one test email to Henry's address after he approves the previews.
- The migration is not applied without Henry's explicit go.
- `npm run guard` clean; fixtures only `@example.invalid`.
- No change to existing auth, saving, or the protected hooks. New routes: church-health (admin key), email-preview (admin key), email-prefs (requireLeader), unsubscribe (token).
- Tests only go up from 316; lint at or below 54; no em dashes.
