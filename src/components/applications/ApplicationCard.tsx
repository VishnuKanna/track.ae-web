import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Job } from "@/types/database";
import { StatusMenu } from "@/components/applications/StatusMenu";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { employmentTypeLabel } from "@/config/status";
import type { JobStatusKey } from "@/config/status";
import { formatDate, followUpStatus } from "@/lib/format";
import { isHighPriority } from "@/config/priority";
import { initials } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

interface ApplicationCardProps {
  job: Job;
  index?: number;
}

export function ApplicationCard({ job, index = 0 }: ApplicationCardProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { updateJob, deleteJob } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const followUp = followUpStatus(job.next_follow_up_date);
  const high = isHighPriority(job.priority);
  const due = followUp.state === "today" || followUp.state === "overdue";

  const changeStatus = async (status: JobStatusKey) => {
    if (status === job.status) return;
    try {
      // updateJob records the status_changed timeline event itself — do not add
      // a second one here or every change would appear twice in the timeline.
      await updateJob(job.id, { status });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update application. Please try again."
      );
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteJob(job.id);
      toast.success("Application deleted.");
      setConfirmDelete(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete application.");
    } finally {
      setDeleting(false);
    }
  };

  const tags = [
    job.employment_type ? employmentTypeLabel(job.employment_type) : "",
    job.source ?? "",
  ].filter(Boolean);

  return (
    <>
      <motion.article
        className="app-card-new"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.04, 0.3) }}
        onClick={() => navigate(`/applications/${job.id}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") navigate(`/applications/${job.id}`);
        }}
      >
        <div className="app-card-new-top">
          <div className="app-card-company-block">
            <span className="company-avatar">{initials(job.company_name)}</span>
            <div className="app-card-company-text">
              <span className="app-card-company-name">{job.company_name}</span>
              <span className="app-card-company-meta faint">
                {job.location || "Location not set"}
              </span>
            </div>
          </div>

          <div
            className="app-card-actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <StatusMenu value={job.status} size="sm" align="right" onChange={changeStatus} />
            <div className="card-menu-wrap">
              <button
                type="button"
                className="card-menu-trigger"
                aria-label="Application actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="card-menu-backdrop"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    className="card-menu"
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="is-danger"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        setConfirmDelete(true);
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <h3 className="app-card-job">
          {high && <span className="priority-dot" aria-label="High priority" />}
          {job.job_title}
        </h3>

        <div className="app-card-new-meta">
          {job.location && (
            <span className="app-card-loc">
              <MapPin size={13} /> {job.location}
            </span>
          )}
          {job.application_date && (
            <span className="app-card-date">
              <CalendarDays size={13} /> Applied {formatDate(job.application_date)}
            </span>
          )}
          {job.next_follow_up_date && (
            <span className={cn("app-card-followup", due && "is-due")}>
              <span className="followup-dot" />
              {followUp.label}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="app-card-tags">
            {tags.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="app-card-open">
          View details <ArrowRight size={14} />
        </div>
      </motion.article>

      {editOpen && (
        <ApplicationForm
          open={editOpen}
          job={job}
          onClose={() => setEditOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete application?"
        description="Are you sure you want to delete this application? This action cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}
