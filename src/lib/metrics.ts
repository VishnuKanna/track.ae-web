import type { Job, JobEvent } from "@/types/database";
import type { JobStatusKey } from "@/config/status";
import { ACTIVE_STATUSES } from "@/config/status";
import { isCurrentMonth } from "@/lib/format";
import { todayISO, daysUntil } from "@/lib/format";

export interface PipelineMetrics {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  thisMonth: number;
  followUpsDue: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
  rejectionRate: number | null;
  followUpCompletionRate: number | null;
}

export interface StageCounts {
  label: string;
  value: number;
}

export function isSubmitted(job: Job): boolean {
  return job.status !== "saved" && job.status !== "withdrawn";
}

export function hasReachedInterview(job: Job, events: JobEvent[]): boolean {
  const status = job.status as JobStatusKey;
  if (status === "interview" || status === "offer") return true;
  return events.some(
    (e) =>
      e.job_id === job.id &&
      /interview|offer/i.test(`${e.event_type} ${e.title}`)
  );
}

export function hasReachedOffer(job: Job, events: JobEvent[]): boolean {
  if (job.status === "offer") return true;
  return events.some(
    (e) => e.job_id === job.id && /offer/i.test(`${e.event_type} ${e.title}`)
  );
}

export function hasProgressed(job: Job, events: JobEvent[]): boolean {
  if (!isSubmitted(job)) return false;
  const status = job.status as JobStatusKey;
  if (status === "recruiter_screen" || status === "interview" || status === "offer") return true;
  if (status === "rejected" || status === "withdrawn") {
    // A rejected application may have progressed; use its events/status history.
    return events.some((e) => e.job_id === job.id && e.event_type !== "application_submitted") ||
      status === "rejected";
  }
  return false;
}

export function computeMetrics(
  jobs: Job[],
  events: JobEvent[]
): PipelineMetrics {
  const submitted = jobs.filter(isSubmitted);
  const denominator = Math.max(1, submitted.length);
  const progressed = submitted.filter((j) => hasProgressed(j, events)).length;
  const interviewed = submitted.filter((j) => hasReachedInterview(j, events)).length;
  const offered = submitted.filter((j) => hasReachedOffer(j, events)).length;
  const rejected = jobs.filter((j) => j.status === "rejected").length;

  const followUpsDue = jobs.filter(
    (j) =>
      ACTIVE_STATUSES.includes(j.status as JobStatusKey) &&
      j.next_follow_up_date &&
      daysUntil(j.next_follow_up_date) <= 0
  ).length;

  const scheduledFollowUps = jobs.filter(
    (j) => j.next_follow_up_date || j.last_contact_date
  ).length;
  const completedFollowUps = jobs.filter(
    (j) => j.last_contact_date && j.next_follow_up_date
      ? j.last_contact_date >= j.next_follow_up_date &&
        daysUntil(j.next_follow_up_date) <= 0
      : !!j.last_contact_date
  ).length;

  return {
    total: jobs.length,
    active: jobs.filter((j) =>
      ACTIVE_STATUSES.includes(j.status as JobStatusKey)
    ).length,
    interviews: jobs.filter((j) => j.status === "interview" || j.status === "offer").length + 0,
    offers: offered,
    thisMonth: jobs.filter((j) => isCurrentMonth(j.application_date)).length,
    followUpsDue,
    responseRate: submitted.length ? progressed / submitted.length : null,
    interviewRate: submitted.length ? interviewed / submitted.length : null,
    offerRate: submitted.length ? offered / submitted.length : null,
    rejectionRate: submitted.length ? rejected / submitted.length : null,
    followUpCompletionRate: scheduledFollowUps
      ? completedFollowUps / scheduledFollowUps
      : null,
  };
}

export function statusBreakdown(jobs: Job[]): StageCounts[] {
  const order: JobStatusKey[] = [
    "saved",
    "applied",
    "recruiter_screen",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ];
  return order.map((key) => ({
    label: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    value: jobs.filter((j) => j.status === key).length,
  }));
}

export function groupBy<K extends string>(
  jobs: Job[],
  fn: (job: Job) => K | null
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const job of jobs) {
    const key = fn(job);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function monthlyApplications(jobs: Job[]): {
  key: string;
  label: string;
  value: number;
}[] {
  const months: { key: string; count: number }[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, count: 0 });
  }
  for (const job of jobs) {
    if (!job.application_date) continue;
    const [y, m] = job.application_date.split("-").map(Number);
    if (!y || !m) continue;
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const hit = months.find((mo) => mo.key === key);
    if (hit) hit.count += 1;
  }
  return months.map((mo) => ({
    key: mo.key,
    label: new Date(`${mo.key}-01T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
    }),
    value: mo.count,
  }));
}

export const monthKeyNow = () => todayISO().slice(0, 7);