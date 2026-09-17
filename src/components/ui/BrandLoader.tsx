import { motion } from "motion/react";

export function BrandLoader({ label = "Loading your command center" }: { label?: string }) {
  return (
    <motion.div
      className="brand-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-label={label}
    >
      <span className="brand-loader-logo">
        TRACK.AE
        <span className="brand-loader-dot" />
      </span>
      <span className="brand-loader-bar" />
    </motion.div>
  );
}