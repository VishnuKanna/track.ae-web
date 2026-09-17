import type { HRContact, Job } from "@/types/database";
import type { JobStatusKey } from "@/config/status";
import { isHighPriority } from "@/config/priority";

export interface ApplicationFilters {
  status: JobStatusKey | "all";
  company: string;
  location: string;
  priority: string;
}

export const DEFAULT_FILTERS: ApplicationFilters = {
  status: "all",
  company: "",
  location: "",
  priority: "all",
};

export function filterJobs(
  jobs: Job[],
  query: string,
  filters: ApplicationFilters,
  contactsByJob: Record<string, HRContact[]>
): Job[] {
  const q = query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (filters.status !== "all" && job.status !== filters.status) return false;
    if (filters.priority !== "all") {
      if (filters.priority === "high" && !isHighPriority(job.priority)) return false;
      if (filters.priority === "medium" && job.priority !== "medium") return false;
      if (filters.priority === "low" && job.priority !== "low") return false;
    }
    const selectedCompany =
      filters.company &&
      filters.company !== "all" &&
      filters.company !== "all-companies"
        ? filters.company.trim().toLowerCase()
        : "";
    if (
      selectedCompany &&
      (job.company_name ?? "").trim().toLowerCase() !== selectedCompany
    ) {
      return false;
    }
    if (filters.location && !(job.location ?? "").toLowerCase().includes(filters.location.toLowerCase())) return false;

    if (q) {
      const haystack = [
        job.company_name,
        job.job_title,
        job.location,
        job.address,
        job.source,
        job.job_id,
        job.referral_name,
        job.referral_contact,
        job.recruiter_notes,
        job.job_description,
        ...(contactsByJob[job.id] ?? []).flatMap((c) => [
          c.name,
          c.designation,
          c.email,
          c.phone,
          c.linkedin_url,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export type FollowUpBucket = { overdue: Job[]; today: Job[]; tomorrow: Job[]; upcoming: Job[] };

export function bucketFollowUps(jobs: Job[]): FollowUpBucket {
  const buckets: FollowUpBucket = { overdue: [], today: [], tomorrow: [], upcoming: [] };
  for (const job of jobs) {
    if (!job.next_follow_up_date) continue;
    const days = daysUntilSafe(job.next_follow_up_date);
    if (days > 3650) continue;
    if (days < 0) buckets.overdue.push(job);
    else if (days === 0) buckets.today.push(job);
    else if (days === 1) buckets.tomorrow.push(job);
    else buckets.upcoming.push(job);
  }
  const byDate = (a: Job, b: Job) =>
    (a.next_follow_up_date ?? "").localeCompare(b.next_follow_up_date ?? "");
  return {
    overdue: [...buckets.overdue].sort(byDate),
    today: buckets.today.sort(byDate),
    tomorrow: buckets.tomorrow.sort(byDate),
    upcoming: [...buckets.upcoming].sort(byDate),
  };
}

function dayDiff(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function daysUntilSafe(iso: string): number {
  const d = dayDiff(iso);
  return Number.isFinite(d) ? d : 9999;
}

export const dayDiffSafe = dayDiff;