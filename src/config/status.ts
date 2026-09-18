/**
 * THE single source of truth for application statuses.
 *
 * Every status control (card dropdown, table dropdown, detail dropdown, edit
 * form, filters, analytics) reads from STATUS_KEYS / STATUS_CONFIG / statusByKey
 * here. Never hard-code a status label or key anywhere else.
 *
 * The stored database values remain stable snake_case keys (the `jobs.status`
 * column is free text), so existing rows are never rewritten. `normalizeStatus`
 * maps legacy/display-style values onto these keys for safe reads.
 */
export type JobStatusKey =
  | "saved"
  | "applied"
  | "recruiter_screen"
  | "interview"
  | "moved_to_next_round"
  | "waiting_for_offer"
  | "offer"
  | "rejected"
  | "withdrawn";

export type StatusTone =
  | "neutral"
  | "gray"
  | "blue"
  | "purple"
  | "orange"
  | "amber"
  | "green"
  | "red";

export interface StatusConfig {
  key: JobStatusKey;
  /** Exact, user-facing label. Use this everywhere — never a local string. */
  label: string;
  tone: StatusTone;
  semantic: string;
  stage: number;
}

/**
 * Ordered exactly as the user sees them in the dropdown and filter chips.
 *
 * Exactly eight canonical statuses. "Withdrawn" is intentionally NOT here: it is
 * kept only in STATUS_CONFIG / STATUS_ALIASES so legacy rows keep rendering, but
 * it must never be offered as a pickable status anywhere in the UI.
 */
export const STATUS_KEYS: JobStatusKey[] = [
  "saved",
  "applied",
  "recruiter_screen",
  "interview",
  "moved_to_next_round",
  "waiting_for_offer",
  "offer",
  "rejected",
];

export const STATUS_CONFIG: Record<JobStatusKey, StatusConfig> = {
  saved: {
    key: "saved",
    label: "Saved",
    tone: "gray",
    semantic: "Saved for later — not yet submitted.",
    stage: 0,
  },
  applied: {
    key: "applied",
    label: "Applied",
    tone: "blue",
    semantic: "Application submitted.",
    stage: 1,
  },
  recruiter_screen: {
    key: "recruiter_screen",
    label: "Recruiter Screening",
    tone: "purple",
    semantic: "Talking with a recruiter.",
    stage: 2,
  },
  interview: {
    key: "interview",
    label: "Interview Scheduled",
    tone: "blue",
    semantic: "Interviewing with the team.",
    stage: 3,
  },
  moved_to_next_round: {
    key: "moved_to_next_round",
    label: "Moved to Next Round",
    tone: "orange",
    semantic: "Progressed to the next interview stage.",
    stage: 4,
  },
  waiting_for_offer: {
    key: "waiting_for_offer",
    label: "Awaiting for Response",
    tone: "amber",
    semantic: "Interviews done — awaiting a decision.",
    stage: 5,
  },
  offer: {
    key: "offer",
    label: "Offer Received",
    tone: "green",
    semantic: "Offer received.",
    stage: 6,
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    tone: "red",
    semantic: "This application ended.",
    stage: 7,
  },
  withdrawn: {
    key: "withdrawn",
    label: "Withdrawn",
    tone: "gray",
    semantic: "Pulled by you.",
    stage: 7,
  },
};

/**
 * Maps legacy or display-style stored values onto the canonical keys so old
 * data keeps rendering and filtering correctly. Never deletes or guesses.
 */
const STATUS_ALIASES: Record<string, JobStatusKey> = {
  saved: "saved",
  applied: "applied",
  recruiter_screen: "recruiter_screen",
  recruiter_screening: "recruiter_screen",
  interview: "interview",
  interview_scheduled: "interview",
  moved_to_next_round: "moved_to_next_round",
  waiting_for_offer: "waiting_for_offer",
  awaiting_for_response: "waiting_for_offer",
  awaiting_response: "waiting_for_offer",
  offer: "offer",
  offer_received: "offer",
  offer_accepted: "offer",
  offer_declined: "offer",
  rejected: "rejected",
  withdrawn: "withdrawn",
};

/** Canonical key for a stored value, or undefined when it is unrecognized. */
export function normalizeStatus(value?: string | null): JobStatusKey | undefined {
  if (!value) return undefined;
  const compact = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!compact) return undefined;
  return STATUS_ALIASES[compact] ?? (compact in STATUS_CONFIG ? (compact as JobStatusKey) : undefined);
}

/** Config for a stored value, or undefined when unrecognized (no silent fallback). */
export function statusConfigFor(
  value?: string | null
): StatusConfig | undefined {
  const key = normalizeStatus(value);
  return key ? STATUS_CONFIG[key] : undefined;
}

export function statusByKey(key?: string | null): StatusConfig {
  return statusConfigFor(key) ?? STATUS_CONFIG.applied;
}

export const STATUS_ORDER = STATUS_KEYS.map((k) => STATUS_CONFIG[k]);

/** Human-readable timeline title for a status transition, keyed by the NEW status. */
export function statusTransitionLabel(
  newStatus?: string | null
): string {
  switch (normalizeStatus(newStatus)) {
    case "saved":
      return "Application saved";
    case "applied":
      return "Application submitted";
    case "recruiter_screen":
      return "Recruiter screening started";
    case "interview":
      return "Interview scheduled";
    case "moved_to_next_round":
      return "Moved to next round";
    case "waiting_for_offer":
      return "Awaiting for response";
    case "offer":
      return "Offer received";
    case "rejected":
      return "Application rejected";
    case "withdrawn":
      return "Application withdrawn";
    default:
      return "Status changed";
  }
}

/** Statuses that represent a live / actionable pipeline. */
export const ACTIVE_STATUSES: JobStatusKey[] = [
  "applied",
  "recruiter_screen",
  "interview",
  "moved_to_next_round",
  "waiting_for_offer",
];

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "freelance";

export const EMPLOYMENT_TYPES: { value: EmploymentType | string; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance / Gig" },
];

export const employmentTypeLabel = (v?: string | null) =>
  (v && EMPLOYMENT_TYPES.find((e) => e.value === v)?.label) || (v || "");
