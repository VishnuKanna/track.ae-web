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
import { statusByKey } from "@/config/status";
import { todayISO } from "@/lib/format";
import { formatSupabaseError, safeErrorMessage, withTimeout } from "@/lib/validation";

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
}

export interface EventInput {
  event_type: string;
  event_date: string;
  title: string;
  description?: string | null;
}

export type HRContactInput = Partial<{
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
  updateJob: (
    id: string,
    patch: Partial<JobInput>,
    opts?: { skipEvents?: boolean }
  ) => Promise<void>;
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

  addEvent: (jobId: string, input: EventInput) => Promise<JobEvent>;
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
      if (rpcErr) throw new Error("Could not save company.");
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
          if (error) throw new Error("Could not update company.");
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
      const { data, error } = await sb
        .from("job_events")
        .insert({
          user_id: uid,
          job_id: jobId,
          event_type: input.event_type,
          event_date: input.event_date,
          title: input.title,
          description: input.description ?? null,
        })
        .select("*")
        .single();
      if (error || !data) throw new Error("Could not add timeline event.");
      setEvents((prev) => [data as JobEvent, ...prev]);
      return data as JobEvent;
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
    [requireUser, syncCompany, jobPayload, insertEventRow]
  );

  const updateJob = useCallback(
    async (
      id: string,
      patch: Partial<JobInput>,
      opts?: { skipEvents?: boolean }
    ) => {
      const uid = requireUser();
      const sb = getSupabase();
      const prev = jobsRef.current.find((j) => j.id === id);
      if (!prev) return;

      const optimistic: Job = { ...prev } as Job;
      if (patch.job_title !== undefined) optimistic.job_title = patch.job_title || prev.job_title;
      if (patch.company_name !== undefined) optimistic.company_name = patch.company_name.trim() || prev.company_name;
      if (patch.status !== undefined) optimistic.status = patch.status;
      if (patch.application_date !== undefined) optimistic.application_date = toNull(patch.application_date);
      if (patch.next_follow_up_date !== undefined) optimistic.next_follow_up_date = toNull(patch.next_follow_up_date);
      if (patch.last_contact_date !== undefined) optimistic.last_contact_date = toNull(patch.last_contact_date);
      if (patch.priority !== undefined) optimistic.priority = patch.priority;
      optimistic.updated_at = new Date().toISOString();

      setJobs((list) => list.map((j) => (j.id === id ? optimistic : j)));

      try {
        const companyChanged =
          patch.company_name !== undefined &&
          patch.company_name.trim().toLowerCase() !==
            prev.company_name.trim().toLowerCase();

        const statusChanged = patch.status !== undefined && patch.status !== prev.status;

        let companyId: string | null | undefined;
        if (companyChanged || patch.company !== undefined) {
          companyId = await syncCompany(
            patch.company_name ?? prev.company_name,
            patch.company
          );
        }
        if (companyChanged) {
          optimistic.company_id = companyId ?? null;
          setJobs((list) =>
            list.map((j) => (j.id === id ? { ...j, company_id: companyId ?? null } : j))
          );
        }

        const payload = jobPayload(patch, companyChanged || patch.company !== undefined ? companyId : undefined);
        const { error } = await sb.from("jobs").update(payload).eq("id", id).eq("user_id", uid);
        if (error) throw error;

        if (!opts?.skipEvents) {
          if (statusChanged) {
            await insertEventRow(id, {
              event_type: "status_changed",
              event_date: todayISO(),
              title: `Status changed to ${statusByKey(patch.status).label}`,
              description: `Moved ${prev.job_title} from ${statusByKey(prev.status).label} to ${statusByKey(patch.status).label}.`,
            });
          }
          if (
            (patch.last_contact_date !== undefined &&
              patch.last_contact_date !== prev.last_contact_date &&
              patch.last_contact_date) ||
            (patch.application_date !== undefined &&
              patch.application_date !== prev.application_date &&
              patch.application_date)
          ) {
            if (patch.last_contact_date && patch.last_contact_date !== prev.last_contact_date) {
              await insertEventRow(id, {
                event_type: "follow_up_sent",
                event_date: patch.last_contact_date,
                title: "Follow-up sent",
                description: "Marked as contacted.",
              });
            }
          }

          if (companyChanged) {
            try {
              await sb.rpc("prune_orphan_companies");
            } catch {
              /* best effort cleanup */
            }
          }
        }
      } catch (err) {
        setJobs((list) => list.map((j) => (j.id === id ? prev : j)));
        throw new Error(safeErrorMessage(err, "Could not update application."));
      }
    },
    [requireUser, syncCompany, jobPayload, insertEventRow]
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
          await sb.from("jobs").update({ company_name: patch.name.trim() }).eq("company_id", id).eq("user_id", uid);
          setJobs((list) =>
            list.map((j) =>
              j.company_id === id ? { ...j, company_name: patch.name!.trim() } : j
            )
          );
        }
      } catch (err) {
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
      if (existingCount >= 25) {
        throw new Error("A maximum of 25 HR contacts is allowed per application.");
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
      if (error || !data) throw new Error("Could not add HR contact.");
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
        const { error } = await sb
          .from("hr_contacts")
          .update(payload)
          .eq("id", id)
          .eq("user_id", uid);
        if (error) throw error;
      } catch (err) {
        setHrContacts((list) => list.map((c) => (c.id === id ? prev : c)));
        throw new Error(safeErrorMessage(err, "Could not update HR contact."));
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
        if (prev) setHrContacts((list) => [...list, prev]);
        throw new Error(safeErrorMessage(err, "Could not delete HR contact."));
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
        if (error) throw error;
      } catch (err) {
        setResumes((list) => list.map((r) => (r.id === id ? prev : r)));
        throw new Error(safeErrorMessage(err, "Could not update resume."));
      }
    },
    [requireUser]
  );

  const addEvent = useCallback(
    (jobId: string, input: EventInput) => insertEventRow(jobId, input),
    [insertEventRow]
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
      updateJob,
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
      addEvent,
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
      updateJob,
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
      addEvent,
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