-- ============================================================
-- 014 Leader foreign keys (spec decision D5).
-- Every per-leader table now references leaders(email), so deleting a
-- leader deletes their personal data with them (on delete cascade) and a
-- change of a leader's email follows through (on update cascade).
--
-- BEFORE APPLYING: the controller exports every table (backup script).
-- The deletes below remove only rows whose email is NOT in leaders. Live on
-- 24 Sep 2026 that is exactly 1 row (leader_profiles); every other child
-- table had 0 orphans.
--
-- Safe with main: main only writes these tables for a signed-in leader,
-- whose leaders row exists. Leader deletes in main now also remove the
-- leader's child rows (the intended change).
--
-- Needs a unique constraint on leaders.email (live has one, audit 03; the
-- foreign key add fails loud if not).
-- If a row is written for a non-leader between the delete and the
-- constraint, the constraint check fails and the whole file rolls back:
-- just run it again.
-- ============================================================

begin;

delete from public.leader_profiles c          where not exists (select 1 from public.leaders l where l.email = c.email);
delete from public.leader_training_progress c where not exists (select 1 from public.leaders l where l.email = c.email);
delete from public.leader_checkins c          where not exists (select 1 from public.leaders l where l.email = c.email);
delete from public.leader_worksheets c        where not exists (select 1 from public.leaders l where l.email = c.email);
delete from public.leader_people c            where not exists (select 1 from public.leaders l where l.email = c.owner_email);
delete from public.leader_email_prefs c       where not exists (select 1 from public.leaders l where l.email = c.email);
delete from public.leader_email_log c         where not exists (select 1 from public.leaders l where l.email = c.email);

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('leader_profiles',          'email',       'leader_profiles_email_leaders_fkey'),
      ('leader_training_progress', 'email',       'leader_training_progress_email_leaders_fkey'),
      ('leader_checkins',          'email',       'leader_checkins_email_leaders_fkey'),
      ('leader_worksheets',        'email',       'leader_worksheets_email_leaders_fkey'),
      ('leader_people',            'owner_email', 'leader_people_owner_email_leaders_fkey'),
      ('leader_email_prefs',       'email',       'leader_email_prefs_email_leaders_fkey'),
      ('leader_email_log',         'email',       'leader_email_log_email_leaders_fkey')
    ) as v(tbl, col, con)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', r.tbl)::regclass and conname = r.con
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.leaders(email) on update cascade on delete cascade',
        r.tbl, r.con, r.col
      );
    end if;
  end loop;
end $$;

commit;
