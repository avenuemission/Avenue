-- APPLIED to the live database 2026-09-28, before the game's deploy.
-- ============================================================
-- 019 Cross the Avenue leaderboard (the Vision page game).
--
-- One new table. Nothing existing changes, so this is safe to run before
-- the code that uses it is live: the old code never reads it.
--
-- Like every other table since 018: RLS on, no policies, no anon or
-- authenticated grants. Only server code (service role) reads and writes
-- it, through /api/crossing-scores and /api/admin/crossing-scores.
-- The checks repeat src/lib/domain/crossing/scores.ts, so a bad row is
-- refused here too.
--
-- Take the backup before this from main: this branch's
-- scripts/db/export-tables.mjs already lists crossing_scores and stops
-- when the table does not exist yet.
-- ============================================================

begin;

create table if not exists public.crossing_scores (
  id uuid primary key default gen_random_uuid(),
  initials text not null check (initials ~ '^[A-Z]{3}$'),
  score integer not null check (score between 1 and 9999),
  duration_ms integer not null check (duration_ms between 1000 and 7200000),
  created_at timestamptz not null default now()
);

-- The leaderboard query: highest score first, earliest first on a tie.
create index if not exists crossing_scores_board_idx
  on public.crossing_scores (score desc, created_at asc);

alter table public.crossing_scores enable row level security;

revoke all on public.crossing_scores from anon, authenticated;
-- Explicit, so the routes do not depend on Supabase's default grants.
grant select, insert, delete on public.crossing_scores to service_role;

commit;
