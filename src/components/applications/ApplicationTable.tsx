import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  MapPin,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import type { Job } from "@/types/database";
import { StatusMenu } from "@/components/applications/StatusMenu";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { formatDate, followUpStatus } from "@/lib/format";
import { isHighPriority } from "@/config/priority";
import { employmentTypeLabel } from "@/config/status";
import type { JobStatusKey } from "@/config/status";
import { initials } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

interface ApplicationTableProps {
  jobs: Job[];
  onStatusChange: (job: Job, status: JobStatusKey) => void;
}

/**
 * Shared 3-dot action menu for table rows. Used by both the desktop table and
 * the mobile stacked rows so Edit opens the exact same ApplicationForm used by
 * the Cards view, and Delete goes through the canonical deleteJob path.
 */
function RowActions({ job }: { job: Job }) {
  const { deleteJob } = useData();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  return (
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
          <div className="card-menu" role="menu" onClick={(e) => e.stopPropagation()}>
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

      {editOpen && (
        <ApplicationForm open={editOpen} job={job} onClose={() => setEditOpen(false)} />
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
    </div>
  );
}

/**
 * Application rows in a single view — desktop uses a conventional table,
 * mobile (<= 768px) gets stacked responsive cards. Both consume the exact same
 * `jobs` array and `onStatusChange` handler as the Cards view, so a status
 * change from here is immediately reflected in Cards and Details.
 */
export function ApplicationTable({ jobs, onStatusChange }: ApplicationTableProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* DESKTOP / TABLET TABLE (hidden <= 768px) */}
      <div className="table-wrap hidden-mobile">
        <table className="data-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Status</th>
              <th>Location</th>
              <th>Applied</th>
              <th>Follow-up</th>
              <th className="cell-source">Source</th>
              <th className="app-cell-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, i) => {
              const fu = followUpStatus(job.next_follow_up_date);
              const high = isHighPriority(job.priority);
              return (
                <motion.tr
                  key={job.id}
                  className="clickable"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }}
                  onClick={() => navigate(`/applications/${job.id}`)}
                >
                  <td>
                    <div className="app-cell-title">
                      <span className="app-cell-company">
                        {high && <span className="priority-dot" />}
                        <strong>{job.company_name}</strong>
                      </span>
                      <span className="app-cell-job">{job.job_title}</span>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusMenu
                      value={job.status}
                      size="sm"
                      onChange={(status) => onStatusChange(job, status)}
                    />
                  </td>
                  <td>
                    {job.location ? (
                      <span className="row gap-2 muted">
                        <MapPin size={13} /> {job.location}
                      </span>
                    ) : (
                      <span className="faint">—</span>
                    )}
                  </td>
                  <td className="muted">{formatDate(job.application_date)}</td>
                  <td>
                    <span
                      className={cn(
                        "app-cell-followup",
                        (fu.state === "today" || fu.state === "overdue") && "is-due"
                      )}
                    >
                      <span className="followup-dot" />
                      {fu.label}
                    </span>
                  </td>
                  <td className="muted cell-source">{job.source || "—"}</td>
                  <td
                    className="app-cell-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions job={job} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE STACKED ROWS (shown <= 768px) */}
      <div className="mobile-table-rows">
        {jobs.map((job, i) => {
          const fu = followUpStatus(job.next_follow_up_date);
          const high = isHighPriority(job.priority);
          const due = fu.state === "today" || fu.state === "overdue";
          const empType = job.employment_type
            ? employmentTypeLabel(job.employment_type)
            : "";
          return (
            <motion.article
              key={job.id}
              className="mobile-app-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.04, 0.3) }}
              onClick={() => navigate(`/applications/${job.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/applications/${job.id}`);
              }}
            >
              <div className="mobile-row-top">
                <span className="company-avatar">{initials(job.company_name)}</span>
                <div className="mobile-row-company-text">
                  <span className="mobile-row-company-name">{job.company_name}</span>
                  <span className="mobile-row-company-meta faint">
                    {job.location || "Location not set"}
                  </span>
                </div>
                <div
                  className="mobile-row-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions job={job} />
                </div>
              </div>

              <div className="mobile-row-job">
                {high && <span className="priority-dot" aria-label="High priority" />}
                {job.job_title}
              </div>

              <div
                className="mobile-row-status"
                onClick={(e) => e.stopPropagation()}
              >
                <StatusMenu
                  value={job.status}
                  size="sm"
                  align="left"
                  onChange={(status) => onStatusChange(job, status)}
                />
              </div>

              <div className="mobile-row-meta">
                <span className="mobile-meta-item">
                  <MapPin size={13} /> {job.location || "Location not set"}
                </span>
                {job.application_date && (
                  <span className="mobile-meta-item">
                    <CalendarDays size={13} /> Applied {formatDate(job.application_date)}
                  </span>
                )}
                {empType && (
                  <span className="mobile-meta-item">
                    <Briefcase size={13} /> {empType}
                  </span>
                )}
                {job.source && (
                  <span className="mobile-meta-item">
                    <Share2 size={13} /> {job.source}
                  </span>
                )}
              </div>

              {job.next_follow_up_date && (
                <span
                  className={cn("app-cell-followup", due && "is-due")}
                  style={{ alignSelf: "flex-start" }}
                >
                  <span className="followup-dot" />
                  {fu.label}
                </span>
              )}

              <button
                type="button"
                className="mobile-row-view"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/applications/${job.id}`);
                }}
              >
                View details <ArrowRight size={14} />
              </button>
            </motion.article>
          );
        })}
      </div>
    </>
  );
}