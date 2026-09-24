# Supabase database

One Supabase project (`omepkrdyuymnqopaznid`). All table access is server side through the service role (`getSupabaseAdmin()`). The browser only uses Supabase for sign-in.

## How migrations are applied

There is no migration runner. Each file in `migrations/` is pasted into the Supabase **SQL Editor** and run, in number order, once. Every file is idempotent (`if not exists`, `drop ... if exists`, checks on `pg_constraint`), so running one twice does no harm.

| Step | What |
|---|---|
| 1 | Export every table first (below). Keep it outside the repo: it holds personal data. |
| 2 | Run `scripts/db/catalog.sql` in the SQL editor and save the result. |
| 3 | Run the migration file. |
| 4 | Run `scripts/db/catalog.sql` again and compare. |
| 5 | Run `npm run guard` (no fixture rows left). |

A brand-new empty project starts with `legacy/schema-001.sql` (the first hand-written script, which drops and recreates tables: never run it against a database that has data), then `migrations/` from `002`.

## Phase A and phase B

| Files | When | Why |
|---|---|---|
| `002` to `017` | Now. Safe while the live site still runs the old code | `010` records the workshop tables. `016` adds typed columns (`study_guides.guide_on`, `leader_profiles.pathway_group_id`) and triggers that keep the old text columns in sync, so old and new code both work. |
| `018_post_push_lockdown.sql` | **Only after the new code is live** | Removes every anon and authenticated grant and policy, and drops `guide_date`, `pathway_group` and the sync triggers. The old code reads content and workshop tables with the anon key, so applying it early breaks the live site. Before running it, check no API route still uses the browser client for a table: `grep -rn "supabaseBrowser" src/app/api` must print nothing. |

## Backup

```
node --env-file=.env.local scripts/db/export-tables.mjs C:\Users\User\Documents\Avenue-backups\<date>
```

Writes one JSON file per public table and a `manifest.json` with row counts. It refuses a folder inside the repo or one that already holds a backup.

## Catalog check

`scripts/db/catalog.sql` is read only. It lists, per public table: RLS, policies, anon and authenticated grants, functions (security definer or not), storage buckets, constraints, indexes, triggers, default privileges and nullable timestamps.
