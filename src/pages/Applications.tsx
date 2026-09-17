import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Briefcase,
  Check,
  CalendarClock,
  Plus,
  LayoutGrid,
  Rows3,
  Send,
} from "lucide-react";
import { useData } from "@/store/DataContext";
import { useUIState } from "@/store/UIStateContext";
import { filterJobs } from "@/lib/filter";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { ApplicationTable } from "@/components/applications/ApplicationTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { JobStatusKey } from "@/config/status";
import { STATUS_CONFIG, STATUS_KEYS, statusByKey } from "@/config/status";
import { useToast } from "@/store/ToastContext";
import { cn } from "@/lib/cn";
import type { HRContact } from "@/types/database";

type AppView = "cards" | "table";

export function Applications() {
  const { jobs, hrContacts, loading, hydrated, updateJob, addEvent } = useData();
  const { openAdd } = useUIState();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [view, setView] = useState<AppView>("cards");
  const [sortKey, setSortKey] = useState("created");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const statusFilter = (params.get("status") ?? "all") as JobStatusKey | "all";
  const companyFilter = params.get("company") ?? "all";

  const setStatus = (status: string) => {
    if (status === "all") params.delete("status");
    else params.set("status", status);
    setParams(params, { replace: true });
  };
  const setCompany = (company: string) => {
    if (company === "all") params.delete("company");
    else params.set("company", company);
    setParams(params, { replace: true });
  };

  const metrics = useMemo(
    () => ({
      total: jobs.length,
      applied: jobs.filter((j) => j.status === "applied").length,
      interview: jobs.filter((j) => j.status === "interview").length,
      offer: jobs.filter((j) => j.status === "offer").length,
    }),
    [jobs]
  );

  const companies = useMemo(
    () => [...new Set(jobs.map((j) => j.company_name))].sort(),
    [jobs]
  );

  const contactsByJob = useMemo(() => {
    const map: Record<string, HRContact[]> = {};
    for (const c of hrContacts) {
      (map[c.job_id] ||= []).push(c);
    }
    return map;
  }, [hrContacts]);

  const filtered = useMemo(() => {
    const list = filterJobs(
      jobs,
      query,
      {
        status: statusFilter,
        company: companyFilter,
        location: "",
        priority: "all",
      },
      contactsByJob
    );
    return [...list].sort((a, b) => {
      const fa = sortKey === "date" ? a.application_date ?? "" : a.created_at ?? "";
      const fb = sortKey === "date" ? b.application_date ?? "" : b.created_at ?? "";
      let cmp = 0;
      if (sortKey === "company") cmp = a.company_name.localeCompare(b.company_name);
      else if (sortKey === "job") cmp = a.job_title.localeCompare(b.job_title);
      else cmp = fa.localeCompare(fb);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [jobs, query, statusFilter, companyFilter, sortKey, sortDir, contactsByJob]);

  const next = useMemo(
    () => filtered.find((j) => statusByKey(j.status).stage < 5) ?? null,
    [filtered]
  );

  const onStatusChange = async (
    job: Parameters<typeof ApplicationTable>[0]["jobs"][number],
    status: JobStatusKey
  ) => {
    const prev = job.status;
    if (prev === status) return;
    try {
      await updateJob(job.id, { status });
      await addEvent(job.id, {
        event_type: "status_changed",
        event_date: new Date().toISOString().slice(0, 10),
        title: `Status changed to ${STATUS_CONFIG[status].label}`,
        description: `Moved from ${statusByKey(prev).label}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-sub">
            Track your job applications and stay on top of your career journey.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> <span className="hidden-mobile">Add Application</span>
          <span className="hidden-desktop">Add</span>
        </Button>
      </div>

      <div className="metrics-grid apps-metrics">
        <MetricCard
          label="Total"
          value={metrics.total}
          icon={<Send size={15} />}
          index={0}
        />
        <MetricCard
          label="Applied"
          value={metrics.applied}
          icon={<Briefcase size={15} />}
          index={1}
        />
        <MetricCard
          label="Interview"
          value={metrics.interview}
          icon={<CalendarClock size={15} />}
          index={2}
          accent={metrics.interview > 0}
        />
        <MetricCard
          label="Offer"
          value={metrics.offer}
          icon={<Check size={15} />}
          index={3}
          accent={metrics.offer > 0}
        />
      </div>

      <div className="apps-search">
        <SearchInput
          value={query}
          onSearch={setQuery}
          placeholder="Search by company, job title, location..."
          aria-label="Search applications"
        />
      </div>

      <div className="apps-filterbar">
        <div className="chips apps-status-chips">
          <button
            className={cn("chip", statusFilter === "all" && "is-active")}
            onClick={() => setStatus("all")}
          >
            All
          </button>
          {STATUS_KEYS.map((key) => (
            <button
              key={key}
              className={cn("chip", statusFilter === key && "is-active")}
              onClick={() => setStatus(key)}
            >
              {STATUS_CONFIG[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="apps-controls">
        <div className="row gap-2" style={{ flexWrap: "wrap" }}>
          <Select
            aria-label="Company filter"
            value={companyFilter}
            onChange={(e) => setCompany(e.target.value)}
            className="filter-select"
          >
            <option value="all">All companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort"
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":");
              setSortKey(k);
              setSortDir(d as "desc" | "asc");
            }}
            className="filter-select"
          >
            <option value="created:desc">Newest first</option>
            <option value="created:asc">Oldest first</option>
            <option value="company:asc">Company A→Z</option>
            <option value="job:asc">Job title A→Z</option>
            <option value="date:desc">Application date</option>
          </Select>
        </div>

        <div className="view-toggle">
          <button
            className={cn("view-toggle-btn", view === "cards" && "is-active")}
            onClick={() => setView("cards")}
            aria-label="Card view"
          >
            <LayoutGrid size={15} /> Cards
          </button>
          <button
            className={cn("view-toggle-btn", view === "table" && "is-active")}
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <Rows3 size={15} /> Table
          </button>
        </div>
      </div>

      <div className="apps-count" style={{ marginBottom: 14 }}>
        {filtered.length} {filtered.length === 1 ? "application" : "applications"}
        {statusFilter !== "all" && (
          <>
            {" "}
            in <StatusBadge status={statusFilter as JobStatusKey} />
          </>
        )}
      </div>

      {loading && !hydrated ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="panel" key={i}>
              <Skeleton style={{ height: 12, width: "45%" }} />
              <Skeleton style={{ height: 20, width: "70%" }} />
              <Skeleton style={{ height: 12, width: "55%" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={26} />}
          title="NO APPLICATIONS FOUND."
          description={
            jobs.length === 0
              ? "Start tracking your career pipeline."
              : "No applications match the current filters."
          }
          action={
            <Button onClick={openAdd}>
              <Plus size={16} /> Add Application
            </Button>
          }
        />
      ) : (
        <>
          {view === "cards" && (
            <div className="grid apps-grid">
              {filtered.map((job, i) => (
                <ApplicationCard job={job} index={i} key={job.id} />
              ))}
            </div>
          )}
          {view === "table" && (
            <ApplicationTable jobs={filtered} onStatusChange={onStatusChange} />
          )}
        </>
      )}

      {filtered.length > 0 && next && (
        <Link to={`/applications/${next.id}`} className="skip-nav hint-link">
          Jump to next action: {next.company_name} — {next.job_title} →
        </Link>
      )}
    </div>
  );
}
