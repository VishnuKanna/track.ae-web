import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "orange" | "green" | "red" | "blue" | "amber";

const toneClass: Record<Tone, string> = {
  default: "",
  orange: "badge-orange",
  green: "badge-green",
  red: "badge-red",
  blue: "badge-blue",
  amber: "badge-amber",
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, tone = "default", dot, className }: BadgeProps) {
  return (
    <span className={cn("badge", toneClass[tone], className)}>
      {dot && <span className="badge-dot" aria-hidden />}
      {children}
    </span>
  );
}