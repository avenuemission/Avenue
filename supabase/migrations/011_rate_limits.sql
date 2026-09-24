-- Rate limits and admin lockout counters. Service role only.
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0 check (hits >= 0)
);
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- Count one hit for p_key in a fixed window. Returns true while the caller
-- is within p_max hits for the current window.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return v_hits <= p_max;
end;
$$;

-- True when p_key has used more than p_max hits in its current window.
create or replace function public.rate_limit_blocked(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select hits > p_max from public.rate_limits
      where key = p_key and window_start >= now() - make_interval(secs => p_window_seconds)),
    false);
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.rate_limit_blocked(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.rate_limit_blocked(text, integer, integer) to service_role;
