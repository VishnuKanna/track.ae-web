import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { STATUS_ORDER, STATUS_CONFIG, normalizeStatus } from "@/config/status";
import type { JobStatusKey } from "@/config/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";

interface StatusMenuProps {
  value: string | null | undefined;
  onChange: (key: JobStatusKey) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  align?: "left" | "right";
}

const MENU_MAX_HEIGHT = 360;

/**
 * Status dropdown rendered through a portal to document.body with fixed
 * positioning so it can never be clipped by a card/table/scroll container
 * (e.g. a single-row table). It flips above the trigger when there is not
 * enough room below and scrolls internally when the viewport is short.
 */
export function StatusMenu({
  value,
  onChange,
  size = "md",
  disabled,
  align = "left",
}: StatusMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<CSSProperties>({});
  const key = (normalizeStatus(value) ?? "applied") as JobStatusKey;
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.applied;

  useLayoutEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const openUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;

    const style: CSSProperties = {
      position: "fixed",
      zIndex: 140,
      maxHeight: Math.max(
        160,
        Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow)
      ),
      overflowY: "auto",
    };
    if (align === "right") {
      style.right = Math.max(8, window.innerWidth - r.right);
    } else {
      style.left = Math.max(8, Math.min(r.left, window.innerWidth - 248));
    }
    if (openUp) style.bottom = Math.max(8, window.innerHeight - r.top + 8);
    else style.top = r.bottom + 8;
    setPos(style);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const inside =
        triggerRef.current?.contains(t) || listRef.current?.contains(t);
      if (!inside) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, align]);

  return (
    <div className="status-menu" ref={triggerRef}>
      <button
        type="button"
        className={cn("status-trigger", size === "sm" && "status-trigger-sm")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Change status (currently ${cfg.label})`}
      >
        <StatusBadge status={key} />
        <ChevronDown size={14} className="status-caret" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={listRef}
              className="status-menu-list mm-menu-fixed"
              role="listbox"
              style={pos}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {STATUS_ORDER.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={s.key === key}
                    className={cn("status-menu-item", s.key === key && "is-selected")}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(s.key);
                      setOpen(false);
                    }}
                  >
                    <StatusBadge status={s.key} />
                    <span className="status-menu-semantic faint">{s.semantic}</span>
                    {s.key === key && (
                      <Check size={16} className="status-menu-check" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}