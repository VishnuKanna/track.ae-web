import { useMemo } from "react";
import { useData } from "@/store/DataContext";
import type { Job, JobEvent } from "@/types/database";
import { daysUntil } from "@/lib/format";

export type NotificationTone = "orange" | "amber" | "blue";

export interface AppNotification {
  id: string;
  type: "follow_up" | "interview";
  tone: NotificationTone;
  title: string;
  subtitle: string;
  timeLabel: string;
  jobId: string;
}

/** Notifications are derived from live data — only upcoming follow-ups and
 *  interviews surface here. Nothing is persisted, so renders never duplicate. */
function buildNotifications(jobs: Job[], events: JobEvent[]): AppNotification[] {
  const out: AppNotification[] = [];
  const jobsById = new Map(jobs.map((j) => [j.id, j]));

  for (const job of jobs) {
    if (!job.next_follow_up_date) continue;
    const days = daysUntil(job.next_follow_up_date);
    if (!Number.isFinite(days)) continue;

    if (days < 0) {
      const over = Math.abs(days);
      out.push({
        id: `fu-${job.id}`,
        type: "follow_up",
        tone: "orange",
        title: `Follow-up overdue by ${over} day${over === 1 ? "" : "s"}`,
        subtitle: `${job.company_name} · ${job.job_title}`,
        timeLabel: "Overdue",
        jobId: job.id,
      });
    } else if (days === 0) {
      out.push({
        id: `fu-${job.id}`,
        type: "follow_up",
        tone: "orange",
        title: "Follow-up today",
        subtitle: `${job.company_name} · ${job.job_title}`,
        timeLabel: "Today",
        jobId: job.id,
      });
    } else if (days === 1) {
      out.push({
        id: `fu-${job.id}`,
        type: "follow_up",
        tone: "amber",
        title: "Follow-up tomorrow",
        subtitle: `${job.company_name} · ${job.job_title}`,
        timeLabel: "Tomorrow",
        jobId: job.id,
      });
    } else if (days <= 7) {
      out.push({
        id: `fu-${job.id}`,
        type: "follow_up",
        tone: "amber",
        title: `Follow-up in ${days} days`,
        subtitle: `${job.company_name} · ${job.job_title}`,
        timeLabel: `In ${days} days`,
        jobId: job.id,
      });
    }
  }

  for (const ev of events) {
    const isInterview =
      /interview/i.test(ev.event_type) || /interview/i.test(ev.title);
    if (!isInterview) continue;
    const job = jobsById.get(ev.job_id);
    if (!job) continue;
    const days = daysUntil(ev.event_date);
    if (!Number.isFinite(days) || days < 0) continue;

    out.push({
      id: `int-${ev.id}`,
      type: "interview",
      tone: "blue",
      title:
        days === 0
          ? "Interview today"
          : days === 1
          ? "Interview tomorrow"
          : `Interview in ${days} days`,
      subtitle: `${job.company_name} · ${job.job_title}`,
      timeLabel: days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`,
      jobId: job.id,
    });
  }

  const rank: Record<AppNotification["type"], number> = {
    follow_up: 0,
    interview: 1,
  };

  return out
    .sort((a, b) => rank[a.type] - rank[b.type])
    .slice(0, 20);
}

export function useNotifications(): AppNotification[] {
  const { jobs, events } = useData();
  return useMemo(() => buildNotifications(jobs, events), [jobs, events]);
}
