-- ============================================================
-- Leader emails (spec 2026-09-24 church health emails, 3.1).
--
-- leader_email_prefs: one row per leader who has an unsubscribe token or
-- has changed a setting. A missing row means every email is on. The
-- unsubscribe token is what the one-click link carries, so the link never
-- needs a password and can only ever turn emails off.
--
-- leader_email_log: one row per email claimed for sending. The engine
-- inserts the row BEFORE it sends, and the unique (email, kind,
-- period_key) is the guarantee against double sends: a second insert for
-- the same email, kind and period fails, so a retry or an overlapping run
-- sends nothing. status 'baseline' marks milestones a leader already had
-- when emails were switched on, so nobody is congratulated for old news.
--
-- APPLIED BY HENRY (or on his explicit instruction) ONLY.
-- RLS on with no policies, matching every other table here: all access
-- goes through service-role server code.
-- ============================================================

create table if not exists public.leader_email_prefs (
  email              text primary key,          -- the leader, lowercase
  rpms               boolean not null default true,
  digest             boolean not null default true,
  church_health      boolean not null default true,
  apprentice         boolean not null default true,
  milestones         boolean not null default true,
  unsubscribe_token  uuid not null unique default gen_random_uuid(),
  updated_at         timestamptz not null default now()
);
alter table public.leader_email_prefs enable row level security;
-- Deliberately no policies.

create table if not exists public.leader_email_log (
  id          bigserial primary key,
  email       text not null,
  kind        text not null
              check (kind in ('rpms', 'digest', 'church_health', 'apprentice', 'milestones')),
  -- e.g. '2026-10-04' (the Sunday) for rpms, '2026-10' for monthly kinds,
  -- 'phase1-walked' or 'launch-2026-11-01-7d' for milestones.
  period_key  text not null,
  status      text not null default 'sent' check (status in ('sent', 'baseline')),
  sent_at     timestamptz not null default now(),
  unique (email, kind, period_key)
);
alter table public.leader_email_log enable row level security;
-- Deliberately no policies.
