import { STATUS_CONFIG, statusConfigFor, normalizeStatus } from "@/config/status";
import type { StatusTone } from "@/config/status";
import { cn } from "@/lib/cn";

const toneClass: Record<StatusTone, string> = {
  neutral: "",
  gray: "",
  blue: "is-blue",
  purple: "is-purple",
  orange: "is-active",
  amber: "is-amber",
  green: "is-green",
  red: "is-red",
};

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  dot?: boolean;
}

export function statusToneClass(status: string | null | undefined): string {
  const cfg = statusConfigFor(status);
  if (!cfg) return "";
  return toneClass[cfg.tone];
}

export function StatusBadge({ status, className, dot = true }: StatusBadgeProps) {
  const cfg = statusConfigFor(status);
  if (!cfg) {
    return <span className={cn("status-badge", className)}>{status}</span>;
  }
  const key = normalizeStatus(status) ?? cfg.key;
  return (
    <span className={cn("status-badge", toneClass[STATUS_CONFIG[key].tone], className)}>
      {dot && <span className="status-dot" aria-hidden />}
      {cfg.label}
    </span>
  );
}
