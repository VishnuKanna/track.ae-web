import type { LucideIcon } from "lucide-react";
import {
  Award,
  Ban,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  FileText,
  Flag,
  Hourglass,
  Mail,
  MessageSquare,
  MinusCircle,
  PhoneCall,
  Send,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import type { JobStatusKey } from "@/config/status";

export interface EventTypeMeta {
  value: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Event types that represent an interview round and can carry a round label. */
  round?: boolean;
  /** Event types that represent a follow-up and can update last_contact_date. */
  followUp?: boolean;
}

export interface EventSection {
  id: string;
  label: string;
  types: EventTypeMeta[];
}

export const EVENT_SECTIONS: EventSection[] = [
  {
    id: "application",
    label: "APPLICATION",
    types: [
      {
        value: "application_submitted",
        label: "Application submitted",
        description: "Sent the application to the company.",
        icon: Send,
      },
      {
        value: "application_saved",
        label: "Application saved",
        description: "Saved this role to review later.",
        icon: Bookmark,
      },
      {
        value: "referral_received",
        label: "Referral received",
        description: "Someone referred you for this role.",
        icon: UserCheck,
      },
    ],
  },
  {
    id: "recruitment",
    label: "RECRUITMENT",
    types: [
      {
        value: "recruiter_contacted",
        label: "Recruiter contacted",
        description: "You reached out to or spoke with a recruiter.",
        icon: Mail,
      },
      {
        value: "follow_up_sent",
        label: "Follow-up sent",
        description: "You followed up. Optionally logs contact.",
        icon: Send,
        followUp: true,
      },
      {
        value: "hr_requested_documents",
        label: "HR requested documents",
        description: "HR asked for documents or details.",
        icon: ClipboardList,
      },
      {
        value: "documents_submitted",
        label: "Documents submitted",
        description: "You sent the requested documents.",
        icon: FileCheck,
      },
    ],
  },
  {
    id: "interview",
    label: "INTERVIEW",
    types: [
      {
        value: "interview_scheduled",
        label: "Interview scheduled",
        description: "An interview round was booked.",
        icon: CalendarClock,
      },
      {
        value: "interview_completed",
        label: "Interview completed",
        description: "You attended an interview round.",
        icon: CheckCircle2,
      },
      {
        value: "technical_round",
        label: "Technical Round",
        description: "A technical interview round.",
        icon: ClipboardCheck,
        round: true,
      },
      {
        value: "managerial_round",
        label: "Managerial Round",
        description: "A managerial interview round.",
        icon: Users,
        round: true,
      },
      {
        value: "final_round",
        label: "Final Round",
        description: "The final interview round.",
        icon: Flag,
        round: true,
      },
      {
        value: "moved_to_next_round",
        label: "Moved to next round",
        description: "Progressed to the next interview stage.",
        icon: Flag,
        round: true,
      },
    ],
  },
  {
    id: "offer",
    label: "OFFER",
    types: [
      {
        value: "waiting_for_offer",
        label: "Waiting for offer",
        description: "Interviews finished — awaiting a decision.",
        icon: Hourglass,
      },
      {
        value: "offer_received",
        label: "Offer received",
        description: "A formal offer arrived.",
        icon: Award,
      },
      {
        value: "offer_accepted",
        label: "Offer accepted",
        description: "You accepted the offer.",
        icon: ThumbsUp,
      },
      {
        value: "offer_declined",
        label: "Offer declined",
        description: "You declined the offer.",
        icon: ThumbsDown,
      },
    ],
  },
  {
    id: "outcome",
    label: "OUTCOME",
    types: [
      {
        value: "rejected",
        label: "Rejected",
        description: "The application was rejected.",
        icon: Ban,
      },
      {
        value: "withdrawn",
        label: "Withdrawn",
        description: "You withdrew from the process.",
        icon: MinusCircle,
      },
    ],
  },
  {
    id: "other",
    label: "OTHER",
    types: [
      {
        value: "assessment_sent",
        label: "Assessment sent",
        description: "A task or assessment was assigned.",
        icon: ClipboardList,
      },
      {
        value: "assessment_completed",
        label: "Assessment completed",
        description: "You submitted the task or assessment.",
        icon: ClipboardCheck,
      },
      {
        value: "joining_date_discussed",
        label: "Joining date discussed",
        description: "A start date was discussed.",
        icon: CalendarClock,
      },
      {
        value: "salary_discussed",
        label: "Salary discussed",
        description: "Compensation was discussed.",
        icon: MessageSquare,
      },
      {
        value: "other",
        label: "Other",
        description: "Anything else worth recording.",
        icon: MessageSquare,
      },
    ],
  },
];

/**
 * THE single source of truth for Event → Status synchronization.
 *
 * When an event type is present here, recording it advances the application to
 * the mapped status (unless it is already in that status). Event types that are
 * not listed — follow-ups, assessments, document requests, individual interview
 * rounds — never change the status on their own. "Moved to next round" maps to
 * the existing `interview` status so it records progression instead of inventing
 * a fake "Interview Round 2" status.
 *
 * Do NOT duplicate this mapping anywhere else.
 */
export const EVENT_STATUS_MAP: Partial<Record<string, JobStatusKey>> = {
  application_submitted: "applied",
  application_saved: "saved",
  recruiter_contacted: "recruiter_screen",
  interview_scheduled: "interview",
  interview_completed: "interview",
  moved_to_next_round: "interview",
  waiting_for_offer: "waiting_for_offer",
  offer_received: "offer",
  offer_accepted: "offer",
  offer_declined: "offer",
  rejected: "rejected",
  withdrawn: "withdrawn",
};

/** The status an event moves the application to, or undefined if it is neutral. */
export const eventStatusFor = (
  value: string | null | undefined
): JobStatusKey | undefined =>
  value ? EVENT_STATUS_MAP[value] : undefined;

/**
 * Event types that are no longer offered in the picker but can still exist in
 * historical rows. Kept here so the timeline can render them with the right
 * label and icon (never deleted, never rewritten).
 */
const LEGACY_EVENT_TYPES: EventTypeMeta[] = [
  { value: "status_changed", label: "Status changed", icon: Flag },
  { value: "note_added", label: "Note added", icon: MessageSquare },
  { value: "documents_sent", label: "Documents sent", icon: FileText },
  {
    value: "recruiter_screen_scheduled",
    label: "Recruiter screen scheduled",
    icon: PhoneCall,
  },
  {
    value: "recruiter_screen_completed",
    label: "Recruiter screen completed",
    icon: PhoneCall,
  },
  {
    value: "assessment_received",
    label: "Assessment received",
    icon: ClipboardList,
  },
  { value: "interview_cancelled", label: "Interview cancelled", icon: XCircle },
];

export const ALL_EVENT_TYPES: EventTypeMeta[] = [
  ...EVENT_SECTIONS.flatMap((s) => s.types),
  ...LEGACY_EVENT_TYPES,
];

const EVENT_TYPE_BY_VALUE = new Map(ALL_EVENT_TYPES.map((e) => [e.value, e]));

export function eventTypeMeta(value: string | null | undefined): EventTypeMeta {
  if (value && EVENT_TYPE_BY_VALUE.has(value)) {
    return EVENT_TYPE_BY_VALUE.get(value)!;
  }
  return {
    value: value ?? "other",
    label: value ? value.replace(/_/g, " ") : "Event",
    icon: MessageSquare,
  };
}

export const eventTypeLabel = (value: string | null | undefined): string =>
  eventTypeMeta(value).label;
