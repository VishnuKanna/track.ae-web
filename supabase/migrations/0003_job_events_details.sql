-- ---------------------------------------------------------------------
-- 0003 — richer timeline events
--
-- Adds optional detail columns to public.job_events so the timeline can
-- express interview rounds, event time, and automatic status transitions
-- (previous_status / new_status) without touching existing rows.
--
-- All columns are nullable and default to NULL, so existing events keep
-- rendering exactly as before and no backfill or data migration is needed.
-- ---------------------------------------------------------------------

alter table public.job_events
  add column if not exists event_time text,
  add column if not exists round text,
  add column if not exists previous_status text,
  add column if not exists new_status text;
