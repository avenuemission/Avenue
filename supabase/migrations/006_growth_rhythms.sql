-- ============================================================
-- Growth and Multiplication rhythms.
--
-- Phases 4 and 5 are not things a leader finishes. After Launch they
-- are doing two things for life: staying healthy, and multiplying.
--
-- leader_checkins holds one weekly RPMS reflection per leader, from
-- Dave Ferguson's Multiplier: Relational, Physical, Mental, Spiritual.
-- The primary key is (email, week_start), so re-opening the current
-- week edits that reflection rather than stacking a second one.
--
-- apprentice_step goes on network_people rather than in a table of its
-- own, because that row already describes the sending relationship and
-- an apprenticeship step is a property of exactly that. Keeping it
-- there means phase 5 and the family tree are the same data seen twice,
-- not two places where progress can disagree.
--
-- RLS on with no policies, matching every other table here: all access
-- goes through the service-role API routes.
-- ============================================================

create table if not exists public.leader_checkins (
  email       text not null,

  -- The Monday of the week being reflected on, so a week has one
  -- canonical key regardless of which day someone fills it in.
  week_start  date not null,

  relational  smallint not null check (relational between 1 and 10),
  physical    smallint not null check (physical   between 1 and 10),
  mental      smallint not null check (mental     between 1 and 10),
  spiritual   smallint not null check (spiritual  between 1 and 10),
  reflection  text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (email, week_start)
);

alter table public.leader_checkins enable row level security;

-- 0 means not started. 1 to 5 are Hero Maker's apprenticeship steps,
-- from "I do, you watch" through to "you do, someone else watches".
alter table public.network_people
  add column if not exists apprentice_step smallint not null default 0
    check (apprentice_step between 0 and 5);
