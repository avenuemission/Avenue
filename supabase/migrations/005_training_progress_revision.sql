-- ============================================================
-- Revision guard for leader_training_progress.
--
-- Saves overwrite the whole progress record, so two writes landing out
-- of order silently lose whichever tick arrived first. Browser-side
-- sequencing cannot fix this: two tabs, two devices, or a refresh
-- part-way through a save all defeat it, because each has its own copy
-- of the coordination state.
--
-- The ordering guarantee therefore lives here. A client sends the
-- revision it believes it is advancing to, and the API accepts the
-- write only when that number is strictly greater than the stored one.
-- A stale write is refused rather than applied.
-- ============================================================

alter table public.leader_training_progress
  add column if not exists revision bigint not null default 0;
