-- ============================================================
-- 012 updated_at triggers.
-- One trigger function stamps updated_at on every UPDATE of the seven
-- tables that carry it, so the column no longer depends on each API write
-- remembering to set it. Writes that already set it keep working (the
-- trigger simply overwrites with the same now()).
-- Safe with main: main's writes are unchanged, only the stamp moves.
-- ============================================================

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'leader_profiles',
    'network_people',
    'leader_training_progress',
    'leader_checkins',
    'leader_people',
    'leader_worksheets',
    'leader_email_prefs'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at',
      t
    );
  end loop;
end $$;

commit;
