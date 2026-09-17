import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarClock, Zap } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { AppNotification } from "@/hooks/useNotifications";

export function useNotificationCount(): number {
  const notifs = useNotifications();
  return notifs.filter((n) => n.type === "follow_up" || n.type === "interview").length;
}

export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const openJob = (n: AppNotification) => {
    navigate(`/applications/${n.jobId}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="notif-panel"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="notif-head">
            <span className="section-label">Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <Bell size={18} className="faint" />
              <p className="muted">You're all caught up.</p>
            </div>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button className="notif-item" onClick={() => openJob(n)}>
                    <span
                      className="notif-icon"
                      style={
                        n.tone === "blue"
                          ? { background: "var(--sem-info-bg)", color: "var(--sem-info)" }
                          : n.tone === "amber"
                          ? { background: "var(--sem-warn-bg)", color: "var(--sem-warn)" }
                          : undefined
                      }
                    >
                      {n.type === "interview" ? (
                        <Zap size={16} />
                      ) : (
                        <CalendarClock size={16} />
                      )}
                    </span>
                    <span className="notif-body">
                      <span className="notif-text">{n.title}</span>
                      <span className="notif-sub muted">{n.subtitle}</span>
                      <span className="notif-time">{n.timeLabel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}