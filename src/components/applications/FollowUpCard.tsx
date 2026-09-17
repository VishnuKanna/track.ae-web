import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { Job } from "@/types/database";
import { formatDateLong } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useData } from "@/store/DataContext";
import { todayISO } from "@/lib/format";
import { useToast } from "@/store/ToastContext";
import { Check } from "lucide-react";

interface FollowUpCardProps {
  job: Job;
  label: string;
  tone: "overdue" | "today" | "tomorrow" | "upcoming";
  onMarked: (job: Job) => void;
}

export function FollowUpCard({ job, label, tone, onMarked }: FollowUpCardProps) {
  const { updateJob, addEvent } = useData();
  const toast = useToast();

  const markContacted = async () => {
    try {
      await updateJob(
        job.id,
        { last_contact_date: todayISO(), next_follow_up_date: null },
        { skipEvents: true }
      );
      await addEvent(job.id, {
        event_type: "follow_up_sent",
        event_date: todayISO(),
        title: "Follow-up sent",
        description: "Marked as contacted.",
      });
      toast.success("Marked as contacted.");
      onMarked(job);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <motion.div
      className={cn("followup-card", tone === "overdue" && "is-overdue", tone === "today" && "is-due")}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="row gap-3" style={{ justifyContent: "space-between" }}>
        <span
          className={cn(
            "followup-tag",
            (tone === "today" || tone === "overdue") && "series-orange"
          )}
        >
          <span className="dot" aria-hidden />
          {label}
        </span>
        {job.next_follow_up_date && (
          <span className="faint" style={{ fontSize: 12 }}>
            {formatDateLong(job.next_follow_up_date)}
          </span>
        )}
      </div>
      <div className="followup-card-company">{job.company_name}</div>
      <div className="followup-card-title muted">{job.job_title}</div>
      <div className="followup-card-actions">
        <Button variant="secondary" size="sm" onClick={markContacted}>
          <Check size={15} /> Mark as contacted
        </Button>
        <Link to={`/applications/${job.id}`} className="btn btn-ghost btn-sm">
          Open application
        </Link>
      </div>
    </motion.div>
  );
}