import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
const MENU_WIDTH_SM = 244;
const MENU_MARGIN = 8;

/**
 * Exactly one status menu may be open at a time, across every card and table
 * row. Each open instance registers a close callback here; whenever a menu
 * opens it closes every other one first. State stays local per StatusMenu, so
 * one application's dropdown can never update a different application.
 */
const closeRegistry = new Map<string, () => void>();
let menuSeq = 0;

type AnchorRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

interface StyleOpts {
  anchor: AnchorRect;
  align: "left" | "right";
  width: number | undefined;
  menuHeight: number;
}

/**
 * Builds a fully-specified `position: fixed` style for the menu. Both axes are
 * always pinned explicitly (one property set, its counterpart set to "auto") so
 * the stale `.status-menu-list { top/left }` rules can never stretch the menu
 * across the viewport or push part of it off-screen.
 */
function menuStyle({ anchor, align, width, menuHeight }: StyleOpts): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuWidth = width ?? Math.min(240, vw - MENU_MARGIN * 2);
  const targetH = Math.min(menuHeight, MENU_MAX_HEIGHT);

  // Vertical: open downward unless there is clearly more room above.
  const spaceBelow = vh - anchor.bottom - MENU_MARGIN;
  const spaceAbove = anchor.top - MENU_MARGIN;
  const openUp = spaceBelow < targetH && spaceAbove > spaceBelow;

  const available = openUp ? spaceAbove : spaceBelow;
  const desiredH = Math.min(targetH, vh - MENU_MARGIN * 2);
  const maxHeight = Math.min(Math.max(available, 0), desiredH);

  const style: CSSProperties = {
    position: "fixed",
    zIndex: 140,
    maxHeight,
    overflowY: "auto",
    overscrollBehavior: "contain",
  };
  if (width) style.width = width;

  if (openUp) {
    style.top = "auto";
    style.bottom = Math.max(MENU_MARGIN, vh - anchor.top + MENU_MARGIN);
  } else {
    style.bottom = "auto";
    style.top = anchor.bottom + MENU_MARGIN;
  }

  if (align === "right") {
    style.left = "auto";
    style.right = Math.max(MENU_MARGIN, vw - anchor.right);
    // Keep the left edge inside the viewport.
    if (vw - (style.right as number) - menuWidth < MENU_MARGIN) {
      style.right = Math.max(MENU_MARGIN, vw - menuWidth - MENU_MARGIN);
    }
  } else {
    style.right = "auto";
    style.left = Math.max(
      MENU_MARGIN,
      Math.min(anchor.left, vw - menuWidth - MENU_MARGIN)
    );
  }

  return style;
}

/**
 * Rectangle the menu hugs. On narrow screens we anchor to the whole application
 * card so the menu opens below the header/card and never hides the company
 * name, logo, location, or job title. Desktop anchors to the status pill.
 */
function anchorRectFor(target: HTMLElement | null): AnchorRect | null {
  if (!target) return null;
  if (window.innerWidth < 768) {
    const card = target.closest<HTMLElement>(".app-card-new");
    if (card) {
      const r = card.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left };
    }
  }
  const r = target.getBoundingClientRect();
  return { top: r.top, right: r.right, bottom: r.bottom, left: r.left };
}

/**
 * Status dropdown rendered through a portal to document.body with fixed
 * positioning so it can never be clipped by a card/table/scroll container.
 * It stays glued to its own trigger while the page scrolls, flips above only
 * when there is more room, and always lands fully inside the viewport.
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
  const [pos, setPos] = useState<CSSProperties>({ visibility: "hidden" });
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = `status-menu-${++menuSeq}`;
  const id = idRef.current;

  const key = (normalizeStatus(value) ?? "applied") as JobStatusKey;
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.applied;

  const positionMenu = useCallback(() => {
    const anchor = anchorRectFor(triggerRef.current);
    const ul = listRef.current;
    if (!anchor || !ul) return;
    setPos({
      ...menuStyle({
        anchor,
        align,
        width: size === "sm" ? MENU_WIDTH_SM : undefined,
        menuHeight: ul.offsetHeight,
      }),
      visibility: "visible",
    });
  }, [align, size]);

  useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) {
      closeRegistry.delete(id);
      return;
    }

    // Prioritize the newly opened menu: close any other status dropdown.
    closeRegistry.forEach((close, other) => {
      if (other !== id) close();
    });
    closeRegistry.set(id, () => setOpen(false));

    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const inside =
        triggerRef.current?.contains(t) || listRef.current?.contains(t);
      if (!inside) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    // Reposition on scroll/resize (rAF-throttled) so the menu can never
    // detach from the card/row that opened it.
    let raf = 0;
    const onScrollOrResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        positionMenu();
      });
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      closeRegistry.delete(id);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [open, id, positionMenu]);

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
              className={cn(
                "status-menu-list mm-menu-fixed",
                size === "sm" && "status-menu-list-sm"
              )}
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
                      <Check
                        size={size === "sm" ? 14 : 16}
                        className="status-menu-check"
                        aria-hidden
                      />
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