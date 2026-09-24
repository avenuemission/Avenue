-- ============================================================
-- 017 Two indexes, worksheet_set_section as security invoker, and the
-- unused anon insert policy on form_submissions removed.
--
-- Safe with main:
--   * main's /api/workshops routes filter survey_responses by session_code
--     and the email engine filters leader_email_log by kind first; the
--     indexes only help.
--   * main calls worksheet_set_section with the service role, which owns
--     the table rights itself, so the function no longer needs definer
--     rights. Its body is already schema qualified (public.leader_worksheets;
--     jsonb_build_object and now() live in pg_catalog), so search_path = ''
--     is safe. Grants from 008 (service_role only) are unchanged.
--   * main's POST /api/submissions inserts with the service role; nothing
--     uses the anon insert policy.
-- ============================================================

begin;

create index if not exists survey_responses_session_code_idx
  on public.survey_responses (session_code);

create index if not exists leader_email_log_kind_period_key_idx
  on public.leader_email_log (kind, period_key);

-- Exact signature from 008_leader_worksheets.sql.
alter function public.worksheet_set_section(text, text, text, jsonb) security invoker;
alter function public.worksheet_set_section(text, text, text, jsonb) set search_path = '';

-- Exact live name (supabase/legacy/schema-001.sql, catalog 24 Sep 2026).
drop policy if exists "public insert submissions" on public.form_submissions;

commit;
