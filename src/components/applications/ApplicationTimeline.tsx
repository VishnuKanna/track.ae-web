import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { History, Plus, Trash2 } from "lucide-react";
import type { JobEvent } from "@/types/database";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { formatDateLong } from "@/lib/format";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

const EVENT_TYPES = [
  { value: "application_submitted", label: "Application submitted" },
  { value: "application_saved", label: "Application saved" },
  { value: "referral_received", label: "Referral received" },
  { value: "recruiter_contacted", label: "Recruiter contacted" },
  { value: "follow_up_sent", label: "Follow-up sent" },
  { value: "interview_scheduled", label: "Interview scheduled" },
  { value: "interview_completed", label: "Interview completed" },
  { value: "status_changed", label: "Status changed" },
  { value: "offer_received", label: "Offer received" },
  { value: "other", label: "Other" },
];

interface ApplicationTimelineProps {
  jobId: string;
}

export function ApplicationTimeline({ jobId }: ApplicationTimelineProps) {
  const { eventsForJob, addEvent, deleteEvent } = useData();
  const toast = useToast();
  const events = eventsForJob(jobId);

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("recruiter_contacted");
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<JobEvent | null>(null);

  const labelFor = (t: string) =>
    EVENT_TYPES.find((e) => e.value === t)?.label ?? title;

  const submit = async () => {
    setBusy(true);
    try {
      await addEvent(jobId, {
        event_type: type,
        event_date: date,
        title: title.trim() || labelFor(type),
        description: desc.trim() || undefined,
      });
      setTitle("");
      setDesc("");
      setAdding(false);
      toast.success("Timeline event added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="timeline-wrap">
      {events.length === 0 && !adding ? (
        <EmptyState
          compact
          icon={<History size={20} />}
          title="No timeline yet"
          description="Record interviews, follow-ups, and milestones as they happen."
          action={
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Plus size={15} /> Add event
            </Button>
          }
        />
      ) : (
        <div className="timeline">
          {events.map((ev, i) => (
            <motion.div
              className="tl-item"
              key={ev.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.35) }}
            >
              <span
                className={cn(
                  "tl-dot",
                  ev.event_type === "interview_scheduled" && "is-active"
                )}
              />
              <div className="tl-date row" style={{ justifyContent: "space-between" }}>
                {formatDateLong(ev.event_date)}
                <IconButton
                  label="Delete event"
                  onClick={() => setDeleting(ev)}
                  className="tl-delete"
                >
                  <Trash2 size={13} />
                </IconButton>
              </div>
              <div className="tl-title">{ev.title}</div>
              {ev.description && <div className="tl-desc">{ev.description}</div>}
            </motion.div>
          ))}
        </div>
      )}

      {adding && (
        <motion.div
          className="event-editor"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="form-grid-2">
            <Field label="Event type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Title (optional)">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom title" />
          </Field>
          <Field label="Notes">
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Details about this event…" />
          </Field>
          <div className="form-actions">
            <Button variant="secondary" size="sm" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={submit} loading={busy} loadingLabel="Adding…">
              Add Event
            </Button>
          </div>
        </motion.div>
      )}

      {events.length > 0 && !adding && (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
          <Plus size={15} /> Add event
        </Button>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this event?"
        description={deleting ? `"${deleting.title}" will be removed from the timeline.` : undefined}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteEvent(deleting.id);
            toast.success("Event deleted.");
            setDeleting(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete event.");
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}