-- ============================================================
-- Leader training progress for the five-phase leadership journey.
--
-- Until now the training page held every phase in component state, so
-- watched episodes and completed modules reset on every reload. This is
-- where that progress actually lives.
--
-- Progress is stored as id lists rather than a row per module, because
-- the training content lives in code. Adding a module should never need
-- a migration, and an id that no longer exists in the content is simply
-- ignored when the page reconciles.
--
-- checkpoint_status gates phase 3 (Launch). Only an admin can move it to
-- 'complete', through the service-role route.
--
-- RLS is on with NO policies: every read and write goes through
-- /api/leader-training, matching leaders, leader_profiles and
-- network_people.
-- ============================================================

create table if not exists public.leader_training_progress (
  email                   text primary key,

  -- Episode and module ids from INITIAL_PHASES, e.g. "p1m0e3", "p2m1".
  watched_episodes        text[] not null default '{}',
  completed_modules       text[] not null default '{}',

  checkpoint_status       text not null default 'none'
                          check (checkpoint_status in ('none', 'requested', 'complete')),
  checkpoint_requested_at timestamptz,
  checkpoint_completed_at timestamptz,
  checkpoint_completed_by text,

  updated_at              timestamptz not null default now()
);

alter table public.leader_training_progress enable row level security;

-- Deliberately no policies. updated_at is set by the API on each write
-- (see /api/leader-training), so no trigger is needed here.
