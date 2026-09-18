import type { LucideIcon } from "lucide-react";
import {
  Award,
  Ban,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
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
  XCircle,
} from "lucide-react";

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
        value: "documents_sent",
        label: "Documents sent",
        description: "Resume, portfolio, or documents were shared.",
        icon: FileText,
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
        description: "You reached out to a recruiter.",
        icon: Mail,
      },
      {
        value: "recruiter_screen_scheduled",
        label: "Recruiter screen scheduled",
        description: "A screening call was booked.",
        icon: PhoneCall,
      },
      {
        value: "recruiter_screen_completed",
        label: "Recruiter screen completed",
        description: "The screening call happened.",
        icon: PhoneCall,
      },
      {
        value: "follow_up_sent",
        label: "Follow-up sent",
        description: "You followed up. Optionally logs contact.",
        icon: Send,
        followUp: true,
      },
      {
        value: "assessment_received",
        label: "Assessment received",
        description: "A task or assessment was assigned.",
        icon: ClipboardList,
      },
      {
        value: "assessment_completed",
        label: "Assessment completed",
        description: "You submitted the task or assessment.",
        icon: ClipboardList,
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
        round: true,
      },
      {
        value: "interview_completed",
        label: "Interview completed",
        description: "You attended an interview round.",
        icon: CheckCircle2,
        round: true,
      },
      {
        value: "moved_to_next_round",
        label: "Moved to next round",
        description: "Progressed to the next interview stage.",
        icon: Flag,
        round: true,
      },
      {
        value: "interview_cancelled",
        label: "Interview cancelled",
        description: "An interview round was cancelled.",
        icon: XCircle,
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
        value: "note_added",
        label: "Note added",
        description: "A general note or update.",
        icon: MessageSquare,
      },
      {
        value: "status_changed",
        label: "Status changed",
        description: "The application status changed.",
        icon: Flag,
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

export const ALL_EVENT_TYPES: EventTypeMeta[] = EVENT_SECTIONS.flatMap(
  (s) => s.types
);

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
