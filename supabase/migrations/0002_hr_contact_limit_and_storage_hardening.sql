-- =====================================================================
-- Track.AE — Hardening (0002)
-- Run AFTER 0001_initial.sql.
--  1. DB-level hard cap: maximum 25 HR contacts per job.
--  2. Owner-scoped, path-scoped private storage policies for resumes.
-- Safe to re-run. Does not modify or delete existing data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. HR CONTACT LIMIT (DB-level guarantee: max 25 per job_id)
--    Application-side check (DataContext addHRContact) is kept as the
--    primary UX guard; this trigger is the hard guarantee.
-- ---------------------------------------------------------------------

create or replace function public.enforce_hr_contact_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := 25;
  v_count int;
begin
  -- Serialize inserts for the same job so two concurrent transactions
  -- cannot both observe 24 and slip past the cap.
  perform pg_advisory_xact_lock(hashtextextended('hr_contact:' || new.job_id::text, 0));

  select count(*) into v_count
  from public.hr_contacts
  where job_id = new.job_id;

  if v_count >= v_limit then
    raise exception
      'A maximum of % HR contacts is allowed per application (job_id %, count %).',
      v_limit, new.job_id, v_count;
  end if;

  return new;
end;
$$;

drop trigger if exists hr_contacts_limit_trigger on public.hr_contacts;

create trigger hr_contacts_limit_trigger
  before insert on public.hr_contacts
  for each row execute function public.enforce_hr_contact_limit();

-- ---------------------------------------------------------------------
-- 2. PRIVATE STORAGE POLICIES (hardened)
--    Object path convention: <user_id>/<job_id>/<filename>
--    Every policy now requires BOTH:
--      - bucket_id = 'resumes' (bucket stays private)
--      - storage.foldername(name)[1] = auth.uid()  (file in own folder)
--      - owner_id = auth.uid()                      (object belongs to caller)
--    UPDATE additionally has a WITH CHECK so an object cannot be moved or
--    renamed outside the caller's folder (or re-assigned to another owner).
--    SELECT stays owner+path scoped, so createSignedUrl keeps working.
-- ---------------------------------------------------------------------

drop policy if exists "resumes_storage_insert" on storage.objects;
create policy "resumes_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_storage_select" on storage.objects;
create policy "resumes_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_storage_update" on storage.objects;
create policy "resumes_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_storage_delete" on storage.objects;
create policy "resumes_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and owner_id = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- END OF HARDENING
-- =====================================================================