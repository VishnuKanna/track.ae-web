import { STATUS_CONFIG } from "@/config/status";
import type { JobStatusKey, StatusTone } from "@/config/status";
import { cn } from "@/lib/cn";

const toneClass: Record<StatusTone, string> = {
  neutral: "",
  gray: "",
  blue: "is-blue",
  purple: "is-purple",
  orange: "is-active",
  green: "is-green",
  red: "is-red",
};

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  dot?: boolean;
}

export function statusToneClass(status: string | null | undefined): string {
  const key = (status ?? "") as JobStatusKey;
  const cfg = STATUS_CONFIG[key];
  if (!cfg) return "";
  return toneClass[cfg.tone];
}

export function StatusBadge({ status, className, dot = true }: StatusBadgeProps) {
  const key = (status ?? "") as JobStatusKey;
  const cfg = STATUS_CONFIG[key];
  if (!cfg) {
    return <span className={cn("status-badge", className)}>{status}</span>;
  }
  return (
    <span className={cn("status-badge", toneClass[cfg.tone], className)}>
      {dot && <span className="status-dot" aria-hidden />}
      {cfg.label}
    </span>
  );
}