import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, History, Plus, Trash2 } from "lucide-react";
import type { Job, JobEvent } from "@/types/database";
import { useData } from "@/store/DataContext";
import { useToast } from "@/store/ToastContext";
import { formatDateLong, todayISO } from "@/lib/format";
import { statusByKey } from "@/config/status";
import type { JobStatusKey } from "@/config/status";
import { EVENT_SECTIONS, eventTypeMeta } from "@/config/events";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

/** Event types that also offer to move the application status. */
const STATUS_FOR_EVENT: Partial<Record<string, JobStatusKey>> = {
  waiting_for_offer: "waiting_for_offer",
  offer_received: "offer",
  offer_accepted: "offer",
  rejected: "rejected",
  withdrawn: "withdrawn",
};

interface ApplicationTimelineProps {
  jobId: string;
  job?: Job | null;
}

export function ApplicationTimeline({ jobId, job }: ApplicationTimelineProps) {
  const { eventsForJob, addEvent, deleteEvent, updateJob } = useData();
  const toast = useToast();
  const events = eventsForJob(jobId);

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("recruiter_contacted");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [round, setRound] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [logContact, setLogContact] = useState(true);
  const [applyStatus, setApplyStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<JobEvent | null>(null);

  const meta = useMemo(() => eventTypeMeta(type), [type]);
  const statusForEvent = STATUS_FOR_EVENT[type];

  const openSheet = () => {
    setType("recruiter_contacted");
    setDate(todayISO());
    setTime("");
    setRound("");
    setTitle("");
    setDesc("");
    setLogContact(true);
    setApplyStatus(false);
    setAdding(true);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addEvent(jobId, {
        event_type: type,
        event_date: date,
        event_time: time.trim() || null,
        title: title.trim() || meta.label,
        description: desc.trim() || undefined,
        round: meta.round ? round.trim() || null : null,
      });

      if (meta.followUp && logContact) {
        await updateJob(jobId, { last_contact_date: date }, { skipEvents: true });
      }
      if (statusForEvent && applyStatus && job?.status !== statusForEvent) {
        await updateJob(jobId, { status: statusForEvent });
      }

      setAdding(false);
      toast.success("Event added.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to add event. Please try again."
      );
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
            <Button size="sm" variant="secondary" onClick={openSheet}>
              <Plus size={15} /> Add event
            </Button>
          }
        />
      ) : (
        <div className="timeline">
          {events.map((ev, i) => {
            const EventIcon = eventTypeMeta(ev.event_type).icon;
            const isInterview = /interview|offer|round/i.test(
              `${ev.event_type} ${ev.title}`
            );
            const hasStatus =
              ev.previous_status != null && ev.new_status != null;
            return (
              <motion.div
                className="tl-item"
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.35) }}
              >
                <span className={cn("tl-dot", isInterview && "is-active")} />
                <div className="tl-date row" style={{ justifyContent: "space-between" }}>
                  <span className="tl-when">
                    <EventIcon size={13} aria-hidden className="tl-icon" />
                    {formatDateLong(ev.event_date)}
                    {ev.event_time && <span className="tl-time"> · {ev.event_time}</span>}
                  </span>
                  <IconButton
                    label="Delete event"
                    onClick={() => setDeleting(ev)}
                    className="tl-delete"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
                <div className="tl-title">
                  {ev.title}
                  {ev.round && <span className="tl-round">Round {ev.round}</span>}
                </div>
                {hasStatus && (
                  <div className="tl-status-change">
                    {statusByKey(ev.previous_status).label}
                    <span aria-hidden> → </span>
                    {statusByKey(ev.new_status).label}
                  </div>
                )}
                {ev.description && <div className="tl-desc">{ev.description}</div>}
              </motion.div>
            );
          })}
        </div>
      )}

      {events.length > 0 && !adding && (
        <Button variant="ghost" size="sm" onClick={openSheet} style={{ marginTop: 8 }}>
          <Plus size={15} /> Add event
        </Button>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this event?"
        description={
          deleting
            ? `"${deleting.title}" will be removed from the timeline. The application status is not affected.`
            : undefined
        }
        onConfirm={async () => {
          if (!deleting) return;
          try {
            // Deleting a timeline event never changes the application status.
            await deleteEvent(deleting.id);
            toast.success("Event deleted.");
            setDeleting(null);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Unable to delete event. Please try again."
            );
          }
        }}
        onCancel={() => setDeleting(null)}
      />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add event" size="md">
        <div className="event-sheet">
          <div className="event-sheet-groups">
            {EVENT_SECTIONS.map((section) => (
              <div className="event-group" key={section.id}>
                <div className="event-group-label">{section.label}</div>
                <div className="event-group-items">
                  {section.types.map((t) => {
                    const Icon = t.icon;
                    const selected = t.value === type;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        className={cn("event-type-row", selected && "is-selected")}
                        onClick={() => setType(t.value)}
                      >
                        <span className="event-type-icon">
                          <Icon size={16} />
                        </span>
                        <span className="event-type-text">
                          <span className="event-type-name">{t.label}</span>
                          {t.description && (
                            <span className="event-type-desc">{t.description}</span>
                          )}
                        </span>
                        {selected && <Check size={16} className="event-type-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="event-sheet-fields">
            <div className="form-grid-2">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Time (optional)">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>

            {meta.round && (
              <Field label="Round (optional)" hint="e.g. 1, 2, HR, Technical">
                <Input
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  placeholder="1"
                />
              </Field>
            )}

            <Field label="Title (optional)">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={meta.label}
              />
            </Field>
            <Field label="Notes (optional)">
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Details about this event…"
              />
            </Field>

            {meta.followUp && (
              <label className="event-check">
                <input
                  type="checkbox"
                  checked={logContact}
                  onChange={(e) => setLogContact(e.target.checked)}
                />
                <span>Also set last contact date to this date</span>
              </label>
            )}

            {statusForEvent && (
              <label className="event-check">
                <input
                  type="checkbox"
                  checked={applyStatus}
                  onChange={(e) => setApplyStatus(e.target.checked)}
                />
                <span>
                  Also set status to {statusByKey(statusForEvent).label}
                </span>
              </label>
            )}
          </div>

          <div className="form-actions event-sheet-actions">
            <Button variant="secondary" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} loading={busy} loadingLabel="Saving…">
              Save Event
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
