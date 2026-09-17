import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  required,
}: FieldProps) {
  return (
    <div className={cn("field", className)}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="label-req" aria-hidden> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <motion.p
          className="error-msg"
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          {error}
        </motion.p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  );
}