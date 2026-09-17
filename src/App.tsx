import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/store/AuthContext";
import { ToastProvider } from "@/store/ToastContext";
import { UIStateProvider } from "@/store/UIStateContext";
import { DataProvider } from "@/store/DataContext";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { WorkspaceError } from "@/components/ui/WorkspaceError";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/pages/RequireAuth";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { SignUp } from "@/pages/SignUp";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { ResetPassword } from "@/pages/ResetPassword";
import { AuthCallback } from "@/pages/AuthCallback";
import { Dashboard } from "@/pages/Dashboard";
import { Applications } from "@/pages/Applications";
import { ApplicationDetail } from "@/pages/ApplicationDetail";
import { Companies } from "@/pages/Companies";
import { Company } from "@/pages/Company";
import { Analytics } from "@/pages/Analytics";
import { Settings } from "@/pages/Settings";
import { NotFound } from "@/pages/NotFound";

function PrivateLayout() {
  const { user, profile, profileError, refreshProfile } = useAuth();
  if (!user || !profile) {
    if (profileError) {
      return (
        <div className="workspace-error-wrap">
          <WorkspaceError
            message={profileError}
            onRetry={() => void refreshProfile()}
          />
        </div>
      );
    }
    return <BrandLoader />;
  }
  return (
    <DataProvider userId={user.id} profile={profile}>
      <AppShell />
    </DataProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <UIStateProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route element={<RequireAuth />}>
                <Route element={<PrivateLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/applications/:id" element={<ApplicationDetail />} />
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/companies/:id" element={<Company />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UIStateProvider>
      </ToastProvider>
    </AuthProvider>
  );
}