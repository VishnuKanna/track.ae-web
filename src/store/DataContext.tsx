import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase, getSupabase } from "@/lib/supabase";
import type {
  Job,
  Company,
  HRContact,
  Resume,
  JobEvent,
  Profile,
} from "@/types/database";
import { eventStatusFor } from "@/config/events";
import { statusByKey } from "@/config/status";
import type { JobStatusKey } from "@/config/status";
import { todayISO } from "@/lib/format";
import {
  formatSupabaseError,
  isMissingColumnError,
  logSupabaseError,
  safeErrorMessage,
  withTimeout,
  MAX_HR_CONTACTS,
} from "@/lib/validation";

export interface CompanyFields {
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface JobInput {
  company_name: string;
  company?: CompanyFields;
  job_title: string;
  job_url: string | null;
  job_id: string | null;
  location: string | null;
  address: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  employment_type: string | null;
  status: string;
  application_date: string | null;
  next_follow_up_date: string | null;
  last_contact_date: string | null;
  source: string | null;
  referral_name: string | null;
  referral_contact: string | null;
  recruiter_notes: string | null;
  resume_version: string | null;
  cover_letter_version: string | null;
  job_description: string | null;
  priority: string;
  /**
   * Complete intended HR-contact set for the application. Persisted atomically
   * with the application record: on create they are inserted, on update the
   * set is reconciled (delete the missing, update by `id`, insert new).
   */
  hr_contacts?: HRContactInput[];
}

export interface EventInput {
  event_type: string;
  event_date: string;
  event_time?: string | null;
  title: string;
  description?: string | null;
  round?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
}

export type HRContactInput = Partial<{
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  linkedin_url: string;
  notes: string;
}>;

export interface DataContextValue {
  userId: string | null;
  hydrated: boolean;
  loading: boolean;
  dataError: string | null;

  jobs: Job[];
  companies: Company[];
  hrContacts: HRContact[];
  resumes: Resume[];
  events: JobEvent[];

  refresh: () => Promise<void>;

  createJob: (input: JobInput) => Promise<Job>;
  updateApplication: (
    id: string,
    patch: Partial<JobInput>,
    opts?: { skipEvents?: boolean }
  ) => Promise<Job>;
  updateApplicationStatus: (id: string, status: JobStatusKey) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  createCompany: (name: string, fields?: CompanyFields) => Promise<Company>;
  updateCompany: (
    id: string,
    patch: { name?: string } & CompanyFields
  ) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  addHRContact: (
    jobId: string,
    input: HRContactInput
  ) => Promise<HRContact>;
  updateHRContact: (id: string, patch: HRContactInput) => Promise<void>;
  deleteHRContact: (id: string) => Promise<void>;

  addResume: (
    jobId: string,
    file: File,
    versionName?: string
  ) => Promise<Resume>;
  deleteResume: (id: string) => Promise<void>;
  updateResume: (id: string, patch: Partial<Resume>) => Promise<void>;

  addApplicationEvent: (
    jobId: string,
    input: EventInput
  ) => Promise<JobEvent>;
  deleteEvent: (id: string) => Promise<void>;

