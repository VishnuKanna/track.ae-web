import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface UIStateValue {
  addOpen: boolean;
  openAdd: () => void;
  closeAdd: () => void;
  notifsOpen: boolean;
  openNotifs: () => void;
  closeNotifs: () => void;
}

const UIStateContext = createContext<UIStateValue | null>(null);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const value = useMemo<UIStateValue>(
    () => ({
      addOpen,
      openAdd: () => setAddOpen(true),
      closeAdd: () => setAddOpen(false),
      notifsOpen,
      openNotifs: () => setNotifsOpen(true),
      closeNotifs: () => setNotifsOpen(false),
    }),
    [addOpen, notifsOpen]
  );

  return (
    <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>
  );
}

export function useUIState(): UIStateValue {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error("useUIState must be used within UIStateProvider");
  return ctx;
}

export function useBooleanState(
  initial = false
): [boolean, () => void, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(initial);
  const on = useCallback(() => setValue(true), []);
  const off = useCallback(() => setValue(false), []);
  return [value, on, off, setValue];
}