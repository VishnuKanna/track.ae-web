import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import type { Job, HRContact } from "@/types/database";
import { StatusMenu } from "@/components/applications/StatusMenu";
import { formatDate, followUpStatus } from "@/lib/format";
import { isHighPriority } from "@/config/priority";
import type { JobStatusKey } from "@/config/status";
import { cn } from "@/lib/cn";

interface ApplicationTableProps {
  jobs: Job[];
  onStatusChange: (job: Job, status: JobStatusKey) => void;
}

export function ApplicationTable({ jobs, onStatusChange }: ApplicationTableProps) {
  const navigate = useNavigate();

  return (
    <div className="table-wrap hidden-mobile">
      <table className="data-table">
        <thead>
          <tr>
            <th>Application</th>
            <th>Status</th>
            <th>Location</th>
            <th>Applied</th>
            <th>Follow-up</th>
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
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}