-- ============================================================
-- 016 Typed columns, kept in sync with the old text columns until 018.
--
-- study_guides.guide_on date replaces guide_date text (D/M/YYYY).
-- leader_profiles.pathway_group_id links to pathway_groups and replaces
-- the free-text pathway_group.
--
-- Phase A: main (and the email branch) still read and write guide_date and
-- pathway_group; chore/cleanup reads and writes guide_on and
-- pathway_group_id. The two BEFORE triggers keep each pair equal whichever
-- side writes, so both versions of the site stay correct. 018 drops the
-- triggers and the old columns after the chore/cleanup push is live.
--
-- Live on 24 Sep 2026: 42 study guides, every guide_date a valid D/M/YYYY
-- without leading zeros (so to_char(..., 'FMDD/FMMM/YYYY') gives back the
-- same text); every pdf_url is ''; 0 of 2 profiles have a pathway_group.
-- ============================================================

begin;

-- ---------- study_guides.guide_on ----------

alter table public.study_guides add column if not exists guide_on date;

-- Only strict D/M/YYYY is read. to_date alone is too forgiving (it turns
-- '' into 1 BC and '7/10/26' into year 26), so the format is checked
-- first; to_date then range-checks each field (31/02 fails). Anything else
-- fails the whole file rather than being guessed at.
do $$
begin
  if exists (
    select 1 from public.study_guides
    where guide_on is null
      and (guide_date is null or btrim(guide_date) !~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$')
  ) then
    raise exception 'study_guides has a guide_date that is not D/M/YYYY; fix it before 016';
  end if;
end $$;

update public.study_guides
   set guide_on = to_date(btrim(guide_date), 'DD/MM/YYYY')
 where guide_on is null and guide_date is not null;

alter table public.study_guides alter column guide_on set not null;

-- Insert: a given guide_on wins and writes guide_date; otherwise guide_on
-- is read from guide_date (main's insert). Update: a changed guide_on
-- writes guide_date; otherwise a changed guide_date writes guide_on
-- (main's admin editor, which sends the whole row back with guide_on
-- unchanged). A guide_date that is not strict D/M/YYYY is refused with a
-- clear error (main used to store any text; the date is now required).
create or replace function public.study_guides_sync_dates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  read_date boolean;
begin
  if tg_op = 'INSERT' then
    read_date := new.guide_on is null and new.guide_date is not null;
  else
    read_date := new.guide_on is not distinct from old.guide_on and new.guide_date is distinct from old.guide_date;
  end if;
  if read_date and (new.guide_date is null or btrim(new.guide_date) !~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$') then
    raise exception 'guide_date must be a date written D/M/YYYY, got %', coalesce(quote_literal(new.guide_date), 'null')
      using errcode = '22007';
  end if;

  if tg_op = 'INSERT' then
    if new.guide_on is not null then
      new.guide_date := to_char(new.guide_on, 'FMDD/FMMM/YYYY');
    elsif new.guide_date is not null then
      new.guide_on := to_date(btrim(new.guide_date), 'DD/MM/YYYY');
    end if;
  else
    if new.guide_on is distinct from old.guide_on then
      new.guide_date := to_char(new.guide_on, 'FMDD/FMMM/YYYY');
    elsif new.guide_date is distinct from old.guide_date then
      new.guide_on := to_date(btrim(new.guide_date), 'DD/MM/YYYY');
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.study_guides_sync_dates() from public, anon, authenticated;

drop trigger if exists study_guides_sync_dates on public.study_guides;
create trigger study_guides_sync_dates
  before insert or update on public.study_guides
  for each row execute function public.study_guides_sync_dates();

-- An empty PDF link means no PDF.
update public.study_guides set pdf_url = null where pdf_url = '';

-- ---------- leader_profiles.pathway_group_id ----------

alter table public.leader_profiles add column if not exists pathway_group_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leader_profiles'::regclass
      and conname = 'leader_profiles_pathway_group_id_fkey'
  ) then
    alter table public.leader_profiles
      add constraint leader_profiles_pathway_group_id_fkey
      foreign key (pathway_group_id) references public.pathway_groups(id) on delete set null;
  end if;
end $$;

-- Backfill by exact name (0 rows live). A name that matches no group
-- stays as text only.
update public.leader_profiles p
   set pathway_group_id = g.id
  from public.pathway_groups g
 where p.pathway_group_id is null
   and p.pathway_group = g.name;

-- Same rule as the dates: a changed id writes the name (null clears it);
-- otherwise a changed name looks up the id by exact name (null when no
-- group has that name, as main allows free text).
create or replace function public.leader_profiles_sync_pathway_group()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.pathway_group_id is not null)
     or (tg_op = 'UPDATE' and new.pathway_group_id is distinct from old.pathway_group_id) then
    new.pathway_group := (select g.name from public.pathway_groups g where g.id = new.pathway_group_id);
  elsif (tg_op = 'INSERT' and new.pathway_group is not null)
     or (tg_op = 'UPDATE' and new.pathway_group is distinct from old.pathway_group) then
    new.pathway_group_id := (
      select g.id from public.pathway_groups g where g.name = new.pathway_group order by g.id limit 1
    );
  end if;
  return new;
end;
$$;

revoke all on function public.leader_profiles_sync_pathway_group() from public, anon, authenticated;

drop trigger if exists leader_profiles_sync_pathway_group on public.leader_profiles;
create trigger leader_profiles_sync_pathway_group
  before insert or update on public.leader_profiles
  for each row execute function public.leader_profiles_sync_pathway_group();

commit;
