-- APPLIED to the live database 2026-11-14 (seeded: 19, 5, 4).
-- ============================================================
-- 023 Huddle stories: the 2026 Metrics of Success, as numbers only.
--
-- After each Pathway Huddle an admin adds one row: how many people are NEW
-- this year in each category (each person counted once per category per
-- year). The leader dashboard shows the year's totals under
-- "2026: Stories, not seats". Names never go in here; they stay in the
-- Metrics of Success Google Doc.
--
-- Like every table: RLS on, no policies, no anon or authenticated grants.
-- Leaders read totals through GET /api/huddle-stories; admins edit rows
-- through /api/admin/huddle-stories.
--
-- New table and seed rows only: safe before the code is live.
-- ============================================================

begin;

create table if not exists public.huddle_stories (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  held_on date not null,
  pathways integer not null default 0 check (pathways between 0 and 999),
  intersections integer not null default 0 check (intersections between 0 and 999),
  streetlights integer not null default 0 check (streetlights between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists huddle_stories_held_on_idx on public.huddle_stories (held_on);

drop trigger if exists huddle_stories_set_updated_at on public.huddle_stories;
create trigger huddle_stories_set_updated_at
  before update on public.huddle_stories
  for each row execute function public.set_updated_at();

alter table public.huddle_stories enable row level security;
revoke all on public.huddle_stories from anon, authenticated;
grant select, insert, update, delete on public.huddle_stories to service_role;

-- Seed from the Metrics of Success doc (new people per category, each
-- counted once; tentative entries such as "Sam?" and "Ryan (tomorrow)"
-- left out until they firm up; Alex & Dorrita count as two). Edit in the
-- admin page if the count should differ. Only seeds an empty table.
insert into public.huddle_stories (label, held_on, pathways, intersections, streetlights)
select * from (values
  ('Jan–Aug huddles', date '2026-08-31', 11, 5, 3),
  ('September huddle', date '2026-09-30', 3, 0, 0),
  ('November huddle', date '2026-11-10', 5, 0, 1)
) as seed(label, held_on, pathways, intersections, streetlights)
where not exists (select 1 from public.huddle_stories);

commit;
