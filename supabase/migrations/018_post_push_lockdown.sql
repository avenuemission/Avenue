-- APPLIED to the live database 2026-09-24 after the chore/cleanup deploy (ea741d9) went live.
-- ============================================================
-- 018 Post-push lockdown (phase B).
--
-- APPLY ONLY AFTER THE chore/cleanup PUSH IS LIVE.
--
-- Until then the live site (main) reads content tables and the workshop
-- tables with the anon key and still writes guide_date and pathway_group.
-- Applying this early breaks the public site, the workshop tool and the
-- study guide and profile editors on main.
--
-- After it runs the anon and authenticated roles can touch no table,
-- sequence or function in public: every table is server only (service
-- role, which bypasses RLS). The anon key can do nothing but sign in.
-- ============================================================

begin;

-- ---------- workshop tables: RLS on, every policy dropped ----------

alter table public.workshop_sessions enable row level security;
alter table public.survey_responses enable row level security;

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('workshop_sessions', 'survey_responses')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ---------- content tables: the public read policies ----------
-- Exact live names (catalog 24 Sep 2026). intersection_event_dates' policy
-- is "public read event_dates", not "public read intersection_event_dates".

drop policy if exists "public read pathway_groups" on public.pathway_groups;
drop policy if exists "public read intersection_events" on public.intersection_events;
drop policy if exists "public read event_dates" on public.intersection_event_dates;
drop policy if exists "public read study_guides" on public.study_guides;
drop policy if exists "public read site_stats" on public.site_stats;

-- ---------- grants ----------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
-- Functions are executable by PUBLIC by default, which anon and
-- authenticated inherit. The service role keeps its own explicit grants
-- (008, 011), and trigger functions need no EXECUTE grant to fire.
revoke execute on all functions in schema public from public;

-- Applies to objects the current role (postgres, in the SQL editor)
-- creates from now on.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

-- ---------- phase A sync triggers and the old text columns ----------

drop trigger if exists study_guides_sync_dates on public.study_guides;
drop function if exists public.study_guides_sync_dates();
drop trigger if exists leader_profiles_sync_pathway_group on public.leader_profiles;
drop function if exists public.leader_profiles_sync_pathway_group();

alter table public.study_guides drop column if exists guide_date;
alter table public.leader_profiles drop column if exists pathway_group;

-- Repeat the 016 cleanup: main kept inserting empty pdf_url strings during phase A.
update public.study_guides set pdf_url = null where pdf_url = '';

commit;
