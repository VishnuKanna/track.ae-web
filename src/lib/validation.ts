export interface ValidationErrors {
  [field: string]: string;
}

export const isBlank = (v?: string | null) => !v || v.trim().length === 0;

export function isValidUrl(v?: string | null): boolean {
  if (!v || v.trim() === "") return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidEmail(v?: string | null): boolean {
  if (!v || v.trim() === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export const MIN_PASSWORD_LENGTH = 8;

/** Email/password auth validators. Return an error string or null. */
export function validateAuthEmail(v: string): string | null {
  if (isBlank(v)) return "Email is required.";
  if (!isValidEmail(v)) return "Enter a valid email address.";
  return null;
}

export function validateAuthPassword(v: string): string | null {
  if (!v) return "Password is required.";
  if (v.length < MIN_PASSWORD_LENGTH) {
    return "Use a stronger password.";
  }
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function isValidSalary(v?: string | null): boolean {
  if (!v || v.trim() === "") return true;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

export const MAX_HR_CONTACTS = 10;

export const MAX_RESUME_MB = 10;
export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const ALLOWED_RESUME_EXT = /\.(pdf|doc|docx)$/i;

export function validateResumeFile(file: File): string | null {
  if (!ALLOWED_RESUME_TYPES.includes(file.type) && !ALLOWED_RESUME_EXT.test(file.name)) {
    return "Only PDF, DOC, and DOCX files are allowed.";
  }
  if (file.size > MAX_RESUME_MB * 1024 * 1024) {
    return `File is larger than ${MAX_RESUME_MB}MB.`;
  }
  if (file.size === 0) {
    return "The file appears to be empty.";
  }
  return null;
}

export interface JobFormValues {
  company_name: string;
  job_title: string;
  job_url: string;
  job_id: string;
  location: string;
  address: string;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  employment_type: string;
  source: string;
  application_date: string;
  status: string;
  priority: string;
  next_follow_up_date: string;
  last_contact_date: string;
  referral_name: string;
  referral_contact: string;
  resume_version: string;
  cover_letter_version: string;
  job_description: string;
  recruiter_notes: string;
}

export function validateJobForm(v: JobFormValues): ValidationErrors {
  const errors: ValidationErrors = {};
  if (isBlank(v.company_name)) errors.company_name = "Company is required.";
  if (isBlank(v.job_title)) errors.job_title = "Job title is required.";
  if (!isValidUrl(v.job_url)) errors.job_url = "Enter a valid http(s) URL.";
  if (!isValidSalary(v.salary_min)) errors.salary_min = "Enter a valid amount.";
  if (!isValidSalary(v.salary_max)) errors.salary_max = "Enter a valid amount.";
  if (v.salary_min && v.salary_max && Number(v.salary_min) > Number(v.salary_max)) {
    errors.salary_max = "Max must be >= min.";
  }
  return errors;
}

export interface HRContactFormValues {
  name: string;
  designation: string;
  email: string;
  phone: string;
  linkedin_url: string;
  notes: string;
}

export function validateHRContact(v: Partial<HRContactFormValues>): ValidationErrors {
  const errors: ValidationErrors = {};
  if (isBlank(v.name)) errors.name = "Name is required.";
  if (!isValidEmail(v.email)) errors.email = "Enter a valid email address.";
  if (!isValidUrl(v.linkedin_url)) errors.linkedin_url = "Enter a valid http(s) URL.";
  return errors;
}

export function safeErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (
      !msg ||
      /supabase|postgrest|postgres|sql|syntax|relation|violates|fetch failed|networkrequest/i.test(
        msg
      )
    ) {
      return fallback;
    }
    return msg;
  }
  return fallback;
}

/**
 * Formats a Supabase / PostgREST error as "CODE: message" so the real
 * database failure (e.g. PGRST205) is never hidden from the user.
 */
export function formatSupabaseError(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const code = typeof e.code === "string" ? e.code : null;
    const message =
      typeof e.message === "string" && e.message.trim() ? e.message.trim() : null;
    if (code || message) {
      const msg = message ?? fallback;
      return code ? `${code}: ${msg}` : msg;
    }
  }
  return safeErrorMessage(err, fallback);
}

/**
 * Logs the real Supabase/PostgREST error shape during development without
 * leaking credentials. Only the diagnostic fields are printed (no auth tokens).
 */
export function logSupabaseError(context: string, error: unknown): void {
  if (!error || typeof error !== "object") {
    console.error(`[Track.AE] ${context}`, error);
    return;
  }
  const e = error as Record<string, unknown>;
  console.error(`[Track.AE] ${context}`, {
    code: e.code,
    message: e.message,
    details: e.details,
    hint: e.hint,
  });
}

/**
 * True when PostgREST rejects a write because a column does not exist in the
 * live schema cache (typically a migration that has not been applied yet).
 */
export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message : "";
  return (
    code === "PGRST204" ||
    /could not find the .*column|column .* does not exist|schema cache/i.test(
      message
    )
  );
}

/** Rejects if a promise does not settle within `ms`, so a hung request can
 *  never leave the UI stuck on an infinite spinner. */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = 30000,
  label = "request"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s.`)),
        ms
      )
    ),
  ]);
}