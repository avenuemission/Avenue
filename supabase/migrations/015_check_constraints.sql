-- ============================================================
-- 015 Check constraints, defaults and NOT NULL.
-- Each CHECK is added NOT VALID and then validated. Every value was
-- checked against live data on 24 Sep 2026 (0 violations):
--   form_submissions.form_type: join-pathway 9, start-pathway 5, event-updates 10
--   leader_profiles.role: Leader 1, null 1; apest: Shepherd 1, null 1
--   pathway_groups: 4 rows, all lat/lng in range
--   site_stats: 4 rows, none negative
--   study_guides.color: 42 rows, all #rrggbb
--   workshop_sessions: 4 rows, no nulls; survey_responses: 37 rows, no nulls
--
-- The allowed lists are copied from the code, which main shares:
--   form_type: VALID_TYPES in src/app/api/submissions/route.ts
--   role, apest: ROLES and APEST in src/components/leaders/profile/ProfileCard.tsx
-- Adding a new form type or role now needs a migration as well.
--
-- Safe with main: main writes only these values (the API rejects other
-- form types; the profile UI offers only these roles and gifts; the
-- profile API turns "" into null). Main's workshop routes always send a
-- session code, and the defaults fill the rest.
-- ============================================================

begin;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('form_submissions', 'form_submissions_form_type_allowed',
        $c$form_type in ('start-pathway', 'join-pathway', 'mission-support', 'idea-submission', 'leader-support', 'event-updates')$c$),
      ('leader_profiles', 'leader_profiles_role_allowed',
        $c$role is null or role in ('Leader', 'Apprentice', 'Coordinator', 'Member')$c$),
      ('leader_profiles', 'leader_profiles_apest_allowed',
        $c$apest is null or apest in ('Apostle', 'Prophet', 'Evangelist', 'Shepherd', 'Teacher')$c$),
      ('pathway_groups', 'pathway_groups_latitude_range',
        $c$latitude between -90 and 90$c$),
      ('pathway_groups', 'pathway_groups_longitude_range',
        $c$longitude between -180 and 180$c$),
      ('site_stats', 'site_stats_value_not_negative',
        $c$value >= 0$c$),
      ('study_guides', 'study_guides_color_hex',
        $c$color is null or color ~* '^#[0-9a-f]{6}$'$c$)
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

-- Workshop columns: defaults as live, then NOT NULL (0 nulls live).
alter table public.workshop_sessions alter column status set default 'active';
alter table public.workshop_sessions alter column created_at set default now();
alter table public.workshop_sessions alter column include_life_3 set default true;
alter table public.workshop_sessions alter column status set not null;
alter table public.workshop_sessions alter column created_at set not null;
alter table public.workshop_sessions alter column include_life_3 set not null;

alter table public.survey_responses alter column submitted_at set default now();
alter table public.survey_responses alter column session_code set not null;
alter table public.survey_responses alter column submitted_at set not null;

commit;
