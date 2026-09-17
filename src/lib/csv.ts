import type { HRContact, Job } from "@/types/database";
import { statusByKey } from "@/config/status";
import { priorityLabel, isHighPriority } from "@/config/priority";

const QUOTE = /"/g;

function esc(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(QUOTE, '""')}"`;
  }
  return s;
}

/** Serializes HR contacts into a single cell:  John | Recruiter | email | phone  ||  Sarah | ... */
export function serializeHRContacts(contacts: HRContact[]): string {
  return contacts
    .map(
      (c) =>
        [c.name, c.designation, c.email, c.phone, c.linkedin_url, c.notes]
          .map((x) => (x ?? "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" | ")
    )
    .filter(Boolean)
    .join(" || ");
}

export const CSV_HEADERS = [
  "Company",
  "Job Title",
  "Status",
  "Location",
  "Address",
  "Job URL",
  "Job ID",
  "Application Date",
  "Next Follow Up",
  "Last Contact",
  "Source",
  "Salary Min",
  "Salary Max",
  "Currency",
  "Employment Type",
  "Referral Name",
  "Referral Contact",
  "Resume Version",
  "Cover Letter Version",
  "Recruiter Notes",
  "HR Contacts",
  "Priority",
];

export type ExportRow = {
  company_name: string;
  job_title: string;
  status: string;
  location: string | null;
  address: string | null;
  job_url: string | null;
  job_id: string | null;
  application_date: string | null;
  next_follow_up_date: string | null;
  last_contact_date: string | null;
  source: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  employment_type: string | null;
  referral_name: string | null;
  referral_contact: string | null;
  resume_version: string | null;
  cover_letter_version: string | null;
  recruiter_notes: string | null;
  hrContactsSerialized: string;
  priority: string;
};

export function jobsToRows(
  jobs: Job[],
  contactsByJob: Record<string, HRContact[]>
): ExportRow[] {
  return jobs.map((j) => ({
    company_name: j.company_name,
    job_title: j.job_title,
    status: statusByKey(j.status).label,
    location: j.location,
    address: j.address,
    job_url: j.job_url,
    job_id: j.job_id,
    application_date: j.application_date,
    next_follow_up_date: j.next_follow_up_date,
    last_contact_date: j.last_contact_date,
    source: j.source,
    salary_min: j.salary_min,
    salary_max: j.salary_max,
    salary_currency: j.salary_currency,
    employment_type: j.employment_type,
    referral_name: j.referral_name,
    referral_contact: j.referral_contact,
    resume_version: j.resume_version,
    cover_letter_version: j.cover_letter_version,
    recruiter_notes: j.recruiter_notes,
    hrContactsSerialized: serializeHRContacts(
      (contactsByJob[j.id] || []).slice().reverse()
    ),
    priority: priorityLabel(j.priority),
  }));
}

export function buildCSV(rows: ExportRow[]): string {
  const head = CSV_HEADERS.map(esc).join(",");
  const body = rows.map((r) =>
    [
      r.company_name,
      r.job_title,
      r.status,
      r.location,
      r.address,
      r.job_url,
      r.job_id,
      r.application_date,
      r.next_follow_up_date,
      r.last_contact_date,
      r.source,
      r.salary_min,
      r.salary_max,
      r.salary_currency,
      r.employment_type,
      r.referral_name,
      r.referral_contact,
      r.resume_version,
      r.cover_letter_version,
      r.recruiter_notes,
      r.hrContactsSerialized,
      r.priority,
    ]
      .map(esc)
      .join(",")
  );
  return `${head}\n${body.join("\n")}\n`;
}

function detectBOM(text: string): string {
  return `\uFEFF${text}`;
}

export function downloadCSV(csv: string, filename = "track-ae-applications.csv") {
  const blob = new Blob([detectBOM(csv)], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function downloadJSON(data: unknown, filename = "track-ae-export.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}