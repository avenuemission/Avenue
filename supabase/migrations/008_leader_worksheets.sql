-- ============================================================
-- Worksheets: one private JSON document per leader per kind
-- (spec 2026-09-24 journey, section 1.1). Calling and Launch
-- each store named sections; a write replaces one section only,
-- atomically, so two tabs editing different sections never
-- clobber each other.
-- RLS on, no policies: all access through /api/worksheets
-- (service role). The email is always the verified session email.
-- ============================================================

create table if not exists public.leader_worksheets (
  email       text not null,
  kind        text not null check (kind in ('calling','launch')),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (email, kind)
);
alter table public.leader_worksheets enable row level security;
-- Deliberately no policies.

-- Atomic per-section write: two tabs editing different sections never clobber each other.
create or replace function public.worksheet_set_section(p_email text, p_kind text, p_section text, p_value jsonb)
returns jsonb language sql security definer set search_path = public as $$
  insert into public.leader_worksheets (email, kind, data, updated_at)
  values (p_email, p_kind, jsonb_build_object(p_section, p_value), now())
  on conflict (email, kind) do update
    set data = public.leader_worksheets.data || jsonb_build_object(p_section, p_value),
        updated_at = now()
  returning data;
$$;
revoke all on function public.worksheet_set_section(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.worksheet_set_section(text, text, text, jsonb) to service_role;
