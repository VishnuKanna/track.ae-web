import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, MailCheck } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

interface AuthShellProps {
  children: ReactNode;
  backLabel?: string;
  backTo?: string;
}

/** Shared frame for login / signup / password pages — preserves the
 *  Track.AE landing aesthetic across every auth screen. */
export function AuthShell({ children, backLabel = "Back to home", backTo = "/" }: AuthShellProps) {
  return (
    <div className="auth-page">
      <div className="auth-grid" aria-hidden />
      <div className="auth-glow" aria-hidden />
      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <Link to="/" className="auth-brand">
            TRACK.AE<span className="brand-dot" />
          </Link>
          {children}
          <Link to={backTo} className="auth-back">
            <ArrowLeft size={14} /> {backLabel}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export function AuthErrorBox({ children }: { children: ReactNode }) {
  return (
    <motion.p
      className="auth-error"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
    >
      <AlertTriangle size={15} className="auth-error-icon" aria-hidden />
      <span>{children}</span>
    </motion.p>
  );
}

export function AuthSuccessBox({
  children,
  icon = "check",
}: {
  children: ReactNode;
  icon?: "check" | "mail";
}) {
  const Icon = icon === "mail" ? MailCheck : CheckCircle2;
  return (
    <motion.div
      className="auth-success"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
    >
      <Icon size={17} className="auth-success-icon" aria-hidden />
      <div>{children}</div>
    </motion.div>
  );
}

export function AuthConfigWarning() {
  return (
    <div className="auth-setup-warn">
      <AlertTriangle size={18} />
      <p>
        Track.AE isn't connected to Supabase yet. Copy <code>.env.example</code> to{" "}
        <code>.env.local</code> and add your Supabase URL and anon key, then restart.
      </p>
    </div>
  );
}