  contactsForJob: (jobId: string) => HRContact[];
  resumesForJob: (jobId: string) => Resume[];
  eventsForJob: (jobId: string) => JobEvent[];
  companyById: (id: string | null) => Company | undefined;
  userProfile: Profile | null;
}

const DataContext = createContext<DataContextValue | null>(null);

function toNull(v?: string | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function toNum(v?: number | string | null): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = (v ?? "").toString().trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function DataProvider({
  children,
  userId,
  profile,
}: {
  children: ReactNode;
  userId: string | null;
  profile: Profile | null;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hrContacts, setHrContacts] = useState<HRContact[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const jobsRef = useRef<Job[]>([]);
  const companiesRef = useRef<Company[]>([]);
  const hrRef = useRef<HRContact[]>([]);
  const resumesRef = useRef<Resume[]>([]);
  const eventsRef = useRef<JobEvent[]>([]);

  jobsRef.current = jobs;
  companiesRef.current = companies;
  hrRef.current = hrContacts;
  resumesRef.current = resumes;
  eventsRef.current = events;

  const requireUser = useCallback(() => {
    if (!userId) throw new Error("You must be signed in.");
    return userId;
  }, [userId]);

  const hydrate = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setDataError(null);
      return;
    }
    if (!supabase) {
      setLoading(false);
      setDataError("Track.AE is not connected to Supabase. Check your environment configuration.");
      return;
    }
    setLoading(true);
    setDataError(null);
    try {
      const [j, c, h, r, e] = await withTimeout(
        Promise.all([
          supabase
            .from("jobs")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("companies")
            .select("*")
            .eq("user_id", userId)
            .order("name", { ascending: true }),
          supabase
            .from("hr_contacts")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
          supabase
            .from("resumes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("job_events")
            .select("*")
            .eq("user_id", userId)
            .order("event_date", { ascending: false }),
        ]),
        30000,
        "Loading your workspace"
      );
      if (j.error) throw j.error;
      if (c.error) throw c.error;
      if (h.error) throw h.error;
      if (r.error) throw r.error;
      if (e.error) throw e.error;
      setJobs(j.data as Job[]);
      setCompanies(c.data as Company[]);
      setHrContacts(h.data as HRContact[]);
      setResumes(r.data as Resume[]);
      setEvents(e.data as JobEvent[]);
      setHydrated(true);
    } catch (err) {
      console.error("[DataContext] hydrate failed:", err);
      setDataError(
        formatSupabaseError(err, "Could not load your workspace.")
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setJobs([]);
      setCompanies([]);
      setHrContacts([]);
      setResumes([]);
      setEvents([]);
      setHydrated(false);
      setLoading(false);
      setDataError(null);
      return;
    }
    let cancelled = false;
    setHydrated(false);
    void hydrate().then(() => {
      if (cancelled) return;
      // no-op — state already set
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hydrate]);

  const refresh = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  /** Resolves a company by name, creating it if needed, and syncs metadata. */
  const syncCompany = useCallback(
    async (name: string, fields?: CompanyFields) => {
      const uid = requireUser();
      const sb = getSupabase();
      const clean = name.trim();
      let companyId: string | null = null;

      const { data: rpcData, error: rpcErr } = await sb.rpc(
        "find_or_create_company",
        { p_name: clean }
      );
      if (rpcErr) {
        logSupabaseError("find_or_create_company RPC failed", rpcErr);
        throw new Error("Could not save company.");
      }
      companyId = (rpcData as string) || null;
      if (!companyId) throw new Error("Could not save company.");

      const existing = companiesRef.current.find(
        (c) => c.id === companyId
      );

      const hasFields =
        fields &&
        (fields.website !== undefined ||
          fields.industry !== undefined ||
          fields.location !== undefined ||
          fields.notes !== undefined);

      if (hasFields) {
        const merged: Partial<Company> = {
          ...(fields?.website !== undefined
            ? { website: toNull(fields.website) }
            : {}),
          ...(fields?.industry !== undefined
            ? { industry: toNull(fields.industry) }
            : {}),
          ...(fields?.location !== undefined
            ? { location: toNull(fields.location) }
            : {}),
          ...(fields?.notes !== undefined
            ? { notes: toNull(fields.notes) }
            : {}),
        };
        if (Object.keys(merged).length > 0) {
          const { error } = await sb
            .from("companies")
            .update(merged)
            .eq("id", companyId)
            .eq("user_id", uid);
          if (error) {
            logSupabaseError("companies update failed", error);
            throw new Error("Could not update company.");
          }
        }
      }

      if (!existing) {
        const { data, error } = await sb
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .eq("user_id", uid)
          .maybeSingle();
        if (!error && data) {
          setCompanies((prev) => [data as Company, ...prev]);
        }
      } else if (hasFields) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === companyId
              ? { ...c, ...(fields || {}) }
              : c
          )
        );
      } else if (existing.name !== clean) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === companyId ? { ...c, name: clean } : c))
        );
      }

      return companyId;
    },
    [requireUser]
  );

  const insertEventRow = useCallback(
    async (jobId: string, input: EventInput): Promise<JobEvent> => {
      const uid = requireUser();
      const sb = getSupabase();

      const fullPayload = {
        user_id: uid,
        job_id: jobId,
        event_type: input.event_type,
        event_date: input.event_date,
        event_time: input.event_time ?? null,
        title: input.title,
        description: input.description ?? null,
        round: input.round ?? null,
        previous_status: input.previous_status ?? null,
        new_status: input.new_status ?? null,
      };

      let result = await sb
        .from("job_events")
        .insert(fullPayload)
        .select("*")
        .single();

      // The detail columns (event_time/round/previous_status/new_status) only
      // exist once migration 0003 has been applied. If the live database is
      // behind, fall back to the base columns so adding events still works,
      // and log an actionable warning instead of silently swallowing it.
      if (result.error && isMissingColumnError(result.error)) {
        console.warn(
          "[Track.AE] job_events is missing detail columns. Apply migration " +
            "supabase/migrations/0003_job_events_details.sql to persist " +
            "round/status detail. Falling back to base columns for now."
        );
        logSupabaseError("job_events insert (full payload)", result.error);
        result = await sb
          .from("job_events")
          .insert({
            user_id: fullPayload.user_id,
            job_id: fullPayload.job_id,
            event_type: fullPayload.event_type,
            event_date: fullPayload.event_date,
            title: fullPayload.title,
            description: fullPayload.description,
          })
          .select("*")
          .single();
      }

      const { data, error } = result;
      if (error || !data) {
        // Log the real Supabase error (code/message/details/hint) so the root
        // cause is visible in development, then surface a clean user message.
        logSupabaseError("Failed to add event", error);
        throw new Error(
          safeErrorMessage(error, "Unable to add event. Please try again.")
        );
      }
      const event = data as JobEvent;
      setEvents((prev) => [event, ...prev]);
      return event;
    },
    [requireUser]
  );

  /** Builds a clean DB payload from a partial JobInput + company id. */
  const jobPayload = useCallback(
    (input: Partial<JobInput>, companyId?: string | null) => {
      const payload: Record<string, unknown> = {};
      if (input.job_title !== undefined) payload.job_title = toNull(input.job_title);
      if (input.company_name !== undefined) payload.company_name = input.company_name.trim();
      if (input.job_url !== undefined) payload.job_url = toNull(input.job_url);
      if (input.job_id !== undefined) payload.job_id = toNull(input.job_id);
      if (input.location !== undefined) payload.location = toNull(input.location);
      if (input.address !== undefined) payload.address = toNull(input.address);
      if (input.salary_min !== undefined) payload.salary_min = toNum(input.salary_min);
      if (input.salary_max !== undefined) payload.salary_max = toNum(input.salary_max);
      if (input.salary_currency !== undefined) payload.salary_currency = toNull(input.salary_currency);
      if (input.employment_type !== undefined) payload.employment_type = toNull(input.employment_type);
      if (input.status !== undefined) payload.status = input.status;
      if (input.application_date !== undefined) payload.application_date = toNull(input.application_date);
      if (input.next_follow_up_date !== undefined) payload.next_follow_up_date = toNull(input.next_follow_up_date);
      if (input.last_contact_date !== undefined) payload.last_contact_date = toNull(input.last_contact_date);
      if (input.source !== undefined) payload.source = toNull(input.source);
      if (input.referral_name !== undefined) payload.referral_name = toNull(input.referral_name);
      if (input.referral_contact !== undefined) payload.referral_contact = toNull(input.referral_contact);
      if (input.recruiter_notes !== undefined) payload.recruiter_notes = toNull(input.recruiter_notes);
      if (input.resume_version !== undefined) payload.resume_version = toNull(input.resume_version);
      if (input.cover_letter_version !== undefined) payload.cover_letter_version = toNull(input.cover_letter_version);
      if (input.job_description !== undefined) payload.job_description = toNull(input.job_description);
      if (input.priority !== undefined) payload.priority = input.priority;
      if (companyId !== undefined) payload.company_id = companyId;
      return payload;
    },
    []
  );

  /** Normalizes a draft HR contact to DB-ready values (empty → null). */
  const normalizeContact = useCallback(
    (c: HRContactInput) => ({
      name: toNull(c.name),
      designation: toNull(c.designation),
      email: toNull(c.email),
      phone: toNull(c.phone),
      linkedin_url: toNull(c.linkedin_url),
      notes: toNull(c.notes),
    }),
    []
  );

  /**
   * Reconciles a job's HR-contact set atomically with the application save:
   * deletes contacts no longer wanted, updates contacts that carry an existing
   * id, and inserts brand-new ones — all in one call so the modal never needs a
   * second "save HR contacts" round-trip. Contacts that were already inserted
   * by a previously interrupted attempt are matched by name and updated instead
   * of duplicated, keeping retries idempotent.
   */
  const syncJobContacts = useCallback(
    async (jobId: string, contacts: HRContactInput[]): Promise<void> => {
      const uid = requireUser();
      const sb = getSupabase();
      if (contacts.length > MAX_HR_CONTACTS) {
        throw new Error(
          `A maximum of ${MAX_HR_CONTACTS} HR contacts is allowed per application.`
        );
      }
      let next = hrRef.current;

      const wantedIds = new Set(
        contacts.map((c) => c.id).filter((id): id is string => Boolean(id))
      );
      const removed = next.filter(
        (c) => c.job_id === jobId && !wantedIds.has(c.id)
      );
      if (removed.length > 0) {
        const { error } = await sb
          .from("hr_contacts")
          .delete()
          .in(
            "id",
            removed.map((r) => r.id)
          )
          .eq("user_id", uid);
        if (error) throw error;
        const removedIds = new Set(removed.map((r) => r.id));
        next = next.filter((c) => !removedIds.has(c.id));
      }

      const insertRows: Record<string, unknown>[] = [];
      for (const c of contacts) {
        const payload = normalizeContact(c);
        if (c.id) {
          const { data, error } = await sb
            .from("hr_contacts")
            .update(payload)
            .eq("id", c.id)
            .eq("user_id", uid)
            .select("*")
            .single();
          if (error || !data) {
            throw error || new Error("Could not update an HR contact.");
          }
          const updated = data as HRContact;
          next = next.map((x) => (x.id === updated.id ? updated : x));
          continue;
        }
        const name = (payload.name ?? "").trim().toLowerCase();
        const matched = next.find(
          (x) =>
            x.job_id === jobId &&
            name !== "" &&
            (x.name ?? "").trim().toLowerCase() === name
        );
        if (matched) {
          const { data, error } = await sb
            .from("hr_contacts")
            .update(payload)
            .eq("id", matched.id)
            .eq("user_id", uid)
            .select("*")
            .single();
          if (error || !data) {
            throw error || new Error("Could not update an HR contact.");
          }
          const updated = data as HRContact;
          next = next.map((x) => (x.id === updated.id ? updated : x));
        } else {
          insertRows.push({ user_id: uid, job_id: jobId, ...payload });
        }
      }

      if (insertRows.length > 0) {
        const { data, error } = await sb
          .from("hr_contacts")
          .insert(insertRows)
          .select("*");
        if (error || !data) {
          throw error || new Error("Could not add an HR contact.");
        }
        next = [...next, ...(data as HRContact[])];
      }

      setHrContacts(next);
    },
    [requireUser, normalizeContact]
  );

  const createJob = useCallback(
    async (input: JobInput): Promise<Job> => {
      const uid = requireUser();
      const sb = getSupabase();
      const companyId = await syncCompany(input.company_name, input.company);
      const payload = jobPayload(input, companyId);
      payload.user_id = uid;

      const { data, error } = await sb.from("jobs").insert(payload).select("*").single();
      if (error || !data) {
        throw new Error(safeErrorMessage(error, "Could not create application."));
      }
      const job = data as Job;
      setJobs((prev) => [job, ...prev]);

      try {
        if (input.hr_contacts && input.hr_contacts.length > 0) {
          await syncJobContacts(job.id, input.hr_contacts);
        }
      } catch (err) {
        logSupabaseError("POST application failed while saving HR contacts", err);
        // Roll back the just-created row so a retry never duplicates it.
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
        try {
          await sb
            .from("hr_contacts")
            .delete()
            .eq("job_id", job.id)
            .eq("user_id", uid);
        } catch {
          /* best effort cleanup */
        }
        try {
          await sb
            .from("jobs")
            .delete()
            .eq("id", job.id)
            .eq("user_id", uid);
        } catch {
          /* best effort cleanup */
        }
        throw new Error(
          safeErrorMessage(
            err,
            "Application could not be saved — the HR contact(s) could not be saved. Please try again."
          )
        );
      }

      if (job.status === "applied") {
        await insertEventRow(job.id, {
          event_type: "application_submitted",
          event_date: job.application_date || todayISO(),
          title: "Application submitted",
          description: input.company_name
            ? `Applied to ${input.company_name}`
            : undefined,
        });
      } else if (job.status === "saved") {
        await insertEventRow(job.id, {
          event_type: "application_saved",
          event_date: todayISO(),
          title: "Application saved",
          description: `Saved ${input.company_name} — ${input.job_title}`,
        });
      }
      return job;
    },
    [requireUser, syncCompany, jobPayload, syncJobContacts, insertEventRow]
  );

  const updateApplication = useCallback(
    async (
      id: string,
      patch: Partial<JobInput>,
      opts?: { skipEvents?: boolean }
    ): Promise<Job> => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = jobsRef.current.find((j) => j.id === id);
      if (!prev) {
        throw new Error("Application not found.");
      }

      const optimistic: Job = { ...prev } as Job;
      if (patch.job_title !== undefined) optimistic.job_title = patch.job_title.trim() || prev.job_title;
      if (patch.company_name !== undefined) optimistic.company_name = patch.company_name.trim() || prev.company_name;
      if (patch.job_url !== undefined) optimistic.job_url = toNull(patch.job_url);
      if (patch.job_id !== undefined) optimistic.job_id = toNull(patch.job_id);
      if (patch.location !== undefined) optimistic.location = toNull(patch.location);
      if (patch.address !== undefined) optimistic.address = toNull(patch.address);
      if (patch.salary_min !== undefined) optimistic.salary_min = toNum(patch.salary_min);
      if (patch.salary_max !== undefined) optimistic.salary_max = toNum(patch.salary_max);
      if (patch.salary_currency !== undefined) optimistic.salary_currency = toNull(patch.salary_currency);
      if (patch.employment_type !== undefined) optimistic.employment_type = toNull(patch.employment_type);
      if (patch.status !== undefined) optimistic.status = patch.status;
      if (patch.application_date !== undefined) optimistic.application_date = toNull(patch.application_date);
      if (patch.next_follow_up_date !== undefined) optimistic.next_follow_up_date = toNull(patch.next_follow_up_date);
      if (patch.last_contact_date !== undefined) optimistic.last_contact_date = toNull(patch.last_contact_date);
      if (patch.source !== undefined) optimistic.source = toNull(patch.source);
      if (patch.referral_name !== undefined) optimistic.referral_name = toNull(patch.referral_name);
      if (patch.referral_contact !== undefined) optimistic.referral_contact = toNull(patch.referral_contact);
      if (patch.recruiter_notes !== undefined) optimistic.recruiter_notes = toNull(patch.recruiter_notes);
      if (patch.resume_version !== undefined) optimistic.resume_version = toNull(patch.resume_version);
      if (patch.cover_letter_version !== undefined) optimistic.cover_letter_version = toNull(patch.cover_letter_version);
      if (patch.job_description !== undefined) optimistic.job_description = toNull(patch.job_description);
      if (patch.priority !== undefined) optimistic.priority = patch.priority;
      optimistic.updated_at = new Date().toISOString();

      setJobs((list) => list.map((j) => (j.id === id ? optimistic : j)));

      const companyChanged =
        patch.company_name !== undefined &&
        patch.company_name.trim().toLowerCase() !==
          prev.company_name.trim().toLowerCase();

      const statusChanged =
        patch.status !== undefined && patch.status !== prev.status;

      let savedJob: Job | null = null;
      try {
        let companyId: string | null | undefined;
        if (companyChanged || patch.company !== undefined) {
          try {
            companyId = await syncCompany(
              patch.company_name ?? prev.company_name,
              patch.company
            );
          } catch (err) {
            // Company metadata is secondary: a company sync failure must never
            // block persisting the application fields the user actually edited.
            logSupabaseError(
              "Failed to sync company during application update",
              err
            );
            companyId = prev.company_id ?? null;
          }
        }

        const payload = jobPayload(
          patch,
          companyChanged || patch.company !== undefined ? companyId : undefined
        );

        // .select().single() makes a silent "0 rows updated" (wrong id, mismatched
        // user, or RLS) impossible — it becomes a visible error instead of the UI
        // pretending the save worked.
        const { data: updated, error } = await sb
          .from("jobs")
          .update(payload)
          .eq("id", id)
          .eq("user_id", uid)
          .select("*")
          .single();

        if (error || !updated) {
          if (!error && !updated) {
            throw new Error(
              "The application could not be updated — no matching record was found for this account."
            );
          }
          throw error;
        }

        // Trust the persisted database row as the source of truth so the UI
        // immediately reflects exactly what was saved (no reload needed).
        savedJob = updated as Job;
        setJobs((list) => list.map((j) => (j.id === id ? savedJob! : j)));
      } catch (err) {
        logSupabaseError("Failed to update application", err);
        setJobs((list) => list.map((j) => (j.id === id ? prev : j)));
        throw new Error(
          safeErrorMessage(err, "Unable to update application. Please try again.")
        );
      }

      // The job row is now committed on the server. Persist the complete
      // HR-contact set in the same save: on failure the modal stays open so the
      // user can retry, and the (already saved) job state is left intact so a
      // retry never re-fires status events or duplicates anything.
      if (patch.hr_contacts !== undefined) {
        const prevContacts = hrRef.current.filter((c) => c.job_id === id);
        try {
          await syncJobContacts(id, patch.hr_contacts);
        } catch (err) {
          logSupabaseError("PUT application failed while saving HR contacts", err);
          setHrContacts((list) => [
            ...list.filter((c) => c.job_id !== id),
            ...prevContacts,
          ]);
          throw new Error(
            safeErrorMessage(
              err,
              "Application saved, but the HR contact(s) could not be saved. Please try again."
            )
          );
        }
      }

      // Automatic timeline events are best-effort: a failed event insert must
      // not roll back an application update that already succeeded.
      try {
        // A status change (dropdown / edit form) always produces exactly one
        // generic "Status changed X → Y" event. skipEvents is used by the
        // add-event flow, which creates its own transition event so it can
        // timestamp it with the event's date instead of today.
        if (statusChanged && !opts?.skipEvents) {
          await insertEventRow(id, {
            event_type: "status_changed",
            event_date: todayISO(),
            title: "Status changed",
            description: `${statusByKey(prev.status).label} → ${
              statusByKey(patch.status).label
            }`,
            previous_status: prev.status,
            new_status: patch.status,
          });
        }

        if (
          !opts?.skipEvents &&
          patch.last_contact_date !== undefined &&
          patch.last_contact_date !== prev.last_contact_date &&
          patch.last_contact_date
        ) {
          await insertEventRow(id, {
            event_type: "follow_up_sent",
            event_date: patch.last_contact_date,
            title: "Follow-up sent",
            description: "Marked as contacted.",
          });
        }
      } catch (eventErr) {
        logSupabaseError(
          "Application saved but timeline event failed",
          eventErr
        );
      }

      if (companyChanged) {
        try {
          await sb.rpc("prune_orphan_companies");
        } catch {
          /* best effort cleanup */
        }
      }

      return savedJob!;
    },
    [requireUser, syncCompany, jobPayload, syncJobContacts, insertEventRow]
  );

  /**
   * Canonical status change: every quick status control (card dropdown, table
   * dropdown, detail dropdown) calls this and nothing else. It is a no-op when
   * the status is unchanged (so it never creates a duplicate timeline event),
   * and otherwise delegates to updateApplication, which owns both the PATCH and
   * the single "Status changed" event.
   */
  const updateApplicationStatus = useCallback(
    async (id: string, status: JobStatusKey): Promise<void> => {
      const current = jobsRef.current.find((j) => j.id === id);
      if (!current) return;
      if (current.status === status) return;
      await updateApplication(id, { status });
    },
    [updateApplication]
  );

  const deleteJob = useCallback(
    async (id: string) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = jobsRef.current.find((j) => j.id === id);
      const prevResumes = resumesRef.current.filter((r) => r.job_id === id);
      if (!prev) return;

      setJobs((list) => list.filter((j) => j.id !== id));
      setHrContacts((list) => list.filter((c) => c.job_id !== id));
      setResumes((list) => list.filter((r) => r.job_id !== id));
      setEvents((list) => list.filter((e) => e.job_id !== id));

      try {
        if (prevResumes.length > 0) {
          await sb.storage
            .from("resumes")
            .remove(prevResumes.map((r) => r.storage_path));
        }
        const { error } = await sb
          .from("jobs")
          .delete()
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
        try {
          await sb.rpc("prune_orphan_companies");
        } catch {
          /* best effort */
        }
      } catch (err) {
        setJobs((list) => [prev, ...list]);
        throw new Error(safeErrorMessage(err, "Could not delete application."));
      }
    },
    [requireUser]
  );

  const createCompany = useCallback(
    async (name: string, fields?: CompanyFields): Promise<Company> => {
      const uid = requireUser();
      const sb = getSupabase();
      const companyId = await syncCompany(name, fields);
      const existing = companiesRef.current.find((c) => c.id === companyId);
      if (existing) return existing;
      const { data, error } = await sb
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error || !data) throw new Error("Could not create company.");
      const company = data as Company;
      setCompanies((prev) => [company, ...prev]);
      return company;
    },
    [requireUser, syncCompany]
  );

  const updateCompany = useCallback(
    async (id: string, patch: { name?: string } & CompanyFields) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = companiesRef.current.find((c) => c.id === id);
      if (!prev) return;
      const optimistic: Company = { ...prev, ...(patch as Partial<Company>) };
      setCompanies((list) => list.map((c) => (c.id === id ? optimistic : c)));
      try {
        const payload: Record<string, unknown> = {
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.website !== undefined ? { website: toNull(patch.website) } : {}),
          ...(patch.industry !== undefined ? { industry: toNull(patch.industry) } : {}),
          ...(patch.location !== undefined ? { location: toNull(patch.location) } : {}),
          ...(patch.notes !== undefined ? { notes: toNull(patch.notes) } : {}),
        };
        const { error } = await sb
          .from("companies")
          .update(payload)
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
        if (patch.name !== undefined && patch.name.trim() !== prev.name) {
          const { error: jobsError } = await sb
            .from("jobs")
            .update({ company_name: patch.name.trim() })
            .eq("company_id", id)
            .eq("user_id", uid);
          if (jobsError) {
            logSupabaseError(
              "Failed to cascade company name to applications",
              jobsError
            );
          }
          setJobs((list) =>
            list.map((j) =>
              j.company_id === id ? { ...j, company_name: patch.name!.trim() } : j
            )
          );
        }
      } catch (err) {
        logSupabaseError("Failed to update company", err);
        setCompanies((list) => list.map((c) => (c.id === id ? prev : c)));
        throw new Error(safeErrorMessage(err, "Could not update company."));
      }
    },
    [requireUser]
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      const uid = requireUser();
      const sb = getSupabase();
      const jobsUsing = jobsRef.current.filter((j) => j.company_id === id);
      if (jobsUsing.length > 0) {
        throw new Error(
          "This company still has applications. Remove them first."
        );
      }
      const prev = companiesRef.current.find((c) => c.id === id);
      setCompanies((list) => list.filter((c) => c.id !== id));
      try {
        const { error } = await sb
          .from("companies")
          .delete()
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
      } catch (err) {
        if (prev) setCompanies((list) => [prev, ...list]);
        throw new Error(safeErrorMessage(err, "Could not delete company."));
      }
    },
    [requireUser]
  );

  const addHRContact = useCallback(
    async (jobId: string, input: Partial<HRContact>) => {
      const uid = requireUser();
      const sb = getSupabase();
      const existingCount = hrRef.current.filter((c) => c.job_id === jobId).length;
      if (existingCount >= MAX_HR_CONTACTS) {
        throw new Error(
          `A maximum of ${MAX_HR_CONTACTS} HR contacts is allowed per application.`
        );
      }
      const { data, error } = await sb
        .from("hr_contacts")
        .insert({
          user_id: uid,
          job_id: jobId,
          name: toNull(input.name),
          designation: toNull(input.designation),
          email: toNull(input.email),
          phone: toNull(input.phone),
          linkedin_url: toNull(input.linkedin_url),
          notes: toNull(input.notes),
        })
        .select("*")
        .single();
      if (error || !data) {
        logSupabaseError("Failed to add HR contact", error);
        throw new Error(
          safeErrorMessage(error, "Unable to add contact. Please try again.")
        );
      }
      const contact = data as HRContact;
      setHrContacts((prev) => [...prev, contact]);
      return contact;
    },
    [requireUser]
  );

  const updateHRContact = useCallback(
    async (id: string, patch: Partial<HRContact>) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = hrRef.current.find((c) => c.id === id);
      if (!prev) return;
      setHrContacts((list) =>
        list.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
      try {
        const payload: Record<string, unknown> = {};
        if (patch.name !== undefined) payload.name = toNull(patch.name);
        if (patch.designation !== undefined) payload.designation = toNull(patch.designation);
        if (patch.email !== undefined) payload.email = toNull(patch.email);
        if (patch.phone !== undefined) payload.phone = toNull(patch.phone);
        if (patch.linkedin_url !== undefined) payload.linkedin_url = toNull(patch.linkedin_url);
        if (patch.notes !== undefined) payload.notes = toNull(patch.notes);
        const { data: updated, error } = await sb
          .from("hr_contacts")
          .update(payload)
          .eq("id", id)
          .eq("user_id", uid)
          .select("*")
          .single();
        if (error || !updated) {
          if (!error && !updated) {
            throw new Error(
              "The contact could not be updated — no matching record was found."
            );
          }
          throw error;
        }
        setHrContacts((list) =>
          list.map((c) => (c.id === id ? (updated as HRContact) : c))
        );
      } catch (err) {
        logSupabaseError("Failed to update HR contact", err);
        setHrContacts((list) => list.map((c) => (c.id === id ? prev : c)));
        throw new Error(
          safeErrorMessage(err, "Unable to update contact. Please try again.")
        );
      }
    },
    [requireUser]
  );

  const deleteHRContact = useCallback(
    async (id: string) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = hrRef.current.find((c) => c.id === id);
      setHrContacts((list) => list.filter((c) => c.id !== id));
      try {
        const { error } = await sb
          .from("hr_contacts")
          .delete()
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
      } catch (err) {
        logSupabaseError("Failed to delete HR contact", err);
        if (prev) setHrContacts((list) => [...list, prev]);
        throw new Error(
          safeErrorMessage(err, "Unable to delete contact. Please try again.")
        );
      }
    },
    [requireUser]
  );

  const addResume = useCallback(
    async (jobId: string, file: File, versionName?: string): Promise<Resume> => {
      const uid = requireUser();
      const sb = getSupabase();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const storagePath = `${uid}/${jobId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await sb.storage
        .from("resumes")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });
      if (upErr) {
        throw new Error(safeErrorMessage(upErr, "Upload failed. Please try again."));
      }

      const { data, error } = await sb
        .from("resumes")
        .insert({
          user_id: uid,
          job_id: jobId,
          file_name: file.name,
          storage_path: storagePath,
          version_name: toNull(versionName) ?? file.name,
          file_size: file.size,
          mime_type: file.type || null,
        })
        .select("*")
        .single();

      if (error || !data) {
        await sb.storage.from("resumes").remove([storagePath]);
        throw new Error("Upload failed. Please try again.");
      }
      const resume = data as Resume;
      setResumes((prev) => [resume, ...prev]);
      return resume;
    },
    [requireUser]
  );

  const deleteResume = useCallback(
    async (id: string) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = resumesRef.current.find((r) => r.id === id);
      if (!prev) return;
      setResumes((list) => list.filter((r) => r.id !== id));
      try {
        await sb.storage.from("resumes").remove([prev.storage_path]);
        const { error } = await sb
          .from("resumes")
          .delete()
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
      } catch (err) {
        setResumes((list) => [prev, ...list]);
        throw new Error(safeErrorMessage(err, "Could not delete resume."));
      }
    },
    [requireUser]
  );

  const updateResume = useCallback(
    async (id: string, patch: Partial<Resume>) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = resumesRef.current.find((r) => r.id === id);
      if (!prev) return;
      setResumes((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      try {
        const { error } = await sb
          .from("resumes")
          .update({
            version_name: toNull(patch.version_name) ?? prev.version_name,
          })
          .eq("id", id)
          .eq("user_id", uid);
        if (error) {
          logSupabaseError("Failed to update resume", error);
          throw error;
        }
      } catch (err) {
        setResumes((list) => list.map((r) => (r.id === id ? prev : r)));
        throw new Error(safeErrorMessage(err, "Could not update resume."));
      }
    },
    [requireUser]
  );

  const addApplicationEvent = useCallback(
    async (jobId: string, input: EventInput): Promise<JobEvent> => {
      const event = await insertEventRow(jobId, input);

      // Status ↔ Timeline synchronization, driven by the single centralized
      // Event → Status map. Neutral events (follow-ups, assessments, document
      // requests, individual interview rounds) leave the status untouched.
      const target = eventStatusFor(input.event_type);
      const current = jobsRef.current.find((j) => j.id === jobId);
      if (target && current && current.status !== target) {
        try {
          // skipEvents: the transition event is created here so it can carry
          // the event's own date, keeping the timeline in chronological order.
          await updateApplication(jobId, { status: target }, { skipEvents: true });
          await insertEventRow(jobId, {
            event_type: "status_changed",
            event_date: input.event_date,
            event_time: input.event_time ?? null,
            title: "Status changed",
            description: `${statusByKey(current.status).label} → ${
              statusByKey(target).label
            }`,
            previous_status: current.status,
            new_status: target,
          });
        } catch (err) {
          // The event itself is saved; surface a precise, actionable error so
          // the user can reconcile the status instead of silently diverging.
          logSupabaseError("Event saved but status sync failed", err);
          throw new Error(
            "Event saved, but the status could not be updated. Please set it from the status menu."
          );
        }
      }
      return event;
    },
    [insertEventRow, updateApplication]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = eventsRef.current.find((e) => e.id === id);
      setEvents((list) => list.filter((e) => e.id !== id));
      try {
        const { error } = await sb
          .from("job_events")
          .delete()
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
      } catch (err) {
        if (prev) setEvents((list) => [prev, ...list]);
        throw new Error(safeErrorMessage(err, "Could not delete event."));
      }
    },
    [requireUser]
  );

  const contactsForJob = useCallback(
    (jobId: string) => hrRef.current.filter((c) => c.job_id === jobId),
    []
  );

  const resumesForJob = useCallback(
    (jobId: string) => resumesRef.current.filter((r) => r.job_id === jobId),
    []
  );

  const eventsForJob = useCallback(
    (jobId: string) =>
      eventsRef.current
        .filter((e) => e.job_id === jobId)
        .sort((a, b) => (a.event_date < b.event_date ? 1 : -1)),
    []
  );

  const companyById = useCallback(
    (id: string | null) => companiesRef.current.find((c) => c.id === id),
    []
  );

  const value = useMemo<DataContextValue>(
    () => ({
      userId,
      hydrated,
      loading,
      dataError,
      jobs,
      companies,
      hrContacts,
      resumes,
      events,
      refresh,
      createJob,
      updateApplication,
      updateApplicationStatus,
      deleteJob,
      createCompany,
      updateCompany,
      deleteCompany,
      addHRContact,
      updateHRContact,
      deleteHRContact,
      addResume,
      deleteResume,
      updateResume,
      addApplicationEvent,
      deleteEvent,
      contactsForJob,
      resumesForJob,
      eventsForJob,
      companyById,
      userProfile: profile,
    }),
    [
      userId,
      hydrated,
      loading,
      dataError,
      jobs,
      companies,
      hrContacts,
      resumes,
      events,
      refresh,
      createJob,
      updateApplication,
      updateApplicationStatus,
      deleteJob,
      createCompany,
      updateCompany,
      deleteCompany,
      addHRContact,
      updateHRContact,
      deleteHRContact,
      addResume,
      deleteResume,
      updateResume,
      addApplicationEvent,
      deleteEvent,
      contactsForJob,
      resumesForJob,
      eventsForJob,
      companyById,
      profile,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}