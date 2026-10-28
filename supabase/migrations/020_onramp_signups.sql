-- APPLIED to the live database 2026-10-28, before the page's deploy.
-- ============================================================
-- 020 Avenue On-Ramp sign-ups (/onramp, the leadership training day).
--
-- One new table. Nothing existing changes, so this is safe to run before
-- the code that uses it is live: the old code never reads it.
--
-- Like every table since 018: RLS on, no policies, no anon or
-- authenticated grants. Only server code (service role) reads and writes
-- it, through /api/onramp (sign up) and /api/admin/onramp (admin list).
--
-- One row per email: signing up again updates that row (the route upserts
-- on email). The checks repeat src/lib/domain/onramp.ts and the workshop
-- ids in src/content/onramp.ts, so a bad row is refused here too.
--
-- Take the backup before this from main: this branch's
-- scripts/db/export-tables.mjs already lists onramp_signups and stops
-- when the table does not exist yet.
-- ============================================================

begin;

create table if not exists public.onramp_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254),
  workshops text[] not null check (
    cardinality(workshops) between 1 and 2
    and workshops <@ array['worship', 'communication', 'digital', 'creative']::text[]
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onramp_signups_email_key unique (email)
);

-- Stamps updated_at on every change (the function is from 012).
drop trigger if exists onramp_signups_set_updated_at on public.onramp_signups;
create trigger onramp_signups_set_updated_at
  before update on public.onramp_signups
  for each row execute function public.set_updated_at();

alter table public.onramp_signups enable row level security;

revoke all on public.onramp_signups from anon, authenticated;
-- Explicit, so the routes do not depend on Supabase's default grants.
grant select, insert, update, delete on public.onramp_signups to service_role;

commit;
