-- APPLIED to the live database 2026-11-12 (11 sign-ups became pending leaders).
-- ============================================================
-- 021 Portal access for Avenue On-Ramp sign-ups.
--
-- Every On-Ramp sign-up becomes a pending leader (full_access false), so
-- they can log in at /login and do Leader Training. Pending leaders can
-- open Training but not Resources, Weekly Topics or the workshop tools,
-- and never Admin (that needs the admin passcode).
--
-- Anyone already in leaders (matched on email, ignoring case) is skipped,
-- so no duplicates and no existing full_access changes. Sign-ups after this
-- get the same access from POST /api/onramp. Safe to run again: it only
-- adds sign-ups that are still missing. Nothing is emailed.
-- ============================================================

begin;

insert into public.leaders (id, email, name, full_access)
select gen_random_uuid()::text, s.email, s.name, false
from public.onramp_signups s
where not exists (
  select 1 from public.leaders l where lower(l.email) = lower(s.email)
);

commit;
