import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Check, CalendarClock, Send } from "lucide-react";
import { useData } from "@/store/DataContext";
import { useAuth } from "@/store/AuthContext";
import { computeMetrics } from "@/lib/metrics";
import { bucketFollowUps } from "@/lib/filter";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { FollowUpCard } from "@/components/applications/FollowUpCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { greeting, todayISO, formatDateLong } from "@/lib/format";
import type { Job } from "@/types/database";
import { cn } from "@/lib/cn";

const FOLLOWS = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "upcoming", label: "Upcoming" },
] as const;

type FollowKey = (typeof FOLLOWS)[number]["key"];

function formatRate(r: number | null): string {
  if (r === null) return "—";
  return `${Math.round(r * 100)}%`;
}

export function Dashboard() {
  const { jobs, events, loading, hydrated } = useData();
  const { profile } = useAuth();
  const [followKey, setFollowKey] = useState<FollowKey>("today");

  const metrics = useMemo(() => computeMetrics(jobs, events), [jobs, events]);
  const followUps = useMemo(() => bucketFollowUps(jobs), [jobs]);
  const recent = useMemo(
    () => [...jobs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5),
    [jobs]
  );

  const upcomingInterviews = useMemo(() => {
    const today = todayISO();
    return events
      .filter(
        (e) =>
          (/interview/i.test(e.event_type) || /interview/i.test(e.title)) &&
          e.event_date >= today
      )
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 8);
  }, [events]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "";
  const followList = followUps[followKey];
  const isWelcome = hydrated && jobs.length === 0;

  const followLabel: Record<FollowKey, string> = {
    overdue: "Overdue",
    today: "Due today",
    tomorrow: "Due tomorrow",
    upcoming: "Upcoming",
  };

  const followTone: Record<FollowKey, "overdue" | "today" | "tomorrow" | "upcoming"> = {
    overdue: "overdue",
    today: "today",
    tomorrow: "tomorrow",
    upcoming: "upcoming",
  };

  return (
    <div>
      <motion.div
        className="dash-head"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="dash-hello">
          {isWelcome ? "Welcome to Track.AE." : `${greeting()},`} <strong>{firstName || "there"}</strong>.
        </h1>
        <p className="dash-sub">
          {isWelcome
            ? "Let's build your career pipeline."
            : "Here's where your career pipeline stands."}
        </p>
      </motion.div>

      {isWelcome && (
        <motion.div
          className="welcome-banner"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <p>
            YOUR PIPELINE IS EMPTY.
            <span className="welcome-sub">Start tracking your next opportunity.</span>
          </p>
          <Link to="/applications" className="btn btn-primary">
            <ArrowRight size={16} /> View applications
          </Link>
        </motion.div>
      )}

      {loading && !hydrated ? (
        <div className="skel-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="metric-card" key={i}>
              <Skeleton style={{ height: 12, width: "55%" }} />
              <Skeleton style={{ height: 34, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="section">
            <div className="metrics-grid">
              <MetricCard label="Total applications" value={metrics.total} icon={<Send size={15} />} index={0} />
              <MetricCard
                label="Active"
                value={metrics.active}
                icon={<Briefcase size={15} />}
                index={1}
                accent={metrics.active > 0}
              />
              <MetricCard
                label="Interviews"
                value={metrics.interviews}
                icon={<CalendarClock size={15} />}
                index={2}
              />
              <MetricCard label="Offers" value={metrics.offers} icon={<Check size={15} />} index={3} accent={metrics.offers > 0} />
            </div>
            <div className="mini-grid" style={{ marginTop: 14 }}>
              <MetricCard label="This month" value={metrics.thisMonth} index={0} />
              <MetricCard
                label="Follow-ups due"
                value={metrics.followUpsDue}
                index={1}
                accent={metrics.followUpsDue > 0}
                sub={metrics.followUpsDue > 0 ? "Needs your attention" : undefined}
              />
              <MetricCard label="Response rate" value={formatRate(metrics.responseRate)} index={2} />
              <MetricCard label="Interview rate" value={formatRate(metrics.interviewRate)} index={3} />
            </div>
          </div>

          <div className="dash-grid">
            <section className="section">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
                <h2 className="section-label">Applications</h2>
                <Link to="/applications" className="btn btn-ghost btn-sm">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {recent.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Briefcase size={22} />}
                  title="YOUR PIPELINE IS EMPTY."
                  description="Start tracking your next opportunity."
                  action={
                    <Link to="/applications" className="btn btn-ghost btn-sm">
                      View Applications <ArrowRight size={14} />
                    </Link>
                  }
                />
              ) : (
                <div className="apps-list-mobile">
                  {recent.map((job, i) => (
                    <ApplicationCard job={job} index={i} key={job.id} />
                  ))}
                </div>
              )}
              {recent.length > 0 && (
                <div className="hidden-mobile table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Status</th>
                        <th>Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((job) => (
                        <tr className="clickable" key={job.id}>
                          <td>
                            <Link to={`/applications/${job.id}`} className="app-cell-title">
                              <span className="app-cell-company"><strong>{job.company_name}</strong></span>
                              <span className="app-cell-job">{job.job_title}</span>
                            </Link>
                          </td>
                          <td>
                            <Link to={`/applications/${job.id}`}>
                              <StatusBadge status={job.status} />
                            </Link>
                          </td>
                          <td>
                            <Link to={`/applications/${job.id}`} className="muted" style={{ fontSize: 13 }}>
                              {job.next_follow_up_date ? "Scheduled" : "—"}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="dash-side">
            <section className="section">
              <h2 className="section-label" style={{ marginBottom: 14 }}>
                Follow-ups
              </h2>
              <div className="chips chips-wrap" style={{ marginBottom: 14 }} role="tablist">
                {FOLLOWS.map((f) => (
                  <button
                    key={f.key}
                    role="tab"
                    aria-selected={followKey === f.key}
                    className={cn("chip", followKey === f.key && "is-active")}
                    onClick={() => setFollowKey(f.key)}
                  >
                    {f.label}
                    <span className="chip-count">
                      {followUps[f.key].length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="dash-followups">
                {followList.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Check size={20} />}
                    title={followKey === "today" ? "Nothing due today." : "All clear."}
                    description="Follow-ups will surface here automatically when a date approaches."
                  />
                ) : (
                  followList.map((job: Job) => (
                    <FollowUpCard
                      key={job.id}
                      job={job}
                      label={followLabel[followKey]}
                      tone={followTone[followKey]}
                      onMarked={() => undefined}
                    />
                  ))
                )}
                {followList.length > 0 && (
                  <div className="dash-followups-note faint">
                    Showing {followList.length} follow-up
                    {followList.length === 1 ? "" : "s"}.
                  </div>
                )}
              </div>
            </section>

            <section className="section">
              <h2 className="section-label" style={{ marginBottom: 14 }}>
                Upcoming interviews
              </h2>
              {upcomingInterviews.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CalendarClock size={20} />}
                  title="No interviews scheduled."
                  description="Interview events from your applications will surface here."
                />
              ) : (
                <div className="dash-interviews">
                  {upcomingInterviews.map((ev) => {
                    const job = jobs.find((j) => j.id === ev.job_id);
                    return (
                      <Link
                        key={ev.id}
                        to={`/applications/${ev.job_id}`}
                        className="interview-row"
                      >
                        <span className="interview-date">
                          {formatDateLong(ev.event_date)}
                        </span>
                        <span className="interview-company">
                          {job?.company_name ?? "Application"}
                        </span>
                        <span className="interview-title muted">
                          {job?.job_title ?? ev.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}