import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ClipboardList,
  ExternalLink,
  MapPin,
  NotebookPen,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusMenu } from "@/components/applications/StatusMenu";
import { ApplicationTimeline } from "@/components/applications/ApplicationTimeline";
import { HRContactList } from "@/components/hr/HRContactList";
import { ResumeUploader } from "@/components/resume/ResumeUploader";
import { FollowUpCard } from "@/components/applications/FollowUpCard";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { employmentTypeLabel, STATUS_CONFIG } from "@/config/status";
import type { JobStatusKey } from "@/config/status";
import { formatDateLong, safeUrl } from "@/lib/format";
import { priorityLabel } from "@/config/priority";
import { bucketFollowUps } from "@/lib/filter";
import { todayISO } from "@/lib/format";

export function ApplicationDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { jobs, companyById, updateJob, deleteJob, addEvent } = useData();

  const job = jobs.find((j) => j.id === id) ?? null;
  const [showDelete, setShowDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const company = useMemo(() => (job ? companyById(job.company_id) : null), [job, companyById]);

  const followUp = useMemo(() => {
    if (!job) return null;
    const bucket = bucketFollowUps([job]);
    const order = ["overdue", "today", "tomorrow"] as const;
    for (const k of order) if (bucket[k].length > 0) return { job, tone: k };
    return null;
  }, [job]);

  if (!job) {
    return (
      <EmptyState
        title="APPLICATION NOT FOUND."
        description="It may have been deleted."
        action={
          <Link to="/applications" className="btn btn-primary">
            Back to applications
          </Link>
        }
      />
    );
  }

  const handleDelete = async () => {
    try {
      await deleteJob(job.id);
      toast.success("Application deleted.");
      navigate("/applications");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    }
  };

  const changeStatus = async (status: JobStatusKey) => {
    if (status === job.status) return;
    try {
      await updateJob(job.id, { status });
      await addEvent(job.id, {
        event_type: "status_changed",
        event_date: todayISO(),
        title: `Status changed to ${STATUS_CONFIG[status].label}`,
        description: `Moved from ${STATUS_CONFIG[job.status as JobStatusKey].label}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status.");
    }
  };

  const markContacted = async () => {
    try {
      await updateJob(job.id, { last_contact_date: todayISO() }, { skipEvents: true });
      await addEvent(job.id, {
        event_type: "follow_up_sent",
        event_date: todayISO(),
        title: "Follow-up sent",
        description: "Marked as contacted from application page.",
      });
      toast.success("Marked as contacted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    }
  };

  const jobUrl = safeUrl(job.job_url);

  return (
    <div>
      <Link to="/applications" className="back-link">
        <ArrowLeft size={16} /> Applications
      </Link>

      <div className="detail-head">
        <div className="detail-company">
          <div className="detail-company-box">
            {job.company_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="detail-company-name faint" style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
              {company?.name ?? job.company_name}
            </div>
            <h1 className="detail-title">{job.job_title}</h1>
          </div>
        </div>
        <div className="detail-actions">
          <StatusMenu value={job.status} onChange={changeStatus} />
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> <span className="hidden-mobile">Edit</span>
          </Button>
          <Button variant="ghost" aria-label="Delete" onClick={() => setShowDelete(true)}>
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      <div className="meta-grid">
        <span className="meta-item">
          <StatusBadge status={job.status} />
        </span>
        <span className="meta-item">
          <MapPin size={14} /> {job.location || "Remote / unspecified"}
        </span>
        <span className="meta-item">
          <Calendar size={14} /> {job.application_date ? formatDateLong(job.application_date) : "Not applied yet"}
        </span>
        {job.employment_type && (
          <span className="meta-item">{employmentTypeLabel(job.employment_type)}</span>
        )}
        {(job.salary_min || job.salary_max) && (
          <span className="meta-item">
            {job.salary_currency && `${job.salary_currency} `}
            {job.salary_min && job.salary_max
              ? `${job.salary_min}–${job.salary_max}`
              : job.salary_min || job.salary_max}
          </span>
        )}
        {job.priority && job.priority !== "none" && (
          <span className="meta-item meta-priority">
            <span className="priority-dot" /> {priorityLabel(job.priority)}
          </span>
        )}
      </div>

      {followUp && (
        <div style={{ marginBottom: 22 }}>
          <FollowUpCard
            job={job}
            label={followUp.tone === "overdue" ? "Overdue" : "Due today"}
            tone={followUp.tone}
            onMarked={() => undefined}
          />
          <div style={{ marginTop: 10 }}>
            <Button size="sm" variant="secondary" onClick={markContacted}>
              <Check size={15} /> Already followed up / log contact
            </Button>
          </div>
        </div>
      )}

      <div className="detail-cols">
        <div className="detail-main">
          <section className="section">
            <h2 className="section-label">Notes</h2>
            {job.recruiter_notes ? (
              <p className="notes-text" style={{ whiteSpace: "pre-wrap" }}>{job.recruiter_notes}</p>
            ) : (
              <EmptyState
                compact
                icon={<NotebookPen size={18} />}
                title="No notes yet."
                description="Capture interview prep, salary conversations, or next steps."
                action={
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                    <Pencil size={14} /> Add notes
                  </Button>
                }
              />
            )}
          </section>
          {job.job_description && (
            <section className="section">
              <h2 className="section-label">Job description</h2>
              <p className="notes-text" style={{ whiteSpace: "pre-wrap" }}>{job.job_description}</p>
            </section>
          )}

          <section className="section">
            <h2 className="section-label">Timeline & Events</h2>
            <ApplicationTimeline jobId={job.id} />
          </section>
        </div>

        <div className="detail-side">
          <section className="section">
            <h2 className="section-label">
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <UserRound size={15} /> Contacts
              </div>
            </h2>
            <HRContactList jobId={job.id} />
          </section>

          <section className="section">
            <h2 className="section-label">
              <div className="row" style={{ gap: 8, alignItems: "center" }}><ClipboardList size={15} /> Resume / CV used</div>
            </h2>
            <ResumeUploader jobId={job.id} />
          </section>

          {(jobUrl || job.referral_name) && (
            <section className="section">
              <h2 className="section-label">Source</h2>
              <div className="source-list">
                {jobUrl && (
                  <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="source-item">
                    <ExternalLink size={14} /> Posting link
                  </a>
                )}
                {job.referral_name && (
                  <span className="source-item">
                    <UserRound size={14} /> Referred by {job.referral_name}
                  </span>
                )}
              </div>
            </section>
          )}

          {company && (
            <Link to={`/companies/${company.id}`} className="btn btn-ghost btn-block">
              <Building2 size={15} /> View {company.name}
            </Link>
          )}
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete this application?"
          description={`This removes "${job.job_title}" at ${job.company_name} and all its events. This cannot be undone.`}
          confirmLabel="Delete application"
          tone="danger"
          onCancel={() => setShowDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      {editOpen && (
        <ApplicationForm
          open={editOpen}
          onClose={() => setEditOpen(false)}
          job={job}
          onDeleted={() => navigate("/applications")}
        />
      )}
    </div>
  );
}