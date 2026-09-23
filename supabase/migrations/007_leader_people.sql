-- ============================================================
-- My People: one private list per leader (spec 2026-09-23 foundations).
-- Calling tags people by space, Growth by metric, Launch marks invitees,
-- Multiply links a person to the church-wide network_people tree.
-- The three metrics are independent tags, not a ladder.
-- RLS on, no policies: all access through /api/people (service role).
-- ============================================================

create table if not exists public.leader_people (
  id                 uuid primary key default gen_random_uuid(),
  owner_email        text not null,          -- the leader, lowercase
  first_name         text not null,
  last_name          text,
  spaces             text[] not null default '{}',   -- subset of first, second, third
  metrics            text[] not null default '{}',   -- subset of pathways, intersections, streetlights
  invitee            boolean not null default false, -- Launch: someone they plan to invite
  icnu               text,                            -- private "what I see in you"
  network_person_id  uuid references public.network_people(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint leader_people_spaces_valid
    check (spaces <@ array['first','second','third']::text[]),
  constraint leader_people_metrics_valid
    check (metrics <@ array['pathways','intersections','streetlights']::text[])
);
create index if not exists leader_people_owner_idx on public.leader_people (owner_email);
alter table public.leader_people enable row level security;
-- Deliberately no policies. All access through /api/people with the service role.
