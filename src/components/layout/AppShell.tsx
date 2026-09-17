import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ApplicationForm } from "@/components/applications/ApplicationForm";
import { WorkspaceError } from "@/components/ui/WorkspaceError";
import { useUIState } from "@/store/UIStateContext";
import { useData } from "@/store/DataContext";

export function AppShell() {
  const { addOpen, closeAdd } = useUIState();
  const { dataError, refresh } = useData();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="desk">
      <Sidebar />
      <div className="desk-main">
        <TopBar />
        <main className="page-shell">
          {dataError ? (
            <div className="workspace-error-wrap">
              <WorkspaceError
                message={dataError}
                onRetry={() => void retry()}
                retrying={retrying}
              />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <BottomNav />

      <ApplicationForm open={addOpen} onClose={closeAdd} />
    </div>
  );
}