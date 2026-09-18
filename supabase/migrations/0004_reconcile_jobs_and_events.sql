-- ---------------------------------------------------------------------
-- 0004 — reconcile columns the client writes
--
-- Why this exists:
--   0001 used `create table if not exists`, which never back-fills columns on
--   a database whose `jobs` / `job_events` tables were created by an earlier
--   build. When the client writes a column that does not exist, PostgREST
--   rejects the whole write (PGRST204), so an edit appears to "not save" and
--   an event insert fails.
--
-- This migration is fully idempotent and only ADDS nullable columns. It never
-- drops, renames, or rewrites data, and it is safe to run more than once.
-- ---------------------------------------------------------------------

-- JOBS — every nullable field the ApplicationForm sends.
alter table public.jobs
  add column if not exists job_url text,
  add column if not exists job_id text,
  add column if not exists location text,
  add column if not exists address text,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text,
  add column if not exists employment_type text,
  add column if not exists application_date date,
  add column if not exists next_follow_up_date date,
  add column if not exists last_contact_date date,
  add column if not exists source text,
  add column if not exists referral_name text,
  add column if not exists referral_contact text,
  add column if not exists recruiter_notes text,
  add column if not exists resume_version text,
  add column if not exists cover_letter_version text,
  add column if not exists job_description text;

-- JOB EVENTS — detail columns (also present in 0003; repeated so a single
-- run of 0004 is sufficient even if 0003 was skipped).
alter table public.job_events
  add column if not exists event_time text,
  add column if not exists round text,
  add column if not exists previous_status text,
  add column if not exists new_status text;

-- COMPANIES — the unique expression index that find_or_create_company()'s
-- ON CONFLICT (user_id, lower(name)) target depends on.
create unique index if not exists companies_user_name_key
  on public.companies (user_id, lower(name));

-- Keep updated_at accurate for jobs created by older builds.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();
