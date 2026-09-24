# Operations

How to back up the database, test safely against production, run the smoke checks, and check the leader email engine.

⚠️ **There is no staging database.** `.env.local` points at production. Every script below that writes, writes to the live site.

## Backups

Take one before any migration that deletes or drops, and before any bulk admin change.

```bash
node --env-file=.env.local scripts/db/export-tables.mjs C:\Users\User\Documents\Avenue-backups\<yyyy-mm-dd>
```

| Fact | Detail |
|---|---|
| Output | One `<table>.json` per public table (all 18) plus `manifest.json` with row counts and the time |
| Where | **Outside the repo.** The files hold personal data. The script refuses a folder inside the repo |
| Overwrite | Never. It refuses a folder that already holds a `manifest.json` |
| Reads | Read only (service role) |
| Not included | Supabase Auth users. Export those from the Supabase dashboard if needed |

When you add a table, add it to `TABLES` in `scripts/db/export-tables.mjs`.

Restoring is manual: insert the rows back from the JSON in the SQL Editor or a one-off script. There is no restore script.

## Fixtures and `npm run guard`

A fixture is a throwaway test row (a fake leader, a fake network person) that a script creates in production and deletes afterwards.

| Rule | Why |
|---|---|
| Every fixture email ends in `@example.invalid` | `.invalid` can never be a real address, and the guard can find it |
| Delete by one exact literal email | Never a `like`, prefix or `neq` match that could hit a real person |
| Never edit or delete a real leader's rows | Some checks act as `info@avenuemission.com` (a real account) and remove only the fixture rows they added |
| Run `npm run guard` before and after | It must print `clean` |

- `scripts/lib/fixtures.mjs` has the shared helpers: `createFixtureLeader`, `tokenFor` (a real session token for a fixture), `cleanupFixtures`, and `assertFixtureEmail`, which refuses any non-fixture email.
- `npm run guard` (`scripts/guard-test-rows.mjs`) searches every email column and the Auth users for `@example.invalid`. Read only. Exits non-zero and lists what it found if anything is left.

## Smoke checks

End-to-end checks against the real database. The API ones need the dev server running on port 3000 (`npm run dev`). Run each with:

```bash
node --env-file=.env.local <script>
```

| Script | Checks | Writes? |
|---|---|---|
| `scripts/check-auth.mjs` | Every leader route trusts only the verified session; admin routes need the key | ✅ fixtures, cleaned up |
| `scripts/smoke/check-network-api.mjs` | `/api/network` reads, adds, depth and scoping | ✅ fixtures, cleaned up |
| `scripts/smoke/check-network-signup.mjs` | Sign-up creates a network node | ✅ fixtures, cleaned up |
| `scripts/smoke/check-training-api.mjs` | `/api/leader-training` and the checkpoint flow | ✅ fixtures, cleaned up |
| `scripts/smoke/check-checkins-api.mjs` | `/api/leader-checkins` | ✅ fixtures, cleaned up |
| `scripts/smoke/check-network-table.mjs` | `network_people` has every expected column | ❌ read only |
| `scripts/smoke/check-training-table.mjs` | `leader_training_progress` has every expected column | ❌ read only |
| `scripts/smoke/check-rhythms-schema.mjs` | `leader_checkins` and `apprentice_step` exist | ❌ read only |
| `scripts/smoke/check-function-bundle.mjs` (`npm run check:function`) | The Netlify email function bundles and loads in plain Node | ❌ never calls it |
| `scripts/db/catalog.sql` | RLS, policies, grants, functions, constraints, indexes, triggers. Paste into the SQL Editor | ❌ read only |

Always finish with `npm run guard`.

## Leader email engine

### Dry run

The hourly function is a dry run unless `LEADER_EMAILS_DRY_RUN` is exactly `false`. A dry run loads the data, renders every due email and reports who **would** get what. It never sends and never writes.

| Want to | Do |
|---|---|
| See what the live function did | Netlify > Logs > Functions > `leader-emails`. Look for `[leader-emails] report {...}`: `sent`, `wouldSend`, `failed`, `deferred` |
| Pause live emails | Set `LEADER_EMAILS_DRY_RUN` to anything but `false` (or delete it). Needs a deploy to take effect |
| See an email before it goes out | Admin > **Email previews** tab |
| Check the function will load | `npm run check:function` |

A run only does work when a kind is due that Melbourne hour (see [ARCHITECTURE.md](../ARCHITECTURE.md#leader-email-engine)), so most hourly reports show `due: []`.

### If something looks wrong

| Report field | Meaning | Action |
|---|---|---|
| `failed` | The send failed. The claim was released | The next hourly run that day retries |
| `deferred` | Out of time or over 20 sends this run | The next hourly run picks it up |
| `failed` ending "outcome unknown, not retried" | The send timed out. Gmail may have sent it. The claim is kept, so it will **not** retry | Check the Gmail sent folder |
| `unparseableGuides` | A study guide has a bad date | Fix it in Admin > Study guides |

The function bundle check (`scripts/smoke/check-function-bundle.mjs`) catches the most likely breakage: a module in the function's import graph that only loads inside Next.js (for example one with `import "server-only"`). It bundles with esbuild the way Netlify does, imports the bundle, and checks the default export is a function.

## Other tools

| Script | What it does |
|---|---|
| `scripts/tools/optimise-images.mjs` | Shrinks JPG and PNG files over 200 KB in `public/images` in place, same names. `--check` reports only |
| `scripts/tools/sync-youtube-titles.mjs` | Copies real YouTube titles into `src/content/training/phases.ts`. `--check` reports only |
