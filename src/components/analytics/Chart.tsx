import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/cn";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function BarList({
  data,
  max,
  activeIndex,
}: {
  data: BarDatum[];
  max?: number;
  activeIndex?: number;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-list" role="img">
      {data.map((d, i) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <motion.div
              className={cn("bar-fill", d.color === "orange" && "series-orange", activeIndex === i && "series-orange")}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: d.value / top }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
              style={{ background: d.color === "orange" ? "var(--orange)" : undefined }}
            />
          </div>
          <span className="bar-val">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface MonthDatum {
  key: string;
  label: string;
  value: number;
}

export function MonthlyBars({ data }: { data: MonthDatum[] }) {
  const top = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="monthly-chart" role="img" aria-label="Monthly applications">
      <div className="monthly-bars">
        {data.map((d, i) => (
          <div className="month-col" key={d.key}>
            <motion.div
              className="month-bar"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: d.value / top }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
              style={{ transformOrigin: "bottom" }}
            >
              {d.value > 0 && (
                <span className="month-bar-label">{d.value}</span>
              )}
            </motion.div>
            <span className="month-bar-x">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Donut({
  percent,
  label,
  color = "var(--black)",
}: {
  percent: number;
  label: string;
  color?: string;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, percent)) * c;
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { once: true, margin: "-40px" });

  return (
    <div className="donut" ref={root}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={inView ? { strokeDashoffset: c - filled } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="donut-center">
        <strong>{Math.round(percent * 100)}%</strong>
      </div>
      <div className="donut-label faint">{label}</div>
    </div>
  );
}