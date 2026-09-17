export function todayISO(): string {
  return toDateInput(new Date());
}

export const safeUrl = (v?: string | null): string | null => {
  if (!v) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
};

export const s3Https = safeUrl;

/** Date -> YYYY-MM-DD local */
export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** parse YYYY-MM-DD as local date */
export function parseISO(input: string | null | undefined): Date | null {
  if (!input) return null;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDaysISO(input: string, days: number): string {
  const d = parseISO(input) ?? new Date();
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

export function diffDays(from: string, toISO: string): number {
  const a = startOfDay(parseISO(from) ?? new Date());
  const b = startOfDay(parseISO(toISO) ?? new Date());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function daysUntil(iso: string): number {
  return diffDays(todayISO(), iso);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!d) return "—";
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sd = startOfDay(d);
  if (sd.getTime() === today.getTime()) return "Today";
  if (sd.getTime() === tomorrow.getTime()) return "Tomorrow";

  const mon = d.toLocaleDateString("en-US", { month: "short" });
  if (sd.getFullYear() === today.getFullYear()) {
    return `${mon} ${d.getDate()}`;
  }
  return `${mon} ${d.getDate()}, ${sd.getFullYear()}`;
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type FollowUpState =
  | "none"
  | "overdue"
  | "today"
  | "tomorrow"
  | "upcoming"
  | "future";

export interface FollowUpStatus {
  state: FollowUpState;
  label: string;
}

export function followUpStatus(
  next: string | null | undefined
): FollowUpStatus {
  if (!next) return { state: "none", label: "No follow-up needed" };
  const days = daysUntil(next);
  if (days < 0) return { state: "overdue", label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}` };
  if (days === 0) return { state: "today", label: "Today" };
  if (days === 1) return { state: "tomorrow", label: "Tomorrow" };
  if (days <= 7) return { state: "upcoming", label: `In ${days} days` };
  return { state: "future", label: `In ${days} days` };
}

/** "Sep" + year key for monthly analytics */
export function monthKey(iso: string | null | undefined): string {
  const d = parseISO(iso) ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function isCurrentMonth(iso: string | null | undefined): boolean {
  return monthKey(iso) === monthKey(todayISO());
}

export function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return daysUntil(iso) < 0;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.floor((now - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}