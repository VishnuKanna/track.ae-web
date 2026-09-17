import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useAuth } from "@/store/AuthContext";
import { AlertTriangle } from "lucide-react";

export function RequireAuth() {
  const { user, loading, configMissing } = useAuth();
  const location = useLocation();

  if (loading) return <BrandLoader />;

  if (configMissing) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 420, width: "100%" }}>
          <div className="auth-setup-warn" style={{ border: "none", padding: 0 }}>
            <AlertTriangle size={18} />
            <p>
              Track.AE isn't connected to Supabase yet. Copy <code>.env.example</code> to{" "}
              <code>.env.local</code>, add your Supabase URL and anon key, and restart
              the dev server.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}