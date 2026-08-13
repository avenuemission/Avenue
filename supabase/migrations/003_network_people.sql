-- ============================================================
-- Discipleship network ("sent out by") graph.
--
-- One row per person, including people who have not made an Avenue
-- account yet. sent_out_by is the single parent, so the whole thing is
-- a forest of trees and link_status describes that one edge.
--
-- RLS is on with NO policies: every read and write goes through the
-- service-role API route (/api/network), matching leaders,
-- form_submissions and leader_profiles.
-- ============================================================

create table if not exists public.network_people (
  id             uuid primary key default gen_random_uuid(),

  -- Nullable: someone added by name only has no email yet. Stored
  -- lowercase and trimmed by the API so the unique index is meaningful.
  email          text unique,

  first_name     text not null,
  last_name      text,

  -- The one person who sent them out. Null means they are a root.
  sent_out_by    uuid references public.network_people(id) on delete set null,

  -- State of the edge to sent_out_by, not of the person.
  link_status    text not null default 'pending'
                 check (link_status in ('pending', 'confirmed')),

  added_by_email text,                            -- audit: who created this row
  joined         boolean not null default false,  -- true once a leaders row exists

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint network_people_no_self_parent
    check (sent_out_by is null or sent_out_by <> id)
);

create index if not exists network_people_sent_out_by_idx
  on public.network_people (sent_out_by);

alter table public.network_people enable row level security;

-- Deliberately no policies. updated_at is set by the API on each write
-- (see /api/network), so no trigger is needed here.
