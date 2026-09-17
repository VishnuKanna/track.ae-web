import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
  index?: number;
  className?: string;
}

export function MetricCard({
  label,
  value,
  sub,
  icon,
  accent,
  index = 0,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      className={cn("metric-card", className)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
    >
      <div className="metric-top">
        <span className="metric-label">
          {label}
        </span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value" style={{ color: accent ? "var(--orange)" : undefined }}>
        {value}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
    </motion.div>
  );
}