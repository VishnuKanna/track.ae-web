import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open?: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open = true,
  title,
  description,
  confirmLabel = "Delete",
  tone = "danger",
  busy = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} hideClose size="sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <h3 className="confirm-title">{title}</h3>
          {description && <p className="confirm-desc muted">{description}</p>}
          {children}
          <div className="confirm-actions">
            <Button variant="secondary" size="block" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              size="block"
              onClick={onConfirm}
              loading={busy}
              loadingLabel={tone === "danger" ? "Deleting..." : "Saving..."}
            >
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}