-- ============================================================
-- Leader profiles ("My Profile" on the leaders dashboard)
--
-- Keyed by email so it lines up with public.leaders and the
-- localStorage session, which also identifies people by email.
--
-- RLS is on with NO policies: every read/write goes through the
-- service-role API route (/api/leader-profile), matching how the
-- leaders and form_submissions tables already work.
-- ============================================================

create table if not exists public.leader_profiles (
  email               text primary key,

  -- Core
  display_name        text,
  avatar_url          text,   -- data URL (client-side resized) or hosted URL
  birthday            date,
  baptism_anniversary date,
  favourite_verse     text,   -- the verse text
  favourite_verse_ref text,   -- e.g. "Philippians 4:13"

  -- Context
  pathway_group       text,
  role                text,   -- Leader / Apprentice / Coordinator / Member
  apest               text,   -- Apostle / Prophet / Evangelist / Shepherd / Teacher

  -- Fun extras
  about               text,   -- one-line "about me"
  favourite_song      text,
  coffee_order        text,

  updated_at          timestamptz not null default now()
);

alter table public.leader_profiles enable row level security;

-- Deliberately no public policies. The anon key must not read or write
-- personal details; only the service-role key (server-side) may.
--
-- updated_at is set by the API on each write (see /api/leader-profile),
-- so no trigger is needed here.
