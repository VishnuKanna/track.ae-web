import { motion } from "motion/react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface WorkspaceErrorProps {
  title?: string;
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function WorkspaceError({
  title = "Unable to load your workspace",
  message,
  onRetry,
  retrying = false,
}: WorkspaceErrorProps) {
  return (
    <motion.div
      className="workspace-error"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      role="alert"
    >
      <div className="workspace-error-icon">
        <AlertTriangle size={20} />
      </div>
      <h3 className="workspace-error-title">{title}</h3>
      <p className="workspace-error-message">{message}</p>
      <Button
        variant="primary"
        size="sm"
        onClick={onRetry}
        loading={retrying}
        loadingLabel="Retrying..."
      >
        <RefreshCw size={14} /> Retry
      </Button>
    </motion.div>
  );
}