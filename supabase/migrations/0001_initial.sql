-- =====================================================================
-- Track.AE — Initial schema
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Tables + Row Level Security + Storage policies + helper functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create / sync profile when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(new.email, new.raw_user_meta_data ->> 'email'),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      avatar_url = excluded.avatar_url,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. COMPANIES
-- ---------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_user_name_key
  on public.companies (user_id, lower(name));

create index if not exists companies_user_idx on public.companies (user_id);

alter table public.companies enable row level security;

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
  on public.companies for select
  using (auth.uid() = user_id);

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own"
  on public.companies for insert
  with check (auth.uid() = user_id);

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
  on public.companies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own"
  on public.companies for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. JOBS
-- ---------------------------------------------------------------------

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,
  job_title text not null,
  job_url text,
  job_id text,
  location text,
  address text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  employment_type text,
  status text not null default 'applied',
  application_date date,
  next_follow_up_date date,
  last_contact_date date,
  source text,
  referral_name text,
  referral_contact text,
  recruiter_notes text,
  resume_version text,
  cover_letter_version text,
  job_description text,
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_idx on public.jobs (user_id);
create index if not exists jobs_company_idx on public.jobs (company_id);
create index if not exists jobs_status_idx on public.jobs (user_id, status);
create index if not exists jobs_followup_idx on public.jobs (user_id, next_follow_up_date);

alter table public.jobs enable row level security;

drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own"
  on public.jobs for select
  using (auth.uid() = user_id);

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own"
  on public.jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own"
  on public.jobs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. HR CONTACTS (max enforced in app — hard cap 25)
-- ---------------------------------------------------------------------

create table if not exists public.hr_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text,
  designation text,
  email text,
  phone text,
  linkedin_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hr_contacts_job_idx on public.hr_contacts (job_id);
create index if not exists hr_contacts_user_idx on public.hr_contacts (user_id);

alter table public.hr_contacts enable row level security;

drop policy if exists "hr_contacts_select_own" on public.hr_contacts;
create policy "hr_contacts_select_own"
  on public.hr_contacts for select
  using (auth.uid() = user_id);

drop policy if exists "hr_contacts_insert_own" on public.hr_contacts;
create policy "hr_contacts_insert_own"
  on public.hr_contacts for insert
  with check (auth.uid() = user_id);

drop policy if exists "hr_contacts_update_own" on public.hr_contacts;
create policy "hr_contacts_update_own"
  on public.hr_contacts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "hr_contacts_delete_own" on public.hr_contacts;
create policy "hr_contacts_delete_own"
  on public.hr_contacts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 5. JOB EVENTS (timeline)
-- ---------------------------------------------------------------------

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  event_type text not null,
  event_date date not null default current_date,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists job_events_job_idx on public.job_events (job_id, event_date);
create index if not exists job_events_user_idx on public.job_events (user_id);

alter table public.job_events enable row level security;

drop policy if exists "job_events_select_own" on public.job_events;
create policy "job_events_select_own"
  on public.job_events for select
  using (auth.uid() = user_id);

drop policy if exists "job_events_insert_own" on public.job_events;
create policy "job_events_insert_own"
  on public.job_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "job_events_update_own" on public.job_events;
create policy "job_events_update_own"
  on public.job_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "job_events_delete_own" on public.job_events;
create policy "job_events_delete_own"
  on public.job_events for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6. RESUMES (metadata; files live in the private "resumes" bucket)
-- ---------------------------------------------------------------------

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  version_name text,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists resumes_job_idx on public.resumes (job_id);
create index if not exists resumes_user_idx on public.resumes (user_id);

alter table public.resumes enable row level security;

drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
  on public.resumes for select
  using (auth.uid() = user_id);

drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own"
  on public.resumes for insert
  with check (auth.uid() = user_id);

drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own"
  on public.resumes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own"
  on public.resumes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

drop trigger if exists hr_contacts_set_updated_at on public.hr_contacts;
create trigger hr_contacts_set_updated_at
  before update on public.hr_contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. HELPER FUNCTIONS (RPC)
-- ---------------------------------------------------------------------

-- Find an existing company for this user (case-insensitive) or create one.
create or replace function public.find_or_create_company(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.companies (user_id, name)
  values (auth.uid(), trim(p_name))
  on conflict (user_id, lower(name)) do update
    set name = excluded.name
  returning id into v_id;
  return v_id;
end;
$$;

-- Remove companies that no longer have any jobs (avoids orphan rows).
create or replace function public.prune_orphan_companies()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.companies c
  where c.user_id = auth.uid()
    and not exists (
      select 1 from public.jobs j
      where j.company_id = c.id
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. PRIVATE STORAGE BUCKET + POLICIES
-- Object path convention:  <user_id>/<job_id>/<filename>
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "resumes_storage_insert" on storage.objects;
create policy "resumes_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_storage_select" on storage.objects;
create policy "resumes_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_storage_update" on storage.objects;
create policy "resumes_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_storage_delete" on storage.objects;
create policy "resumes_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================