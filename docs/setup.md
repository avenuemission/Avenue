# Setup

How to get the site running on a new machine, and how to build a brand-new Supabase project from scratch.

## A new machine (the usual case)

1. Install Node 20.9 or later (the repo is developed on Node 24).
2. Clone the repo and run `npm install`.
3. Copy `.env.example` to `.env.local`. Ask the site owner for the values.
4. Run `npm run dev` and open http://localhost:3000.

⚠️ `.env.local` points at the **live** Supabase project. There is no staging database. Reading is safe. Before anything that writes, read [operations.md](operations.md).

### Which values you need

| To do this | You need |
|---|---|
| See the public pages | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (pages read content on the server) |
| Sign in as a leader | also `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Use the admin page | also `ADMIN_API_KEY` |
| Send any email | also `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| The `/pathways` map | also `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| APEST results, workshop AI | also `OPENAI_API_KEY` |
| Intersection calendar | also `GOOGLE_CALENDAR_API_KEY` |

The full table (secret or public, build or runtime) is in [deployment.md](deployment.md).

## Where to find the Supabase keys

In the Supabase dashboard for the project:

| Value | Where |
|---|---|
| Project URL | Project Settings > API > Project URL |
| Anon key | Project Settings > API Keys > the `anon` / publishable key |
| Service role key | Project Settings > API Keys > the `service_role` / secret key (`sb_secret_...`) |

❌ Never put the service role key in a `NEXT_PUBLIC_` variable. It bypasses every database rule.

The server checks the key's shape on admin and sign-in routes. If `SUPABASE_SERVICE_ROLE_KEY` is set to the anon key by mistake, those routes answer 500 with a message that says so.

## A brand-new Supabase project

Only for an empty project. **Never run these steps against the live database.**

1. Create the project in Supabase.
2. Open the SQL Editor.
3. Run `supabase/legacy/schema-001.sql` (it drops and recreates tables, which is why it must only ever touch an empty project). It creates the content tables, `form_submissions` and `leaders`. It seeds pathway groups, events with placeholder dates, site stats, the 42 study guides, and one full-access leader (`info@avenuemission.com`).
4. Run every file in `supabase/migrations/` in number order, `002` to `018`. On a new project `018` can run straight away: there is no old code depending on the anon key.
5. Run `scripts/db/catalog.sql` and check every table has RLS on and no anon grants.
6. Add yourself as a leader: insert a row in `leaders` with a text `id`, your email (lowercase) and `full_access = true`. Sign-in codes are only sent to emails in `leaders`.

More on migrations: [database.md](database.md) and `supabase/README.md`.

## Leader approval

1. Someone asks for access on `/login`.
2. They become a pending leader: a `leaders` row with `full_access = false`.
3. The admin address gets an email.
4. In **Admin > Leaders & Access**, find them and give them full access.

Pending leaders can sign in and use most leader pages. They see only their own part of the network, and cannot open leader resources or the workshop results tools.

## What the admin page edits

| Tab | Edits |
|---|---|
| Form submissions | View, archive and delete website form submissions |
| Leaders & Access | Approve or revoke access, add or remove leaders (removing a leader deletes their data) |
| Pathway groups | The groups on the `/pathways` map |
| Intersection events | Event info and upcoming dates |
| Study guides | The weekly pathways topics |
| Site stats | The counters on `/pathways` |
| Church health | Leader activity overview |
| Email previews | Renders each leader email for checking |

Public pages show content edits on the next request (the write calls `revalidatePath`).
