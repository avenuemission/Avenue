-- ============================================================
-- 010 Baseline: the workshop tables as they exist live.
-- workshop_sessions and survey_responses were created by hand in the
-- dashboard and were in no SQL file. This captures them so the repo can
-- rebuild the database. A no-op on the live database (everything is
-- "if not exists"); the controller diffs it against
-- information_schema.columns before applying.
--
-- Live shape (PostgREST OpenAPI, 24 Sep 2026): code text pk,
-- created_at default now(), status default 'active', include_life_3
-- default TRUE (the code treats anything but false as true), all three
-- nullable until 015. survey_responses: id uuid pk, session_code text FK,
-- submitted_at default now(), and 32 text answer columns.
--
-- The two permissive policies below mirror live exactly ("Allow all
-- inserts", "Allow all reads", role public). They are what the live site
-- on main still relies on, through the anon key. 018 drops them.
-- ============================================================

begin;

create table if not exists public.workshop_sessions (
  code            text primary key,
  created_at      timestamptz default now(),
  status          text default 'active',
  include_life_3  boolean default true
);

create table if not exists public.survey_responses (
  id                           uuid primary key default gen_random_uuid(),
  session_code                 text references public.workshop_sessions(code),
  submitted_at                 timestamptz default now(),
  age_range                    text,
  is_christian                 text,
  denomination                 text,
  role                         text,
  tech_comfort                 text,
  ai_tools                     text,
  personal_spiritual_use       text,
  faith_impact                 text,
  decision_dependency          text,
  personal_off_limits          text,
  off_limits_uses              text,
  idolatry_potential           text,
  church_sermon_prep           text,
  church_social_media          text,
  church_website               text,
  church_operations            text,
  church_disclosure            text,
  church_has_position          text,
  who_should_lead              text,
  formal_policy                text,
  unemployment_concern         text,
  surveillance_resistance      text,
  eschatological_significance  text,
  tegmark_rank_dictatorship    text,
  tegmark_rank_enslaved        text,
  tegmark_rank_gatekeeper      text,
  tegmark_rank_zookeeper       text,
  tegmark_rank_libertarian     text,
  tegmark_rank_egalitarian     text,
  tegmark_rank_protector       text,
  final_vision                 text,
  neighbour_principle          text
);

alter table public.workshop_sessions enable row level security;
alter table public.survey_responses enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['workshop_sessions', 'survey_responses'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Allow all inserts') then
      execute format('create policy "Allow all inserts" on public.%I for insert to public with check (true)', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'Allow all reads') then
      execute format('create policy "Allow all reads" on public.%I for select to public using (true)', t);
    end if;
  end loop;
end $$;

commit;
