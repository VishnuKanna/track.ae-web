export type JobStatusKey =
  | "saved"
  | "applied"
  | "recruiter_screen"
  | "interview"
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
  | "green"
  | "red";

export interface StatusConfig {
  key: JobStatusKey;
  label: string;
  tone: StatusTone;
  semantic: string;
  stage: number;
}

export const STATUS_KEYS: JobStatusKey[] = [
  "saved",
  "applied",
  "recruiter_screen",
  "interview",
  "waiting_for_offer",
  "offer",
  "rejected",
  "withdrawn",
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
    label: "Recruiter Screen",
    tone: "orange",
    semantic: "Talking with a recruiter.",
    stage: 2,
  },
  interview: {
    key: "interview",
    label: "Interview",
    tone: "purple",
    semantic: "Interviewing with the team.",
    stage: 3,
  },
  waiting_for_offer: {
    key: "waiting_for_offer",
    label: "Waiting for Offer",
    tone: "orange",
    semantic: "Interviews done — awaiting a decision.",
    stage: 4,
  },
  offer: {
    key: "offer",
    label: "Offer",
    tone: "green",
    semantic: "Offer received.",
    stage: 5,
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    tone: "red",
    semantic: "This application ended.",
    stage: 6,
  },
  withdrawn: {
    key: "withdrawn",
    label: "Withdrawn",
    tone: "gray",
    semantic: "Pulled by you.",
    stage: 6,
  },
};

export function statusByKey(key?: string | null): StatusConfig {
  if (key && key in STATUS_CONFIG) return STATUS_CONFIG[key as JobStatusKey];
  return STATUS_CONFIG.applied;
}

export const STATUS_ORDER = STATUS_KEYS.map((k) => STATUS_CONFIG[k]);

/** Statuses that represent a live / actionable pipeline. */
export const ACTIVE_STATUSES: JobStatusKey[] = [
  "applied",
  "recruiter_screen",
  "interview",
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