# Avenue Supabase Setup Steps

## 1. Create / open your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Create a new project (or use an existing one).
3. Once created, open the project dashboard.

## 2. Get your connection keys

1. In the Supabase dashboard, go to **Project Settings > API**.
2. Copy these two values:
   - **Project URL** — e.g. `https://abcdefgh12345678.supabase.co`
   - **Project API keys > anon public** — the `anon` key
3. Go to **Project Settings > Data API** and copy:
   - **service_role key** — under the `service_role` secret

## 3. Add environment variables to Netlify

1. In your Netlify dashboard, open **Site configuration > Environment variables**.
2. Add the following variables:

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Public (used by browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key | Public (used by browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key | **Secret** — never expose to browser |
| `ADMIN_API_KEY` | Any long random string you choose | **Secret** — used to unlock the admin page. Avoid simple words; use a strong token. |

> **Important:** `ADMIN_API_KEY` is what you will type on the `/leaders/admin` page to unlock it. Pick something strong and save it somewhere secure.

## 4. Run the database schema

1. In the Supabase dashboard, open the **SQL Editor**.
2. Click **New query**.
3. Copy the entire contents of `supabase/schema.sql` from this project.
4. Paste it into the SQL Editor and click **Run**.

This creates all the tables, indexes, RLS policies, and seed data.

## 5. Study guides and event dates are already seeded

The schema now includes seed data for:

- All 42 study guides from `public/data/study_guides.csv`
- Placeholder upcoming dates for Prayer & Praise, Week of Worship, and Quarterly Sermon

You can edit these in the admin page after deploying. The placeholder dates are just examples — replace them with real dates via the **Intersection Events** tab.

## 6. Deploy

1. Push the code to your Git repository (or trigger a deploy in Netlify).
2. Netlify will use the new environment variables.
3. After deploy, verify the admin page works by visiting `/leaders/admin` and entering your `ADMIN_API_KEY`.

## 7. Leader approval workflow

When someone signs up on the site:

1. They are created as a pending leader in the `leaders` table (`full_access = false`).
2. You receive an email notification.
3. Go to **Admin > Leaders & Access**, find their email, and click **Full Access** to approve them.

## 8. What is editable in the admin page

- **Form Submissions**: view, archive, and delete all website form submissions.
- **Leaders & Access**: approve/revoke leader access, add or remove leaders.
- **Pathway Groups**: add, edit, and delete pathway groups shown on the map and globe.
- **Intersection Events**: edit event info and add/remove upcoming event dates.
- **Study Guides**: add, edit, and delete weekly pathways topics.
- **Site Stats**: update the numbers shown on the Pathways page.

## 9. Fallback behavior

If Supabase is unavailable, the site still works using the existing hardcoded constants and CSV files. Once Supabase is populated, the site will prefer the live database data.
