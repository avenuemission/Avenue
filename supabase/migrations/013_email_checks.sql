-- ============================================================
-- 013 Email normalisation checks.
-- The app lowercases and trims every email at the edge; this makes the
-- database refuse anything else. Each check is added NOT VALID (no table
-- scan under the strong lock) and then validated. Live data checked on
-- 24 Sep 2026: 0 non-normalised values in every column below.
-- Safe with main: main already writes normalised emails.
-- ============================================================

begin;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('leaders',                  'leaders_email_normalised',                  'email = lower(btrim(email))'),
      ('leader_profiles',          'leader_profiles_email_normalised',          'email = lower(btrim(email))'),
      ('leader_training_progress', 'leader_training_progress_email_normalised', 'email = lower(btrim(email))'),
      ('leader_checkins',          'leader_checkins_email_normalised',          'email = lower(btrim(email))'),
      ('leader_worksheets',        'leader_worksheets_email_normalised',        'email = lower(btrim(email))'),
      ('leader_people',            'leader_people_owner_email_normalised',      'owner_email = lower(btrim(owner_email))'),
      ('leader_email_prefs',       'leader_email_prefs_email_normalised',       'email = lower(btrim(email))'),
      ('leader_email_log',         'leader_email_log_email_normalised',         'email = lower(btrim(email))'),
      ('network_people',           'network_people_email_normalised',           'email is null or email = lower(btrim(email))')
    ) as v(tbl, con, expr)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', r.tbl)::regclass and conname = r.con
    ) then
      execute format('alter table public.%I add constraint %I check (%s) not valid', r.tbl, r.con, r.expr);
    end if;
    execute format('alter table public.%I validate constraint %I', r.tbl, r.con);
  end loop;
end $$;

commit;
